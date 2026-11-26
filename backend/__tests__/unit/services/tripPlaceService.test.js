import { beforeEach, describe, expect, it, vi } from "vitest";
import tripPlaceService from "../../../src/services/tripPlaceService.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import { getLocationFromNameLocation } from "../../../src/utils/geocode.js";

vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), create: vi.fn() } }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({ default: { create: vi.fn() } }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const USER = "64b000000000000000000001";
const D1 = "64b0000000000000000000d1";
const D2 = "64b0000000000000000000d2";
const trip = { _id: "t1" };
const days = [{ _id: D1, title: "Ngày 1" }, { _id: D2, title: "Ngày 2" }];
const challengesByDay = { [D1]: [{ nameLocation: "Hồ Xuân Hương" }], [D2]: [] };
const body = (extra = {}) => ({ name: "Thác Datanla", dayId: D2, province: "Lâm Đồng", summary: "Thác nước", ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    tripDayRepository.findByTripId.mockResolvedValue(days);
    challengeRepository.findByTripDayId.mockImplementation(async (id) => challengesByDay[id]);
    challengeRepository.create.mockResolvedValue({ _id: "c9" });
    getLocationFromNameLocation.mockResolvedValue({ location: "Thác Datanla, Đà Lạt", latitude: 11.9, longitude: 108.4 });
});

const expectNothingWritten = () => {
    expect(challengeRepository.create).not.toHaveBeenCalled();
    expect(challengeProgressRepository.create).not.toHaveBeenCalled();
};

describe("addPlace", () => {
    it("adds a located place to the chosen day, with fresh progress", async () => {
        const result = await tripPlaceService.addPlace(trip, USER, body());

        expect(getLocationFromNameLocation).toHaveBeenCalledWith("Thác Datanla", "Lâm Đồng");
        expect(challengeRepository.create).toHaveBeenCalledWith({
            tripDayId: D2,
            challengeSummary: "Thác nước",
            nameLocation: "Thác Datanla",
            points: 10,
            location: "Thác Datanla, Đà Lạt",
            latitude: 11.9,
            longitude: 108.4,
        });
        expect(challengeProgressRepository.create).toHaveBeenCalledWith(USER, "c9");
        expect(result).toMatchObject({ challengeId: "c9", day: { id: D2, title: "Ngày 2" }, located: true });
    });

    it("still adds a place nobody could locate, as text, and says it has no position", async () => {
        getLocationFromNameLocation.mockResolvedValue(undefined);
        const result = await tripPlaceService.addPlace(trip, USER, body({ summary: "  " }));

        expect(challengeRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ location: "Thác Datanla, Lâm Đồng", challengeSummary: "Thác Datanla", latitude: undefined }),
        );
        expect(result.located).toBe(false);
    });

    it.each([
        ["no name", { name: "  " }],
        ["no day", { dayId: undefined }],
        ["a day id that is not an id", { dayId: "abc" }],
    ])("answers 400 for %s", async (_name, extra) => {
        await expect(tripPlaceService.addPlace(trip, USER, body(extra))).rejects.toMatchObject({ status: 400 });
        expectNothingWritten();
    });

    it("answers 404 for a day of another trip", async () => {
        await expect(tripPlaceService.addPlace(trip, USER, body({ dayId: "64b0000000000000000000ff" }))).rejects.toMatchObject({ status: 404 });
        expectNothingWritten();
    });

    it("answers 409 when the place is already in the trip (any day, any case)", async () => {
        await expect(tripPlaceService.addPlace(trip, USER, body({ name: " hồ xuân hương " }))).rejects.toMatchObject({
            status: 409,
            body: { code: "PLACE_ALREADY_IN_TRIP" },
        });
        expectNothingWritten();
    });

    it("answers 409 when the day is full", async () => {
        challengesByDay[D2] = Array.from({ length: 10 }, (_, i) => ({ nameLocation: `Nơi ${i}` }));
        await expect(tripPlaceService.addPlace(trip, USER, body())).rejects.toMatchObject({ status: 409, body: { code: "DAY_FULL" } });
        expectNothingWritten();
        challengesByDay[D2] = [];
    });

    it("does not write anything when the body is missing", async () => {
        await expect(tripPlaceService.addPlace(trip, USER)).rejects.toMatchObject({ status: 400 });
        expectNothingWritten();
    });
});
