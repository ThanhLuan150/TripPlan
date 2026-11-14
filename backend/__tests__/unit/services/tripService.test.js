import { beforeEach, describe, expect, it, vi } from "vitest";
import tripService from "../../../src/services/tripService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import { getResponseText, startChat } from "../../../src/utils/gemini.js";
import { getLocationFromNameLocation } from "../../../src/utils/geocode.js";
import { doc } from "../../helpers/http.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({
    default: {
        findOverlapping: vi.fn(),
        existsActiveWithName: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        findActiveByUser: vi.fn(),
        softDelete: vi.fn(),
    },
}));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { create: vi.fn(), findByTripId: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({
    default: { create: vi.fn(), findByTripDayId: vi.fn(), findFirstByTripDayId: vi.fn() },
}));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({
    default: { create: vi.fn(), findByUserAndChallenges: vi.fn() },
}));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const USER = "64b000000000000000000001";
const sendMessage = vi.fn();

const form = {
    location: "Lâm Đồng",
    numberOfPeople: 2,
    budget: "5.000.000 VND",
    interest: "thiên nhiên",
    numberOfDay: 2,
    userLocation: "Quận 1",
};

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    tripPlanRepository.findOverlapping.mockResolvedValue([]);
});

describe("generatePlans", () => {
    it("refuses dates that overlap one of the user's trips", async () => {
        tripPlanRepository.findOverlapping.mockResolvedValue([{ _id: "t1" }]);

        await expect(tripService.generatePlans(USER, { ...form, startDate: "2026-03-01", endDate: "2026-03-03" })).rejects.toMatchObject({
            status: 400,
        });
        expect(tripPlanRepository.findOverlapping).toHaveBeenCalledWith(USER, "2026-03-01", "2026-03-03");
        expect(startChat).not.toHaveBeenCalled();
    });

    it("skips the overlap check without dates", async () => {
        getResponseText.mockReturnValue("{}");

        await tripService.generatePlans(USER, form);

        expect(tripPlanRepository.findOverlapping).not.toHaveBeenCalled();
    });

    it("sends the trip form in the prompt", async () => {
        getResponseText.mockReturnValue("{}");

        await tripService.generatePlans(USER, form);

        expect(startChat).toHaveBeenCalledWith({ maxOutputTokens: 14348 });
        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Địa điểm:Lâm Đồng");
        expect(prompt).toContain("Ngân sách: 5.000.000 VND");
        expect(prompt).toContain("ĐẦY ĐỦ 2 ngày");
        expect(prompt).not.toContain("Ghi chú");
    });

    it("adds the user's note, trimmed, capped and without breaking the quotes", async () => {
        getResponseText.mockReturnValue("{}");
        const note = `  Muốn ghé """Thung lũng Tình Yêu"""  ${"x".repeat(2000)}`;

        await tripService.generatePlans(USER, { ...form, note });

        const prompt = sendMessage.mock.calls[0][0];
        expect(prompt).toContain("Ghi chú / gợi ý của tôi");
        expect(prompt).toContain("'''Thung lũng Tình Yêu'''");
        const quoted = prompt.match(/"""([\s\S]*?)"""/)[1];
        expect(quoted.length).toBe(1500);
        expect(quoted.startsWith("Muốn ghé")).toBe(true);
    });

    it("extracts the JSON even when the model wraps it in text or code fences", async () => {
        getResponseText.mockReturnValue('Đây là kế hoạch:\n```json\n{"plan1":{"day1":{"title":"Đà Lạt"}}}\n```');

        await expect(tripService.generatePlans(USER, form)).resolves.toEqual({
            message: "Create the plan successfully",
            data: { plan1: { day1: { title: "Đà Lạt" } } },
        });
    });

    it("answers 502 when the model returns no usable JSON", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});

        getResponseText.mockReturnValue("Xin lỗi, tôi không thể giúp.");
        await expect(tripService.generatePlans(USER, form)).rejects.toMatchObject({ status: 502 });

        getResponseText.mockReturnValue("{ not: json, }");
        await expect(tripService.generatePlans(USER, form)).rejects.toMatchObject({ status: 502 });
    });

    it("returns a soft error when the model gives no text at all", async () => {
        getResponseText.mockReturnValue(null);

        await expect(tripService.generatePlans(USER, form)).resolves.toEqual({
            message: "An error occurred while creating the trip plan, try again",
        });
    });
});

describe("saveTrip", () => {
    // local time, so the day of week is the same whatever the machine's timezone
    const startDate = "2026-03-02T12:00:00"; // Monday
    const jsonTrip = {
        day1: {
            title: "Trung tâm Đà Lạt",
            transportCost: 100000,
            foodCost: 200000,
            otherCost: 50000,
            activities: [
                { challenge_summary: "Chụp ảnh bên hồ", name_location: "Hồ Xuân Hương", province: "Lâm Đồng", level_of_difficult: 20 },
                { challenge_summary: "Ăn bánh tráng nướng", name_location: "Chợ Đà Lạt", province: "Lâm Đồng", level_of_difficult: 10 },
            ],
        },
        day2: {
            title: "Langbiang",
            activities: [{ challenge_summary: "Leo núi", name_location: "Langbiang", province: "Lâm Đồng", level_of_difficult: 80 }],
        },
    };
    const body = { jsonTrip, location: "Lâm Đồng", startDate, endDate: "2026-03-03T12:00:00", nameTrip: "Đà Lạt mộng mơ" };

    beforeEach(() => {
        tripPlanRepository.existsActiveWithName.mockResolvedValue(false);
        tripPlanRepository.create.mockResolvedValue({ _id: "trip1" });
        tripDayRepository.create.mockImplementation(async (day) => ({ _id: `day${day.day}` }));
        challengeRepository.create.mockImplementation(async (c) => ({ _id: `cha-${c.nameLocation}` }));
        getLocationFromNameLocation.mockImplementation(async (name) =>
            name === "Hồ Xuân Hương" ? { latitude: 11.94, longitude: 108.44, location: "Hồ Xuân Hương, Đà Lạt" } : undefined,
        );
    });

    it("needs the plan and a name", async () => {
        await expect(tripService.saveTrip(USER, { ...body, jsonTrip: undefined })).rejects.toMatchObject({ status: 400 });
        await expect(tripService.saveTrip(USER, { ...body, nameTrip: "" })).rejects.toMatchObject({ status: 400 });
        expect(tripPlanRepository.create).not.toHaveBeenCalled();
    });

    it("refuses a second active trip with the same name", async () => {
        tripPlanRepository.existsActiveWithName.mockResolvedValue(true);

        await expect(tripService.saveTrip(USER, body)).rejects.toMatchObject({
            status: 400,
            message: "A trip with the same name already exists",
        });
        expect(tripPlanRepository.existsActiveWithName).toHaveBeenCalledWith(USER, "Đà Lạt mộng mơ");
    });

    it("saves the trip, one day per entry with its date and weekday", async () => {
        const result = await tripService.saveTrip(USER, body);

        expect(result).toEqual({ message: "Trip plan saved successfully", tripId: "trip1" });
        expect(tripPlanRepository.create).toHaveBeenCalledWith({
            userId: USER,
            startDate,
            endDate: body.endDate,
            location: "Lâm Đồng",
            nameTrip: "Đà Lạt mộng mơ",
        });

        const days = tripDayRepository.create.mock.calls.map(([d]) => d);
        expect(days).toHaveLength(2);
        expect(days[0]).toMatchObject({ tripId: "trip1", day: 0, title: "Trung tâm Đà Lạt", dayOfWeek: "Thứ 2", transportCost: 100000 });
        expect(days[1]).toMatchObject({ day: 1, title: "Langbiang", dayOfWeek: "Thứ 3", transportCost: 0, foodCost: 0, otherCost: 0 });
        expect(days[1].date.getDate()).toBe(3);
    });

    it("creates a challenge (with coordinates when found) and a progress per activity", async () => {
        await tripService.saveTrip(USER, body);

        const challenges = challengeRepository.create.mock.calls.map(([c]) => c);
        expect(challenges).toHaveLength(3);
        expect(challenges[0]).toEqual({
            tripDayId: "day0",
            challengeSummary: "Chụp ảnh bên hồ",
            nameLocation: "Hồ Xuân Hương",
            location: "Hồ Xuân Hương, Đà Lạt",
            latitude: 11.94,
            longitude: 108.44,
            points: 20,
        });
        // not found by HERE: still saved, with a readable location and no coordinates
        expect(challenges[1]).toMatchObject({ location: "Chợ Đà Lạt, Lâm Đồng", latitude: undefined, longitude: undefined });
        expect(challenges[2]).toMatchObject({ tripDayId: "day1", points: 80 });

        expect(challengeProgressRepository.create.mock.calls).toEqual([
            [USER, "cha-Hồ Xuân Hương"],
            [USER, "cha-Chợ Đà Lạt"],
            [USER, "cha-Langbiang"],
        ]);
    });

    it("stores the cost totals of all days", async () => {
        await tripService.saveTrip(USER, body);

        expect(tripPlanRepository.updateById).toHaveBeenCalledWith("trip1", {
            transportCostTotal: 100000,
            foodCostTotal: 200000,
            otherCostTotal: 50000,
        });
    });

    it("accepts a day without activities", async () => {
        await tripService.saveTrip(USER, { ...body, jsonTrip: { day1: { title: "Nghỉ ngơi" } } });

        expect(tripDayRepository.create).toHaveBeenCalledOnce();
        expect(challengeRepository.create).not.toHaveBeenCalled();
    });
});

describe("reading and deleting trips", () => {
    const trip = doc({ _id: "trip1", userId: USER, nameTrip: "Đà Lạt" });

    it("lists the user's active trips", async () => {
        tripPlanRepository.findActiveByUser.mockResolvedValue([{ _id: "trip1" }]);

        await expect(tripService.listTrips(USER)).resolves.toEqual({ message: "Get Trip Successfully", dataTrip: [{ _id: "trip1" }] });
        expect(tripPlanRepository.findActiveByUser).toHaveBeenCalledWith(USER);
    });

    it("returns the trip with its days, challenges and the user's progress (no internal ids)", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([doc({ _id: "day0", tripId: "trip1", day: 0, title: "Ngày 1" })]);
        challengeRepository.findByTripDayId.mockResolvedValue([
            doc({ _id: "c1", tripDayId: "day0", nameLocation: "Hồ Xuân Hương" }),
            doc({ _id: "c2", tripDayId: "day0", nameLocation: "Chợ Đà Lạt" }),
        ]);
        challengeProgressRepository.findByUserAndChallenges.mockResolvedValue([{ chaId: "c1", completed: true }]);

        const result = await tripService.getTripDetail(trip, USER);

        expect(challengeProgressRepository.findByUserAndChallenges).toHaveBeenCalledWith(USER, ["c1", "c2"]);
        expect(result).toEqual({
            message: "Get Data Detail Trip Successfully",
            tripDatas: {
                _id: "trip1",
                nameTrip: "Đà Lạt",
                dataTripDays: [
                    {
                        _id: "day0",
                        day: 0,
                        title: "Ngày 1",
                        challenges: [
                            { _id: "c1", nameLocation: "Hồ Xuân Hương", completed: true },
                            { _id: "c2", nameLocation: "Chợ Đà Lạt", completed: false },
                        ],
                    },
                ],
            },
        });
    });

    it("soft-deletes a trip", async () => {
        await expect(tripService.deleteTrip(trip)).resolves.toEqual({ message: "Trip deleted successfully" });
        expect(tripPlanRepository.softDelete).toHaveBeenCalledWith("trip1");
    });

    it("returns the first challenge location of each day, skipping empty days", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d0", day: 0 }, { _id: "d1", day: 1 }]);
        challengeRepository.findFirstByTripDayId.mockImplementation(async (id) =>
            id === "d0" ? { location: "Hồ Xuân Hương", latitude: 11.94, longitude: 108.44 } : null,
        );

        await expect(tripService.getTripLocations(trip)).resolves.toEqual({
            message: "Get location successfully",
            result: [{ day: 0, location: "Hồ Xuân Hương", latitude: 11.94, longitude: 108.44 }],
        });
    });
});
