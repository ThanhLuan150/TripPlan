// HTTP-level tests of AI itinerary editing: authorization, preview (nothing saved), Accept, AI failure.
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
vi.mock("../../src/repositories/challengeRepository.js", () => ({
    default: { findByTripDayId: vi.fn(), create: vi.fn(), updateById: vi.fn(), deleteByIds: vi.fn() },
}));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({
    default: { create: vi.fn(), deleteByChallengeIds: vi.fn(), findByUserAndChallenges: vi.fn() },
}));
vi.mock("../../src/repositories/tripAiProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByTrip: vi.fn() },
}));
vi.mock("../../src/repositories/tripNoteRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));
vi.mock("../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: challengeProgressRepository } = await import("../../src/repositories/challengeProgressRepository.js");
const { default: tripAiProposalRepository } = await import("../../src/repositories/tripAiProposalRepository.js");
const { startChat, getResponseText } = await import("../../src/utils/gemini.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const PROPOSAL_ID = "64b0000000000000000000c1";
const url = `/trip-plan/${TRIP_ID}/ai-edit`;
const sendMessage = vi.fn();

const newDay = (title) => ({
    title,
    activities: [{ name_location: "Chợ Đà Lạt", challenge_summary: "Ăn sáng", level_of_difficult: 20 }],
    transportCost: 1,
    foodCost: 1,
    otherCost: 1,
});

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && userId === OWNER ? { _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Lâm Đồng" } : null);
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d1", title: "Ngày 1" }]);
    challengeRepository.findByTripDayId.mockResolvedValue([{ _id: "c1", nameLocation: "Hồ Xuân Hương", challengeSummary: "Đi dạo", points: 20 }]);
    challengeRepository.create.mockResolvedValue({ _id: "new" });
    challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([]);
    tripAiProposalRepository.create.mockImplementation(async (data) => ({ _id: PROPOSAL_ID, ...data }));
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
});

describe("POST /trip-plan/:id/ai-edit", () => {
    it("requires sign-in and ownership", async () => {
        expect((await request(app).post(url).send({ instruction: "x" })).status).toBe(401);
        expect((await request(app).post(url).set("Authorization", auth(STRANGER)).send({ instruction: "x" })).status).toBe(404);
        expect(startChat).not.toHaveBeenCalled();
    });

    it("returns a preview and saves nothing", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ days: [newDay("Mới")] }));

        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ instruction: "Thêm chợ" });

        expect(res.status).toBe(200);
        expect(res.body.proposal.id).toBe(PROPOSAL_ID);
        expect(res.body.proposal.days[0].title).toBe("Mới");
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    });

    it("answers 400 without an instruction", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({});
        expect(res.status).toBe(400);
    });

    it("answers 502 on an invalid AI answer and keeps the itinerary", async () => {
        getResponseText.mockReturnValue("not json");
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ instruction: "x" });
        expect(res.status).toBe(502);
        expect(res.body.code).toBe("AI_INVALID_RESPONSE");
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });

    it("answers 503 when the AI service is down and keeps the itinerary", async () => {
        sendMessage.mockRejectedValue(new HttpError(503, "AI service unavailable", { code: "AI_BUSY" }));
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ instruction: "x" });
        expect(res.status).toBe(503);
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });
});

describe("POST /trip-plan/:id/ai-edit/apply (Accept)", () => {
    const stored = (days) => tripAiProposalRepository.findOwned.mockResolvedValue({ _id: PROPOSAL_ID, days });

    it("requires ownership", async () => {
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(STRANGER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(404);
        expect(tripAiProposalRepository.findOwned).not.toHaveBeenCalled();
    });

    it("saves the stored proposal, not what the client sends", async () => {
        stored([newDay("Từ server")]);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID, days: [newDay("Từ client")] });
        expect(res.status).toBe(200);
        expect(tripAiProposalRepository.findOwned).toHaveBeenCalledWith(PROPOSAL_ID, TRIP_ID, OWNER);
        expect(tripDayRepository.updateById).toHaveBeenCalledWith("d1", expect.objectContaining({ title: "Từ server" }));
        expect(challengeRepository.deleteByIds).toHaveBeenCalledWith(["c1"]);
    });

    it("answers 404 for a missing, foreign or expired proposal and saves nothing", async () => {
        tripAiProposalRepository.findOwned.mockResolvedValue(null);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("AI_PROPOSAL_NOT_FOUND");
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });

    it("answers 409 for a stale proposal and saves nothing", async () => {
        stored([newDay("a"), newDay("b")]);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(409);
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });
});

describe("DELETE /trip-plan/:id/ai-edit/:proposalId (Reject)", () => {
    it("requires ownership", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL_ID}`).set("Authorization", auth(STRANGER));
        expect(res.status).toBe(404);
    });

    it("forgets the proposal and keeps the itinerary", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL_ID}`).set("Authorization", auth(OWNER));
        expect(res.status).toBe(200);
        expect(tripAiProposalRepository.remove).toHaveBeenCalledWith(PROPOSAL_ID, TRIP_ID, OWNER);
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    });
});
