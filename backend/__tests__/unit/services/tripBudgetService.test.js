import { beforeEach, describe, expect, it, vi } from "vitest";
import tripBudgetService from "../../../src/services/tripBudgetService.js";
import tripBudgetEstimateRepository from "../../../src/repositories/tripBudgetEstimateRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import { getResponseText, startChat } from "../../../src/utils/gemini.js";

vi.mock("../../../src/repositories/tripBudgetEstimateRepository.js", () => ({ default: { findByTrip: vi.fn(), save: vi.fn() } }));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), create: vi.fn() } }));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { updateById: vi.fn() } }));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const USER = "64b000000000000000000001";
const trip = { _id: "t1", nameTrip: "Đà Lạt", location: "Lâm Đồng", startDate: "2026-12-01T00:00:00.000Z", endDate: "2026-12-03T00:00:00.000Z" };
const sendMessage = vi.fn();

const cat = (key, amount, note = "") => ({ key, amount, note });
const valid = () => ({
    categories: [cat("accommodation", 1000000), cat("food", 500000, "3 bữa/ngày"), cat("transport", 300000), cat("activities", 200000), cat("other", 100000)],
    assumptions: ["Khách sạn 3 sao", "Ăn quán địa phương"],
});
const answer = (value) => getResponseText.mockReturnValue(typeof value === "string" ? value : JSON.stringify(value));
const stored = (extra = {}) => ({ _id: "e1", tripId: "t1", currency: "VND", travelers: 2, spendingLevel: "moderate", source: "ai", assumptions: ["a"], ...valid(), total: 2100000, ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d1", title: "Ngày 1", transportCost: 111, foodCost: 222 }, { _id: "d2", title: "Ngày 2" }]);
    challengeRepository.findByTripDayId.mockImplementation(async (id) => [{ nameLocation: id === "d1" ? "Hồ Xuân Hương" : "Langbiang", challengeSummary: id === "d1" ? "Đi dạo quanh hồ" : undefined }]);
    tripBudgetEstimateRepository.save.mockImplementation(async (tripId, userId, data) => ({ _id: "e1", tripId, ...data }));
});

// an estimate never touches the trip, its days or its costs
const expectTripUntouched = () => {
    expect(tripPlanRepository.updateById).not.toHaveBeenCalled();
    expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    expect(challengeRepository.create).not.toHaveBeenCalled();
};

describe("estimate", () => {
    it("sends the itinerary, travelers and level, saves a validated estimate whose total is the sum of the categories", async () => {
        answer("```json\n" + JSON.stringify(valid()) + "\n```");

        const result = await tripBudgetService.estimate(trip, USER, { travelers: 2, spendingLevel: "premium" });

        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Hồ Xuân Hương");
        expect(prompt).toContain("Langbiang");
        expect(prompt).toContain("Số người: 2");
        expect(prompt).toContain("premium");
        expect(prompt).toContain("2026-12-01");
        expect(prompt).toContain("2026-12-03");
        expect(prompt).toContain("Đi dạo quanh hồ");
        expect(prompt).toContain("\"transport\":111");
        expect(tripBudgetEstimateRepository.save).toHaveBeenCalledWith("t1", USER, expect.objectContaining({
            travelers: 2, spendingLevel: "premium", isEstimate: true, currency: "VND", source: "ai", total: 2100000,
        }));
        expect(result.estimate.isEstimate).toBe(true);
        expect(result.estimate.total).toBe(2100000);
        expect(result.estimate.total).toBe(result.estimate.categories.reduce((t, c) => t + c.amount, 0));
        expect(result.estimate.categories.map((c) => c.key)).toEqual(["accommodation", "food", "transport", "activities", "other"]);
        expect(result.estimate.assumptions).toEqual(["Khách sạn 3 sao", "Ăn quán địa phương"]);
        expectTripUntouched();
    });

    it("uses defaults when the optional inputs are missing", async () => {
        answer(valid());
        await tripBudgetService.estimate(trip, USER, undefined);
        expect(tripBudgetEstimateRepository.save).toHaveBeenCalledWith("t1", USER, expect.objectContaining({ travelers: 1, spendingLevel: "moderate" }));
    });

    it("ignores a total sent by the AI and rounds amounts", async () => {
        answer({ ...valid(), total: 999, categories: [cat("accommodation", 100.4), cat("food", 200.6), cat("transport", 0), cat("activities", 1), cat("other", 2)] });
        const { estimate } = await tripBudgetService.estimate(trip, USER, {});
        expect(estimate.categories.map((c) => c.amount)).toEqual([100, 201, 0, 1, 2]);
        expect(estimate.total).toBe(304);
    });

    it.each([
        [{ travelers: 0 }], [{ travelers: 1001 }], [{ travelers: 1.5 }], [{ travelers: "2" }], [{ spendingLevel: "luxury" }],
    ])("refuses bad inputs %j without calling the AI", async (options) => {
        await expect(tripBudgetService.estimate(trip, USER, options)).rejects.toMatchObject({ status: 400 });
        expect(startChat).not.toHaveBeenCalled();
    });

    it("refuses a trip without days (missing data)", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([]);
        await expect(tripBudgetService.estimate(trip, USER, {})).rejects.toMatchObject({ status: 400 });
        expect(startChat).not.toHaveBeenCalled();
    });

    it("refuses a trip whose days have no places, without calling the AI", async () => {
        challengeRepository.findByTripDayId.mockResolvedValue([]);
        await expect(tripBudgetService.estimate(trip, USER, {})).rejects.toMatchObject({ status: 400 });
        expect(startChat).not.toHaveBeenCalled();
    });

    it("still estimates when only some days have places", async () => {
        challengeRepository.findByTripDayId.mockImplementation(async (id) => (id === "d1" ? [{ nameLocation: "A" }] : []));
        answer(valid());
        await expect(tripBudgetService.estimate(trip, USER, {})).resolves.toHaveProperty("estimate");
    });

    it("passes on an AI failure and saves nothing", async () => {
        sendMessage.mockRejectedValue(Object.assign(new Error("AI service unavailable"), { status: 503 }));
        await expect(tripBudgetService.estimate(trip, USER, {})).rejects.toMatchObject({ status: 503 });
        expect(tripBudgetEstimateRepository.save).not.toHaveBeenCalled();
    });

    it("fails with 502 when the AI returns no text", async () => {
        getResponseText.mockReturnValue(null);
        await expect(tripBudgetService.estimate(trip, USER, {})).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        expect(tripBudgetEstimateRepository.save).not.toHaveBeenCalled();
    });

    const without = (key) => ({ ...valid(), categories: valid().categories.filter((c) => c.key !== key) });
    it.each([
        ["not JSON", "sorry, I cannot"],
        ["broken JSON", "{ categories: [ "],
        ["no categories", { assumptions: ["a"] }],
        ["a missing category", without("food")],
        ["a duplicated category", { ...valid(), categories: [...valid().categories, cat("food", 1)] }],
        ["an unknown category replacing one", { ...valid(), categories: [...without("other").categories, cat("shopping", 5)] }],
        ["a negative amount", { ...valid(), categories: [cat("accommodation", -1), ...valid().categories.slice(1)] }],
        ["an amount that is a string", { ...valid(), categories: [cat("accommodation", "100"), ...valid().categories.slice(1)] }],
        ["an infinite-sized amount", { ...valid(), categories: [cat("accommodation", 1e15), ...valid().categories.slice(1)] }],
        ["no assumptions", { categories: valid().categories }],
        ["empty assumptions", { ...valid(), assumptions: ["  ", 3] }],
    ])("fails with 502 on an invalid answer and saves nothing: %s", async (_name, value) => {
        answer(value);
        await expect(tripBudgetService.estimate(trip, USER, {})).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
        expect(tripBudgetEstimateRepository.save).not.toHaveBeenCalled();
        expectTripUntouched();
    });

    it("keeps at most 10 assumptions", async () => {
        answer({ ...valid(), assumptions: Array.from({ length: 15 }, (_, i) => `A${i}`) });
        const { estimate } = await tripBudgetService.estimate(trip, USER, {});
        expect(estimate.assumptions).toHaveLength(10);
    });
});

describe("getEstimate", () => {
    it("returns null when there is none, the estimate (marked) otherwise", async () => {
        tripBudgetEstimateRepository.findByTrip.mockResolvedValueOnce(null);
        expect(await tripBudgetService.getEstimate(trip, USER)).toEqual({ estimate: null });

        tripBudgetEstimateRepository.findByTrip.mockResolvedValueOnce(stored());
        const { estimate } = await tripBudgetService.getEstimate(trip, USER);
        expect(estimate).toMatchObject({ isEstimate: true, total: 2100000, travelers: 2 });
        expect(tripBudgetEstimateRepository.findByTrip).toHaveBeenCalledWith("t1", USER);
    });
});

describe("updateEstimate", () => {
    it("updates the sent amounts, keeps the others, recomputes the total and marks it manual", async () => {
        tripBudgetEstimateRepository.findByTrip.mockResolvedValue(stored());

        const { estimate } = await tripBudgetService.updateEstimate(trip, USER, { categories: [{ key: "food", amount: 900000 }, { key: "other", amount: 0 }] });

        expect(estimate.categories.map((c) => c.amount)).toEqual([1000000, 900000, 300000, 200000, 0]);
        expect(estimate.total).toBe(2400000);
        expect(estimate.source).toBe("manual");
        expect(estimate.isEstimate).toBe(true);
        expect(estimate.categories[1].note).toBe("3 bữa/ngày");
        expect(tripBudgetEstimateRepository.save).toHaveBeenCalledWith("t1", USER, expect.objectContaining({ total: 2400000, source: "manual" }));
        expectTripUntouched();
    });

    it("404 when there is no estimate yet", async () => {
        tripBudgetEstimateRepository.findByTrip.mockResolvedValue(null);
        await expect(tripBudgetService.updateEstimate(trip, USER, { categories: [] })).rejects.toMatchObject({ status: 404 });
    });

    it.each([
        ["no list", {}],
        ["an unknown category", { categories: [{ key: "shopping", amount: 1 }] }],
        ["a duplicated category", { categories: [{ key: "food", amount: 1 }, { key: "food", amount: 2 }] }],
        ["a negative amount", { categories: [{ key: "food", amount: -5 }] }],
        ["an amount that is not a number", { categories: [{ key: "food", amount: "5" }] }],
        ["null", null],
    ])("400 on %s and saves nothing", async (_name, body) => {
        tripBudgetEstimateRepository.findByTrip.mockResolvedValue(stored());
        await expect(tripBudgetService.updateEstimate(trip, USER, body)).rejects.toMatchObject({ status: 400 });
        expect(tripBudgetEstimateRepository.save).not.toHaveBeenCalled();
    });
});
