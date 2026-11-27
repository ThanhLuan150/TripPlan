import { beforeEach, describe, expect, it, vi } from "vitest";
import service from "../../../src/services/tripDayRegenerateService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import tripDayProposalRepository from "../../../src/repositories/tripDayProposalRepository.js";
import { getResponseText, startChat } from "../../../src/utils/gemini.js";
import { getLocationFromNameLocation } from "../../../src/utils/geocode.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { updateById: vi.fn() } }));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({
    default: { findByTripDayId: vi.fn(), create: vi.fn(), updateById: vi.fn(), deleteByIds: vi.fn() },
}));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({
    default: { create: vi.fn(), deleteByChallengeIds: vi.fn(), findByUserAndChallenges: vi.fn() },
}));
vi.mock("../../../src/repositories/tripDayProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByDay: vi.fn() },
}));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const USER = "64b000000000000000000001";
const PROPOSAL_ID = "64b0000000000000000000c1";
const D1 = "64b0000000000000000000d1";
const D2 = "64b0000000000000000000d2";
const C1 = "64b0000000000000000000e1";
const C2 = "64b0000000000000000000e2";
const trip = { _id: "t1", nameTrip: "Đà Lạt", location: "Lâm Đồng" };
const sendMessage = vi.fn();

const dayDocs = [
    { _id: D1, day: 1, title: "Ngày 1", transportCost: 10, foodCost: 20, otherCost: 30 },
    { _id: D2, day: 2, title: "Ngày 2", transportCost: 1, foodCost: 2, otherCost: 3 },
];
const challengesByDay = {
    [D1]: [{ _id: C1, nameLocation: "Hồ Xuân Hương", challengeSummary: "Đi dạo", points: 20 }],
    [D2]: [{ _id: C2, nameLocation: "Thung lũng Tình Yêu", challengeSummary: "Chụp ảnh", points: 30 }],
};

const activity = (name, extra = {}) => ({ name_location: name, challenge_summary: "Mô tả", level_of_difficult: 40, province: "Lâm Đồng", ...extra });
const newDay = (activities, extra = {}) => ({ title: "Ngày mới", activities, transportCost: 5, foodCost: 6, otherCost: 7, ...extra });

const answer = (value) => getResponseText.mockReturnValue(typeof value === "string" ? value : JSON.stringify(value));
const stored = (day, extra = {}) =>
    tripDayProposalRepository.findOwned.mockResolvedValue({ _id: PROPOSAL_ID, dayId: D1, baseIds: [C1], day, ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    tripDayRepository.findByTripId.mockResolvedValue(dayDocs);
    challengeRepository.findByTripDayId.mockImplementation(async (id) => challengesByDay[id]);
    challengeRepository.create.mockResolvedValue({ _id: "new" });
    challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([]);
    tripDayProposalRepository.create.mockImplementation(async (data) => ({ _id: PROPOSAL_ID, ...data }));
});

const expectNothingWritten = () => {
    expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.create).not.toHaveBeenCalled();
    expect(challengeRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    expect(tripPlanRepository.updateById).not.toHaveBeenCalled();
};

describe("proposeDay", () => {
    it("asks the AI about the chosen day only, with the user's request, and stores the proposal", async () => {
        answer(newDay([activity("Chợ Đà Lạt")]));

        const result = await service.proposeDay(trip, USER, D1, "  Thêm chợ  ");

        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Hồ Xuân Hương");
        expect(prompt).toContain("Thêm chợ");
        expect(prompt).not.toContain("Thung lũng Tình Yêu"); // the other day is never sent
        expect(result.proposal).toMatchObject({ id: PROPOSAL_ID, dayId: D1 });
        expect(result.proposal.day.activities[0].name_location).toBe("Chợ Đà Lạt");
        expect(result.current).toMatchObject({ id: D1, day: 1, title: "Ngày 1" });
        expect(tripDayProposalRepository.create).toHaveBeenCalledWith(expect.objectContaining({ dayId: D1, userId: USER, baseIds: [C1] }));
        expectNothingWritten();
    });

    it("works without a request", async () => {
        answer(newDay([activity("Chợ Đà Lạt")]));
        await service.proposeDay(trip, USER, D1, undefined);
        expect(sendMessage.mock.calls[0][0]).toContain("không có yêu cầu riêng");
    });

    it("rejects a request that is too long, before calling the AI", async () => {
        await expect(service.proposeDay(trip, USER, D1, "x".repeat(501))).rejects.toMatchObject({ status: 400 });
        expect(startChat).not.toHaveBeenCalled();
    });

    it("answers 404 for a day that is not part of the trip, before calling the AI", async () => {
        for (const dayId of ["64b0000000000000000000ff", "nope", undefined]) {
            await expect(service.proposeDay(trip, USER, dayId)).rejects.toMatchObject({ status: 404, body: { code: "DAY_NOT_FOUND" } });
        }
        expect(startChat).not.toHaveBeenCalled();
    });

    it("answers 502 when the AI returns nothing, unreadable text or a day without activities", async () => {
        getResponseText.mockReturnValue(null);
        await expect(service.proposeDay(trip, USER, D1)).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        answer("not json");
        await expect(service.proposeDay(trip, USER, D1)).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        answer(newDay([]));
        await expect(service.proposeDay(trip, USER, D1)).rejects.toMatchObject({ status: 502, body: { code: "AI_EMPTY_DAY" } });
        expect(tripDayProposalRepository.create).not.toHaveBeenCalled();
        expectNothingWritten();
    });

    it("answers 502 for an invalid day (no title, bad activity, bad cost, too many activities)", async () => {
        const bad = [
            newDay([activity("A")], { title: "" }),
            newDay([{ name_location: "A" }]),
            newDay([activity("A")], { foodCost: -1 }),
            newDay(Array.from({ length: 11 }, (_, i) => activity(`P${i}`))),
            { title: "x" },
        ];
        for (const day of bad) {
            answer(day);
            await expect(service.proposeDay(trip, USER, D1)).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        }
        expect(tripDayProposalRepository.create).not.toHaveBeenCalled();
        expectNothingWritten();
    });

    it("lets an AI failure through and writes nothing", async () => {
        sendMessage.mockRejectedValue(Object.assign(new Error("busy"), { status: 503 }));
        await expect(service.proposeDay(trip, USER, D1)).rejects.toThrow("busy");
        expectNothingWritten();
    });

    it("puts back a completed place the AI left out, marked kept", async () => {
        answer(newDay([activity("Chợ Đà Lạt")]));
        challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([{ chaId: C1, completed: true }]);

        const { proposal } = await service.proposeDay(trip, USER, D1);

        expect(proposal.day.activities.map((a) => a.name_location)).toEqual(["Chợ Đà Lạt", "Hồ Xuân Hương"]);
        expect(proposal.day.activities[1].kept).toBe(true);
    });
});

describe("applyDay", () => {
    it("updates only the chosen day: its costs, its places, the trip totals", async () => {
        stored(newDay([activity("Hồ Xuân Hương", { challenge_summary: "Mới" }), activity("Chợ Đà Lạt")]));
        getLocationFromNameLocation.mockResolvedValue({ location: "Chợ, Đà Lạt", latitude: 1, longitude: 2 });

        const result = await service.applyDay(trip, USER, PROPOSAL_ID);

        expect(result).toMatchObject({ dayId: D1 });
        expect(tripDayRepository.updateById).toHaveBeenCalledTimes(1);
        expect(tripDayRepository.updateById).toHaveBeenCalledWith(D1, { title: "Ngày mới", transportCost: 5, foodCost: 6, otherCost: 7 });
        // the place that stays keeps its challenge (progress, photo), the new one gets its own
        expect(challengeRepository.updateById).toHaveBeenCalledWith(C1, expect.objectContaining({ challengeSummary: "Mới", order: 0, tripDayId: D1 }));
        expect(challengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ nameLocation: "Chợ Đà Lạt", order: 1, tripDayId: D1, latitude: 1 }));
        expect(challengeProgressRepository.create).toHaveBeenCalledWith(USER, "new");
        // the other day is never read for places, never written
        expect(challengeRepository.findByTripDayId).not.toHaveBeenCalledWith(D2);
        expect(challengeRepository.updateById).not.toHaveBeenCalledWith(C2, expect.anything());
        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
        expect(tripPlanRepository.updateById).toHaveBeenCalledWith("t1", { transportCostTotal: 6, foodCostTotal: 8, otherCostTotal: 10 });
        expect(tripDayProposalRepository.removeByDay).toHaveBeenCalledWith(D1);
    });

    it("removes the places the proposal dropped, except a completed one", async () => {
        challengesByDay[D1] = [
            { _id: C1, nameLocation: "Hồ Xuân Hương", points: 20 },
            { _id: "64b0000000000000000000e3", nameLocation: "Bỏ", points: 20 },
        ];
        stored(newDay([activity("Chợ Đà Lạt")]), { baseIds: [C1, "64b0000000000000000000e3"] });
        getLocationFromNameLocation.mockResolvedValue(null);

        await service.applyDay(trip, USER, PROPOSAL_ID);

        expect(challengeRepository.deleteByIds).toHaveBeenCalledWith([C1, "64b0000000000000000000e3"]);
        expect(challengeProgressRepository.deleteByChallengeIds).toHaveBeenCalledWith([C1, "64b0000000000000000000e3"]);
        challengesByDay[D1] = [{ _id: C1, nameLocation: "Hồ Xuân Hương", challengeSummary: "Đi dạo", points: 20 }];
    });

    it("never removes a completed place", async () => {
        stored(newDay([activity("Chợ Đà Lạt")]));
        getLocationFromNameLocation.mockResolvedValue(null);
        challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([{ chaId: C1, completed: true }]);

        await service.applyDay(trip, USER, PROPOSAL_ID);

        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    });

    it("answers 404 for a missing, foreign or malformed proposal and writes nothing", async () => {
        tripDayProposalRepository.findOwned.mockResolvedValue(null);
        await expect(service.applyDay(trip, USER, PROPOSAL_ID)).rejects.toMatchObject({ status: 404, body: { code: "AI_PROPOSAL_NOT_FOUND" } });
        await expect(service.applyDay(trip, USER, "nope")).rejects.toMatchObject({ status: 404 });
        expect(tripDayProposalRepository.findOwned).toHaveBeenCalledTimes(1);
        expectNothingWritten();
    });

    it("answers 409 when the day gained or lost a place since the proposal, and writes nothing", async () => {
        stored(newDay([activity("A")]), { baseIds: [C1, "64b0000000000000000000e9"] });
        await expect(service.applyDay(trip, USER, PROPOSAL_ID)).rejects.toMatchObject({ status: 409, body: { code: "DAY_CHANGED" } });
        expectNothingWritten();
    });

    it("answers 404 when the day no longer exists", async () => {
        stored(newDay([activity("A")]), { dayId: "64b0000000000000000000ff" });
        await expect(service.applyDay(trip, USER, PROPOSAL_ID)).rejects.toMatchObject({ status: 404, body: { code: "DAY_NOT_FOUND" } });
        expectNothingWritten();
    });

    it("answers 409 for a stored day that is no longer valid, and writes nothing", async () => {
        stored({ title: "", activities: [] });
        await expect(service.applyDay(trip, USER, PROPOSAL_ID)).rejects.toMatchObject({ status: 409 });
        expectNothingWritten();
    });

    it("writes nothing when a place lookup fails", async () => {
        stored(newDay([activity("Chợ Đà Lạt")]));
        getLocationFromNameLocation.mockRejectedValue(new Error("geocoder down"));
        await expect(service.applyDay(trip, USER, PROPOSAL_ID)).rejects.toThrow("geocoder down");
        expectNothingWritten();
    });
});

describe("discardDay", () => {
    it("forgets the proposal of this trip and user, and touches nothing else", async () => {
        await service.discardDay(trip, USER, PROPOSAL_ID);
        expect(tripDayProposalRepository.remove).toHaveBeenCalledWith(PROPOSAL_ID, "t1", USER);
        expectNothingWritten();
    });

    it("ignores a malformed id", async () => {
        await service.discardDay(trip, USER, "nope");
        expect(tripDayProposalRepository.remove).not.toHaveBeenCalled();
    });
});
