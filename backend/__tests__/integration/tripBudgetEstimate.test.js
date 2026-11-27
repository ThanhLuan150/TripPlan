// HTTP-level tests of AI budget estimation: authorization, validation, saved as an estimate (never an expense).
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
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({
    default: { findOwnedById: vi.fn(), findPublicById: vi.fn(), findSharedByToken: vi.fn(), updateById: vi.fn() },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), create: vi.fn() } }));
vi.mock("../../src/repositories/tripBudgetEstimateRepository.js", () => ({ default: { findByTrip: vi.fn(), save: vi.fn() } }));
vi.mock("../../src/repositories/tripNoteRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: estimateRepository } = await import("../../src/repositories/tripBudgetEstimateRepository.js");
const { startChat, getResponseText } = await import("../../src/utils/gemini.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const url = `/trip-plan/${TRIP_ID}/budget-estimate`;
const sendMessage = vi.fn();

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const cat = (key, amount) => ({ key, amount, note: "" });
const aiAnswer = () => ({
    categories: [cat("accommodation", 1000), cat("food", 500), cat("transport", 300), cat("activities", 200), cat("other", 100)],
    assumptions: ["Khách sạn 3 sao"],
});
const stored = (extra = {}) => ({ _id: "e1", tripId: TRIP_ID, currency: "VND", travelers: 2, spendingLevel: "moderate", source: "ai", assumptions: ["a"], total: 2100, ...aiAnswer(), ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && userId === OWNER ? { _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Lâm Đồng" } : null);
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d1", title: "Ngày 1" }]);
    challengeRepository.findByTripDayId.mockResolvedValue([{ nameLocation: "Hồ Xuân Hương" }]);
    estimateRepository.save.mockImplementation(async (tripId, userId, data) => ({ _id: "e1", tripId, ...data }));
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
});

describe("authorization", () => {
    it.each([["get"], ["post"], ["put"]])("%s requires sign-in and ownership", async (method) => {
        expect((await request(app)[method](url).send({})).status).toBe(401);
        expect((await request(app)[method](url).set("Authorization", auth(STRANGER)).send({})).status).toBe(404);
        expect(startChat).not.toHaveBeenCalled();
        expect(estimateRepository.save).not.toHaveBeenCalled();
        expect(estimateRepository.findByTrip).not.toHaveBeenCalled();
    });
});

describe("GET /trip-plan/:id/budget-estimate", () => {
    it("returns null before any estimate", async () => {
        estimateRepository.findByTrip.mockResolvedValue(null);
        const res = await request(app).get(url).set("Authorization", auth(OWNER));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ estimate: null });
    });

    it("returns the saved estimate, marked as an estimate", async () => {
        estimateRepository.findByTrip.mockResolvedValue(stored());
        const res = await request(app).get(url).set("Authorization", auth(OWNER));
        expect(res.body.estimate).toMatchObject({ isEstimate: true, total: 2100, travelers: 2 });
        expect(estimateRepository.findByTrip).toHaveBeenCalledWith(TRIP_ID, OWNER);
    });
});

describe("POST /trip-plan/:id/budget-estimate", () => {
    it("estimates per category, total matches, saved as an estimate and nothing else is written", async () => {
        getResponseText.mockReturnValue(JSON.stringify(aiAnswer()));

        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ travelers: 3, spendingLevel: "budget" });

        expect(res.status).toBe(200);
        expect(res.body.estimate.isEstimate).toBe(true);
        expect(res.body.estimate.categories).toHaveLength(5);
        expect(res.body.estimate.total).toBe(2100);
        expect(res.body.estimate.total).toBe(res.body.estimate.categories.reduce((t, c) => t + c.amount, 0));
        expect(estimateRepository.save).toHaveBeenCalledWith(TRIP_ID, OWNER, expect.objectContaining({ travelers: 3, spendingLevel: "budget" }));
        expect(tripPlanRepository.updateById).not.toHaveBeenCalled();
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });

    it("answers 400 on bad inputs", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ travelers: 0 });
        expect(res.status).toBe(400);
        expect(startChat).not.toHaveBeenCalled();
    });

    it("answers 400 for a trip without days", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([]);
        expect((await request(app).post(url).set("Authorization", auth(OWNER)).send({})).status).toBe(400);
    });

    it("answers 502 on a wrong format and saves nothing", async () => {
        getResponseText.mockReturnValue("not json");
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({});
        expect(res.status).toBe(502);
        expect(res.body.code).toBe("AI_INVALID_RESPONSE");
        expect(estimateRepository.save).not.toHaveBeenCalled();
    });

    it("answers 503 when the AI is down and saves nothing", async () => {
        sendMessage.mockRejectedValue(new HttpError(503, "AI service unavailable", { code: "AI_BUSY" }));
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({});
        expect(res.status).toBe(503);
        expect(estimateRepository.save).not.toHaveBeenCalled();
    });
});

describe("PUT /trip-plan/:id/budget-estimate", () => {
    it("updates amounts and recomputes the total", async () => {
        estimateRepository.findByTrip.mockResolvedValue(stored());
        const res = await request(app).put(url).set("Authorization", auth(OWNER)).send({ categories: [{ key: "food", amount: 1500 }] });
        expect(res.status).toBe(200);
        expect(res.body.estimate.total).toBe(3100);
        expect(res.body.estimate.source).toBe("manual");
        expect(res.body.estimate.isEstimate).toBe(true);
    });

    it("answers 404 without an estimate and 400 on a bad body", async () => {
        estimateRepository.findByTrip.mockResolvedValue(null);
        expect((await request(app).put(url).set("Authorization", auth(OWNER)).send({ categories: [] })).status).toBe(404);

        estimateRepository.findByTrip.mockResolvedValue(stored());
        expect((await request(app).put(url).set("Authorization", auth(OWNER)).send({ categories: [{ key: "food", amount: -1 }] })).status).toBe(400);
        expect(estimateRepository.save).not.toHaveBeenCalled();
    });
});
