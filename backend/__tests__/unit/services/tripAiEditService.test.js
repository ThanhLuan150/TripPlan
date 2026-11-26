import { beforeEach, describe, expect, it, vi } from "vitest";
import tripAiEditService from "../../../src/services/tripAiEditService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import tripAiProposalRepository from "../../../src/repositories/tripAiProposalRepository.js";
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
vi.mock("../../../src/repositories/tripAiProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByTrip: vi.fn() },
}));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const USER = "64b000000000000000000001";
const PROPOSAL_ID = "64b0000000000000000000c1";
const trip = { _id: "t1", nameTrip: "Đà Lạt", location: "Lâm Đồng" };
const sendMessage = vi.fn();

const dayDocs = [{ _id: "d1", title: "Ngày 1" }, { _id: "d2", title: "Ngày 2" }];
const challengesByDay = {
    d1: [{ _id: "c1", nameLocation: "Hồ Xuân Hương", challengeSummary: "Đi dạo", points: 20 }],
    d2: [{ _id: "c2", nameLocation: "Thung lũng Tình Yêu", challengeSummary: "Chụp ảnh", points: 30 }],
};

const activity = (name, extra = {}) => ({ name_location: name, challenge_summary: "Mô tả", level_of_difficult: 40, province: "Lâm Đồng", ...extra });
const day = (title, activities, extra = {}) => ({ title, activities, transportCost: 1, foodCost: 2, otherCost: 3, ...extra });
const proposal = () => [day("Ngày 1 mới", [activity("Hồ Xuân Hương")]), day("Ngày 2 mới", [activity("Đồi Mộng Mơ")])];

const answer = (value) => getResponseText.mockReturnValue(typeof value === "string" ? value : JSON.stringify(value));
const stored = (days) => tripAiProposalRepository.findOwned.mockResolvedValue({ _id: PROPOSAL_ID, days });
const complete = (...ids) => challengeProgressRepository.findByUserAndChallenges.mockResolvedValue(ids.map((id) => ({ chaId: id, completed: true })));

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    tripDayRepository.findByTripId.mockResolvedValue(dayDocs);
    challengeRepository.findByTripDayId.mockImplementation(async (id) => challengesByDay[id]);
    challengeRepository.create.mockResolvedValue({ _id: "new" });
    challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([]);
    tripAiProposalRepository.create.mockImplementation(async (data) => ({ _id: PROPOSAL_ID, ...data }));
});

// nothing of the itinerary was touched
const expectNothingWritten = () => {
    expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.create).not.toHaveBeenCalled();
    expect(challengeRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    expect(challengeProgressRepository.deleteByChallengeIds).not.toHaveBeenCalled();
    expect(tripPlanRepository.updateById).not.toHaveBeenCalled();
};

describe("proposeEdit", () => {
    it("sends the current itinerary and the request, stores a validated proposal on the server and writes nothing else", async () => {
        answer("```json\n" + JSON.stringify({ days: proposal() }) + "\n```");

        const result = await tripAiEditService.proposeEdit(trip, USER, "  Thêm quán cà phê  ");

        expect(result.proposal.id).toBe(PROPOSAL_ID);
        expect(result.proposal.days).toHaveLength(2);
        expect(result.proposal.days[1].activities[0].name_location).toBe("Đồi Mộng Mơ");
        expect(tripAiProposalRepository.create).toHaveBeenCalledWith({ tripId: "t1", userId: USER, days: result.proposal.days });
        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Thêm quán cà phê");
        expect(prompt).toContain("Hồ Xuân Hương");
        expectNothingWritten();
    });

    it.each([[""], ["   "], [undefined], [42]])("refuses an empty request (%j) without calling the AI", async (instruction) => {
        await expect(tripAiEditService.proposeEdit(trip, USER, instruction)).rejects.toMatchObject({ status: 400 });
        expect(startChat).not.toHaveBeenCalled();
    });

    it("refuses a too long request", async () => {
        await expect(tripAiEditService.proposeEdit(trip, USER, "a".repeat(501))).rejects.toMatchObject({ status: 400 });
    });

    it("refuses a trip without days", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([]);
        await expect(tripAiEditService.proposeEdit(trip, USER, "x")).rejects.toMatchObject({ status: 400 });
    });

    it("passes on an AI service failure and stores nothing", async () => {
        sendMessage.mockRejectedValue(Object.assign(new Error("AI service unavailable"), { status: 503 }));
        await expect(tripAiEditService.proposeEdit(trip, USER, "x")).rejects.toMatchObject({ status: 503 });
        expect(tripAiProposalRepository.create).not.toHaveBeenCalled();
        expectNothingWritten();
    });

    it("fails with 502 when the AI returns no text", async () => {
        getResponseText.mockReturnValue(null);
        await expect(tripAiEditService.proposeEdit(trip, USER, "x")).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        expectNothingWritten();
    });

    it.each([
        ["not JSON", "sorry, I cannot"],
        ["broken JSON", "{ days: [ "],
        ["no days", { plan: [] }],
        ["too few days", { days: [proposal()[0]] }],
        ["a day without title", { days: [day("", [activity("A")]), proposal()[1]] }],
        ["a day without activities", { days: [day("T", []), proposal()[1]] }],
        ["too many activities", { days: [day("T", Array.from({ length: 11 }, (_, i) => activity(`P${i}`))), proposal()[1]] }],
        ["an incomplete activity", { days: [day("T", [{ name_location: "A" }]), proposal()[1]] }],
        ["a negative cost", { days: [day("T", [activity("A")], { foodCost: -1 }), proposal()[1]] }],
        ["a cost that is not a number", { days: [day("T", [activity("A")], { transportCost: "12" }), proposal()[1]] }],
    ])("fails with 502 on an invalid answer: %s", async (_name, value) => {
        answer(value);
        await expect(tripAiEditService.proposeEdit(trip, USER, "x")).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        expect(tripAiProposalRepository.create).not.toHaveBeenCalled();
        expectNothingWritten();
    });

    it("clamps the difficulty to 10..100", async () => {
        answer({ days: [day("a", [activity("A", { level_of_difficult: 500 })]), day("b", [activity("B", { level_of_difficult: 1 })])] });
        const { proposal: result } = await tripAiEditService.proposeEdit(trip, USER, "x");
        expect(result.days.map((d) => d.activities[0].level_of_difficult)).toEqual([100, 10]);
    });

    it("puts a completed place the AI dropped back on its day, marked kept (not completed ones may go)", async () => {
        complete("c1");
        answer({ days: [day("a", [activity("Chợ Đà Lạt")]), day("b", [activity("Đồi Mộng Mơ")])] });

        const { proposal: result } = await tripAiEditService.proposeEdit(trip, USER, "bỏ hết");

        expect(result.days[0].activities.map((a) => a.name_location)).toEqual(["Chợ Đà Lạt", "Hồ Xuân Hương"]);
        expect(result.days[0].activities[1]).toMatchObject({ kept: true, challenge_summary: "Đi dạo", level_of_difficult: 20 });
        // c2 was not completed: the AI may drop it
        expect(result.days[1].activities.map((a) => a.name_location)).toEqual(["Đồi Mộng Mơ"]);
    });

    it("does not duplicate a completed place the AI kept", async () => {
        complete("c1");
        answer({ days: proposal() });
        const { proposal: result } = await tripAiEditService.proposeEdit(trip, USER, "x");
        expect(result.days[0].activities).toHaveLength(1);
        expect(result.days[0].activities[0].kept).toBeUndefined();
    });
});

describe("applyEdit (Accept)", () => {
    it("saves the stored proposal: updates days, keeps kept places, creates new ones, removes dropped ones, recomputes totals", async () => {
        stored(proposal());
        getLocationFromNameLocation.mockResolvedValue({ location: "Đồi Mộng Mơ, Đà Lạt", latitude: 1, longitude: 2 });

        const result = await tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID);

        expect(result).toMatchObject({ tripId: "t1" });
        expect(tripAiProposalRepository.findOwned).toHaveBeenCalledWith(PROPOSAL_ID, "t1", USER);
        expect(tripDayRepository.updateById).toHaveBeenCalledWith("d1", { title: "Ngày 1 mới", transportCost: 1, foodCost: 2, otherCost: 3 });
        // "Hồ Xuân Hương" stays: same challenge (keeps progress), only its text is updated
        expect(challengeRepository.updateById).toHaveBeenCalledWith("c1", expect.objectContaining({ nameLocation: "Hồ Xuân Hương", tripDayId: "d1" }));
        // new place: geocoded, challenge + progress created
        expect(getLocationFromNameLocation).toHaveBeenCalledWith("Đồi Mộng Mơ", "Lâm Đồng");
        expect(challengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ tripDayId: "d2", location: "Đồi Mộng Mơ, Đà Lạt", latitude: 1 }));
        expect(challengeProgressRepository.create).toHaveBeenCalledWith(USER, "new");
        // dropped place is removed together with its progress
        expect(challengeRepository.deleteByIds).toHaveBeenCalledWith(["c2"]);
        expect(challengeProgressRepository.deleteByChallengeIds).toHaveBeenCalledWith(["c2"]);
        expect(tripPlanRepository.updateById).toHaveBeenCalledWith("t1", { transportCostTotal: 2, foodCostTotal: 4, otherCostTotal: 6 });
        // the proposals of the trip are stale now
        expect(tripAiProposalRepository.removeByTrip).toHaveBeenCalledWith("t1");
    });

    it("never deletes a completed challenge, whatever the stored proposal says", async () => {
        complete("c2");
        stored(proposal()); // leaves out "Thung lũng Tình Yêu" (c2, completed)

        await tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID);

        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
        expect(challengeProgressRepository.deleteByChallengeIds).not.toHaveBeenCalled();
    });

    it("saves kept (completed) places a proposal carries", async () => {
        complete("c1");
        stored([day("a", [activity("Chợ Đà Lạt"), activity("Hồ Xuân Hương", { kept: true })]), day("b", [activity("Thung lũng Tình Yêu")])]);

        await tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID);

        expect(challengeRepository.updateById).toHaveBeenCalledWith("c1", expect.objectContaining({ tripDayId: "d1" }));
        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
    });

    it("falls back to the typed place name when it cannot be geocoded", async () => {
        stored(proposal());
        getLocationFromNameLocation.mockResolvedValue(undefined);
        await tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID);
        expect(challengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ location: "Đồi Mộng Mơ, Lâm Đồng" }));
    });

    it("deletes nothing when no place was dropped", async () => {
        stored([day("a", [activity("hồ xuân hương")]), day("b", [activity("Thung lũng Tình Yêu")])]);
        await tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID);
        expect(challengeRepository.deleteByIds).not.toHaveBeenCalled();
        expect(challengeRepository.create).not.toHaveBeenCalled();
    });

    it.each([[undefined], ["nope"], [PROPOSAL_ID]])("refuses an unknown, foreign or expired proposal (%s) with 404 and writes nothing", async (id) => {
        tripAiProposalRepository.findOwned.mockResolvedValue(null);
        await expect(tripAiEditService.applyEdit(trip, USER, id)).rejects.toMatchObject({ status: 404, body: { code: "AI_PROPOSAL_NOT_FOUND" } });
        expectNothingWritten();
    });

    it("refuses a stale proposal (the trip has another number of days now) with 409", async () => {
        stored([proposal()[0]]);
        await expect(tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID)).rejects.toMatchObject({ status: 409 });
        expectNothingWritten();
    });

    it("writes nothing when a lookup throws before the first write", async () => {
        stored(proposal());
        getLocationFromNameLocation.mockRejectedValue(new Error("geo down"));
        await expect(tripAiEditService.applyEdit(trip, USER, PROPOSAL_ID)).rejects.toThrow("geo down");
        expectNothingWritten();
        expect(tripAiProposalRepository.removeByTrip).not.toHaveBeenCalled();
    });
});

describe("discardProposal (Reject)", () => {
    it("forgets the proposal and never touches the itinerary", async () => {
        await tripAiEditService.discardProposal(trip, USER, PROPOSAL_ID);
        expect(tripAiProposalRepository.remove).toHaveBeenCalledWith(PROPOSAL_ID, "t1", USER);
        expectNothingWritten();
    });

    it("ignores an invalid id", async () => {
        await expect(tripAiEditService.discardProposal(trip, USER, "nope")).resolves.toMatchObject({ message: expect.any(String) });
        expect(tripAiProposalRepository.remove).not.toHaveBeenCalled();
    });

    it("proposing again and again never changes the stored itinerary", async () => {
        answer({ days: proposal() });
        await tripAiEditService.proposeEdit(trip, USER, "x");
        await tripAiEditService.proposeEdit(trip, USER, "y");
        expectNothingWritten();
    });
});
