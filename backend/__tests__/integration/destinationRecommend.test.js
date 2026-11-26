// HTTP-level tests of AI destination recommendation: authorization, valid request, invalid request, AI failures.
import request from "supertest";
import HttpError from "../../src/utils/HttpError.js";
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
vi.mock("../../src/repositories/destinationSearchRepository.js", () => ({
    default: { create: vi.fn(), trim: vi.fn(), listByUser: vi.fn(), findOwned: vi.fn(), updateOwned: vi.fn(), removeOwned: vi.fn() },
}));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: contentRepository } = await import("../../src/repositories/contentRepository.js");
const { default: destinationSearchRepository } = await import("../../src/repositories/destinationSearchRepository.js");
const { startChat, getResponseText } = await import("../../src/utils/gemini.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER = "64b000000000000000000001";
const auth = `Bearer ${generateAccessToken({ _id: USER })}`;
const url = "/destinations/recommend";
const sendMessage = vi.fn();
const suggestion = { name: "Tràng An", province: "Ninh Bình", description: "Danh thắng", reason: "Hợp với thiên nhiên" };

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockResolvedValue({ _id: USER, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: USER }) });
    contentRepository.listPublishedShowcase.mockResolvedValue([
        { _id: "s1", kind: "suggestion", title: "Tràng An", location: "Ninh Bình", imageUrl: "https://img/ta.jpg" },
        { _id: "b1", kind: "banner", title: "Banner", imageUrl: "https://img/b.jpg" },
    ]);
    contentRepository.listPublishedVideos.mockResolvedValue([{ _id: "v1", title: "Tràng An", location: "Ninh Bình", youtubeLink: "https://www.youtube.com/watch?v=FiJDDkuu5zI" }]);
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    destinationSearchRepository.create.mockResolvedValue({ _id: "64b0000000000000000000e1" });
});

describe("POST /destinations/recommend", () => {
    it("requires sign-in", async () => {
        expect((await request(app).post(url).send({ query: "x" })).status).toBe(401);
        expect(startChat).not.toHaveBeenCalled();
    });

    it("returns suggestions and links the ones the app knows", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ recommendations: [suggestion, { ...suggestion, name: "Địa điểm khác" }] }));

        const res = await request(app).post(url).set("Authorization", auth).send({ query: "Thiên nhiên", interests: ["núi"], region: "Miền Bắc", budget: "3 triệu" });

        expect(res.status).toBe(200);
        expect(res.body.recommendations).toHaveLength(2);
        expect(res.body.recommendations[0]).toMatchObject({ name: "Tràng An", inApp: true });
        expect(res.body.recommendations[0].place).toMatchObject({ id: "s1", imageUrl: "https://img/ta.jpg" });
        expect(res.body.recommendations[0].place.videos).toHaveLength(1);
        expect(res.body.recommendations[1]).toMatchObject({ inApp: false });
        expect(res.body.recommendations[1].place).toBeUndefined();
        // the answer is kept in the history of the caller
        expect(res.body.historyId).toBe("64b0000000000000000000e1");
        expect(destinationSearchRepository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: USER, query: "Thiên nhiên", region: "Miền Bắc" }));
    });

    it("answers 200 with an empty list when nothing suits", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ recommendations: [] }));
        const res = await request(app).post(url).set("Authorization", auth).send({ query: "x" });
        expect(res.status).toBe(200);
        expect(res.body.recommendations).toEqual([]);
        expect(res.body.historyId).toBeNull();
        expect(destinationSearchRepository.create).not.toHaveBeenCalled();
    });

    it.each([[{}], [{ query: "  " }], [{ query: "a".repeat(501) }], [{ query: "x", budget: -5 }]])("answers 400 for %j without calling the AI", async (body) => {
        const res = await request(app).post(url).set("Authorization", auth).send(body);
        expect(res.status).toBe(400);
        expect(startChat).not.toHaveBeenCalled();
    });

    it("answers 502 on an unreadable AI answer", async () => {
        getResponseText.mockReturnValue("không phải JSON");
        const res = await request(app).post(url).set("Authorization", auth).send({ query: "x" });
        expect(res.status).toBe(502);
        expect(res.body.code).toBe("AI_INVALID_RESPONSE");
    });

    it("answers 502 when the AI returns nothing", async () => {
        getResponseText.mockReturnValue(null);
        expect((await request(app).post(url).set("Authorization", auth).send({ query: "x" })).status).toBe(502);
    });

    it("answers 503 when the AI service is down", async () => {
        sendMessage.mockRejectedValue(new HttpError(503, "AI service unavailable", { code: "AI_QUOTA" }));
        const res = await request(app).post(url).set("Authorization", auth).send({ query: "x" });
        expect(res.status).toBe(503);
        expect(res.body.code).toBe("AI_QUOTA");
    });
});

describe("history of suggestions", () => {
    const ID = "64b0000000000000000000e1";
    const stored = (extra = {}) => ({
        _id: ID,
        query: "Thiên nhiên",
        interests: [],
        region: "",
        budget: "",
        recommendations: [{ name: "Tràng An", description: "d", reason: "r", inApp: false }],
        status: "draft",
        createdAt: new Date("2026-03-01"),
        ...extra,
    });

    it("requires sign-in", async () => {
        for (const [method, path] of [["get", "/destinations/history"], ["get", `/destinations/history/${ID}`], ["patch", `/destinations/history/${ID}`], ["delete", `/destinations/history/${ID}`]]) {
            expect((await request(app)[method](path)).status).toBe(401);
        }
    });

    it("lists the caller's suggestions, optionally one group", async () => {
        destinationSearchRepository.listByUser.mockResolvedValue([stored()]);
        const res = await request(app).get("/destinations/history?status=draft").set("Authorization", auth);
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([expect.objectContaining({ id: ID, count: 1, names: ["Tràng An"], status: "draft" })]);
        expect(destinationSearchRepository.listByUser).toHaveBeenCalledWith(USER, "draft", 30);
        expect((await request(app).get("/destinations/history?status=nope").set("Authorization", auth)).status).toBe(400);
    });

    it("opens one suggestion with its places, 404 when it is not the caller's", async () => {
        destinationSearchRepository.findOwned.mockResolvedValueOnce(stored()).mockResolvedValueOnce(null);
        const ok = await request(app).get(`/destinations/history/${ID}`).set("Authorization", auth);
        expect(ok.status).toBe(200);
        expect(ok.body.search.recommendations).toHaveLength(1);
        expect(destinationSearchRepository.findOwned).toHaveBeenCalledWith(ID, USER);
        expect((await request(app).get(`/destinations/history/${ID}`).set("Authorization", auth)).status).toBe(404);
        expect((await request(app).get("/destinations/history/abc").set("Authorization", auth)).status).toBe(404);
    });

    it("marks a suggestion as created and validates the body", async () => {
        destinationSearchRepository.updateOwned.mockResolvedValue(stored({ status: "created" }));
        const ok = await request(app).patch(`/destinations/history/${ID}`).set("Authorization", auth).send({ status: "created" });
        expect(ok.status).toBe(200);
        expect(ok.body.search.status).toBe("created");
        expect((await request(app).patch(`/destinations/history/${ID}`).set("Authorization", auth).send({ status: "x" })).status).toBe(400);
    });

    it("deletes only the caller's own suggestion", async () => {
        destinationSearchRepository.removeOwned.mockResolvedValueOnce({ deletedCount: 1 }).mockResolvedValueOnce({ deletedCount: 0 });
        expect((await request(app).delete(`/destinations/history/${ID}`).set("Authorization", auth)).status).toBe(200);
        expect(destinationSearchRepository.removeOwned).toHaveBeenCalledWith(ID, USER);
        expect((await request(app).delete(`/destinations/history/${ID}`).set("Authorization", auth)).status).toBe(404);
    });
});
