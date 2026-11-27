// HTTP-level tests of AI regeneration of one day: authorization, preview (nothing saved), Accept
// (that day only, the other days keep their data), Reject, empty / invalid AI answers.
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
vi.mock("../../src/repositories/tripDayProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByDay: vi.fn() },
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
const { default: proposalRepository } = await import("../../src/repositories/tripDayProposalRepository.js");
const { startChat, getResponseText } = await import("../../src/utils/gemini.js");
const { getLocationFromNameLocation } = await import("../../src/utils/geocode.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const DAY_1 = "64b0000000000000000000d1";
const DAY_2 = "64b0000000000000000000d2";
const CHA_1 = "64b0000000000000000000e1";
const CHA_2 = "64b0000000000000000000e2";
const PROPOSAL_ID = "64b0000000000000000000c1";

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const url = `/trip-plan/${TRIP_ID}/day-regeneration`;
const sendMessage = vi.fn();

const newDay = (title = "Mới") => ({
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
    tripDayRepository.findByTripId.mockResolvedValue([
        { _id: DAY_1, day: 1, title: "Ngày 1", transportCost: 5, foodCost: 5, otherCost: 5 },
        { _id: DAY_2, day: 2, title: "Ngày 2", transportCost: 2, foodCost: 2, otherCost: 2 },
    ]);
    challengeRepository.findByTripDayId.mockImplementation(async (id) => id === DAY_1
        ? [{ _id: CHA_1, nameLocation: "Hồ Xuân Hương", challengeSummary: "Đi dạo", points: 20 }]
        : [{ _id: CHA_2, nameLocation: "Thung lũng", challengeSummary: "Ảnh", points: 30 }]);
    challengeRepository.create.mockResolvedValue({ _id: "new" });
    challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([]);
    getLocationFromNameLocation.mockResolvedValue(null);
    proposalRepository.create.mockImplementation(async (data) => ({ _id: PROPOSAL_ID, ...data }));
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
});

const expectNothingWritten = () => {
    expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.create).not.toHaveBeenCalled();
    expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    expect(tripPlanRepository.updateById).not.toHaveBeenCalled();
};

describe("POST /trip-plan/:id/day-regeneration", () => {
    it("requires sign-in and ownership of the trip", async () => {
        expect((await request(app).post(url).send({ dayId: DAY_1 })).status).toBe(401);
        expect((await request(app).post(url).set("Authorization", auth(STRANGER)).send({ dayId: DAY_1 })).status).toBe(404);
        expect(startChat).not.toHaveBeenCalled();
    });

    it("returns a preview of that day and saves nothing", async () => {
        getResponseText.mockReturnValue(JSON.stringify(newDay()));

        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY_1, instruction: "Thêm chợ" });

        expect(res.status).toBe(200);
        expect(res.body.proposal).toMatchObject({ id: PROPOSAL_ID, dayId: DAY_1 });
        expect(res.body.proposal.day.title).toBe("Mới");
        expect(res.body.current.title).toBe("Ngày 1");
        expectNothingWritten();
    });

    it("answers 404 for a day that is not part of the trip", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: "64b0000000000000000000ff" });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("DAY_NOT_FOUND");
        expect(startChat).not.toHaveBeenCalled();
    });

    it("answers 502 when the AI returns an empty day", async () => {
        getResponseText.mockReturnValue(JSON.stringify({ ...newDay(), activities: [] }));
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY_1 });
        expect(res.status).toBe(502);
        expect(res.body.code).toBe("AI_EMPTY_DAY");
        expect(proposalRepository.create).not.toHaveBeenCalled();
        expectNothingWritten();
    });

    it("answers 502 on an invalid AI answer and keeps the itinerary", async () => {
        getResponseText.mockReturnValue("not json");
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY_1 });
        expect(res.status).toBe(502);
        expect(res.body.code).toBe("AI_INVALID_RESPONSE");
        expectNothingWritten();
    });

    it("answers 503 when the AI service is down and keeps the itinerary", async () => {
        sendMessage.mockRejectedValue(new HttpError(503, "AI service unavailable", { code: "AI_BUSY" }));
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY_1 });
        expect(res.status).toBe(503);
        expectNothingWritten();
    });
});

describe("POST /trip-plan/:id/day-regeneration/apply (Accept)", () => {
    const stored = (day) => proposalRepository.findOwned.mockResolvedValue({ _id: PROPOSAL_ID, dayId: DAY_1, baseIds: [CHA_1], day });

    it("requires ownership", async () => {
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(STRANGER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(404);
        expect(proposalRepository.findOwned).not.toHaveBeenCalled();
    });

    it("saves the stored day, not what the client sends, and leaves the other days alone", async () => {
        stored(newDay("Từ server"));

        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID, day: newDay("Từ client"), dayId: DAY_2 });

        expect(res.status).toBe(200);
        expect(res.body.dayId).toBe(DAY_1);
        expect(proposalRepository.findOwned).toHaveBeenCalledWith(PROPOSAL_ID, TRIP_ID, OWNER);
        expect(tripDayRepository.updateById).toHaveBeenCalledTimes(1);
        expect(tripDayRepository.updateById).toHaveBeenCalledWith(DAY_1, expect.objectContaining({ title: "Từ server" }));
        expect(challengeRepository.deleteByIds).toHaveBeenCalledWith([CHA_1]);
        // day 2: neither its day nor its place is written, and its place is not deleted
        expect(challengeRepository.updateById).not.toHaveBeenCalledWith(CHA_2, expect.anything());
        expect(challengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ tripDayId: DAY_1 }));
        // trip totals: new day 1 (1) + untouched day 2 (2)
        expect(tripPlanRepository.updateById).toHaveBeenCalledWith(TRIP_ID, { transportCostTotal: 3, foodCostTotal: 3, otherCostTotal: 3 });
    });

    it("answers 404 for a missing, foreign or expired proposal and saves nothing", async () => {
        proposalRepository.findOwned.mockResolvedValue(null);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("AI_PROPOSAL_NOT_FOUND");
        expectNothingWritten();
    });

    it("answers 409 when the day changed since the proposal and saves nothing", async () => {
        proposalRepository.findOwned.mockResolvedValue({ _id: PROPOSAL_ID, dayId: DAY_1, baseIds: [CHA_1, "64b0000000000000000000e9"], day: newDay() });
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL_ID });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("DAY_CHANGED");
        expectNothingWritten();
    });
});

describe("DELETE /trip-plan/:id/day-regeneration/:proposalId (Reject)", () => {
    it("requires ownership", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL_ID}`).set("Authorization", auth(STRANGER));
        expect(res.status).toBe(404);
        expect(proposalRepository.remove).not.toHaveBeenCalled();
    });

    it("forgets the proposal and keeps the itinerary", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL_ID}`).set("Authorization", auth(OWNER));
        expect(res.status).toBe(200);
        expect(proposalRepository.remove).toHaveBeenCalledWith(PROPOSAL_ID, TRIP_ID, OWNER);
        expectNothingWritten();
    });
});
