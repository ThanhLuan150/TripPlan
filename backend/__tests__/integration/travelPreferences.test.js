// HTTP-level tests of AI travel preferences: authorization, CRUD, validation, ownership, and their use by the AI.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/contentRepository.js", () => ({ default: { listPublishedShowcase: vi.fn(), listPublishedVideos: vi.fn() } }));
vi.mock("../../src/repositories/destinationSearchRepository.js", () => ({ default: { create: vi.fn(), trim: vi.fn() } }));
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({ default: { findOverlapping: vi.fn() } }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: contentRepository } = await import("../../src/repositories/contentRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { startChat, getResponseText } = await import("../../src/utils/gemini.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const auth = `Bearer ${generateAccessToken({ _id: USER })}`;
const url = "/user/preferences";
const sendMessage = vi.fn();
let account;

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    account = { _id: USER, username: "u", isActive: "active", role: "user", lastActiveAt: new Date(), refreshToken: generateRefreshToken({ _id: USER }) };
    userRepository.findById.mockImplementation(async () => account);
    userRepository.updateById.mockResolvedValue({});
    contentRepository.listPublishedShowcase.mockResolvedValue([]);
    contentRepository.listPublishedVideos.mockResolvedValue([]);
    tripPlanRepository.findOverlapping.mockResolvedValue([]);
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
});

describe("/user/preferences", () => {
    it("requires sign-in", async () => {
        for (const method of ["get", "put", "delete"]) {
            expect((await request(app)[method](url).send({ notes: "x" })).status).toBe(401);
        }
        expect(userRepository.updateById).not.toHaveBeenCalled();
    });

    it("returns an empty set when none was saved (preferences are optional)", async () => {
        const res = await request(app).get(url).set("Authorization", auth);
        expect(res.status).toBe(200);
        expect(res.body.preferences).toEqual({ categories: [], notes: "", updatedAt: null });
    });

    it("saves, reads back, updates and deletes the preferences", async () => {
        const saved = await request(app).put(url).set("Authorization", auth).send({ categories: ["food", "nature"], notes: "  quán địa phương " });
        expect(saved.status).toBe(200);
        expect(saved.body.preferences).toMatchObject({ categories: ["nature", "food"], notes: "quán địa phương" });
        // stored on the signed-in account only
        expect(userRepository.updateById).toHaveBeenCalledWith(USER, { travelPreferences: expect.objectContaining({ categories: ["nature", "food"] }) });

        account.travelPreferences = userRepository.updateById.mock.calls[0][1].travelPreferences;
        const read = await request(app).get(url).set("Authorization", auth);
        expect(read.body.preferences).toMatchObject({ categories: ["nature", "food"], notes: "quán địa phương" });

        const updated = await request(app).put(url).set("Authorization", auth).send({ categories: ["culture"] });
        expect(updated.body.preferences).toMatchObject({ categories: ["culture"], notes: "quán địa phương" });

        const removed = await request(app).delete(url).set("Authorization", auth);
        expect(removed.status).toBe(200);
        expect(userRepository.updateById).toHaveBeenLastCalledWith(USER, { $unset: { travelPreferences: 1 } });
        expect(removed.body.preferences).toEqual({ categories: [], notes: "", updatedAt: null });
    });

    it.each([
        [{}],
        [{ categories: ["beach"] }],
        [{ categories: "nature" }],
        [{ notes: "x".repeat(301) }],
        [{ notes: 5 }],
        [{ categories: [] }],
    ])("answers 400 for %j and saves nothing", async (body) => {
        const res = await request(app).put(url).set("Authorization", auth).send(body);
        expect(res.status).toBe(400);
        expect(userRepository.updateById).not.toHaveBeenCalled();
    });

    it("only ever manages the caller's own preferences, whatever the client sends", async () => {
        await request(app).put(url).set("Authorization", auth).send({ categories: ["food"], userId: OTHER, _id: OTHER });
        await request(app).delete(url).set("Authorization", auth).query({ userId: OTHER }).send({ userId: OTHER });
        for (const call of userRepository.updateById.mock.calls) {
            expect(call[0]).toBe(USER);
        }
        expect(userRepository.updateById.mock.calls[0][1]).not.toHaveProperty("userId");
    });
});

describe("AI uses the preferences", () => {
    const prefs = { categories: ["nature", "food"], notes: "tránh nơi đông người", updatedAt: new Date() };
    const recommend = (body = { query: "nghỉ dưỡng" }) => request(app).post("/destinations/recommend").set("Authorization", auth).send(body);

    it("adds them to the destination recommendation prompt", async () => {
        account.travelPreferences = prefs;
        getResponseText.mockReturnValue(JSON.stringify({ recommendations: [] }));

        expect((await recommend()).status).toBe(200);

        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("thiên nhiên");
        expect(prompt).toContain("ẩm thực");
        expect(prompt).toContain("tránh nơi đông người");
    });

    it("adds them to the itinerary generation prompt", async () => {
        account.travelPreferences = prefs;
        getResponseText.mockReturnValue("{}");

        const res = await request(app).post("/trip-plan").set("Authorization", auth).send({
            location: "Lâm Đồng", numberOfPeople: 2, budget: "5 triệu", interest: "núi", numberOfDay: 2, userLocation: "Hà Nội",
        });

        expect(res.status).toBe(200);
        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Sở thích du lịch đã lưu");
        expect(prompt).toContain("thiên nhiên");
    });

    it("works the same without preferences", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ recommendations: [] }));
        expect((await recommend()).status).toBe(200);
        expect(sendMessage.mock.calls[0][0]).not.toContain("Sở thích du lịch đã lưu");
    });

    it("still works when the preferences cannot be read", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ recommendations: [] }));
        let calls = 0;
        // the sign-in check reads the account; the AI's own read of the preferences fails
        userRepository.findById.mockImplementation(async () => {
            calls += 1;
            if (calls > 1) {
                throw new Error("db hiccup");
            }
            return account;
        });
        expect((await recommend()).status).toBe(200);
        expect(sendMessage.mock.calls[0][0]).not.toContain("Sở thích du lịch đã lưu");
    });
});
