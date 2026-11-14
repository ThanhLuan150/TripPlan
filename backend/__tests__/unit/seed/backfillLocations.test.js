import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../../helpers/mongoose.js";

const mocks = vi.hoisted(() => ({
    Challenge: { find: vi.fn(), updateOne: vi.fn() },
    TripDay: { findById: vi.fn() },
    TripPlan: { findById: vi.fn() },
    geocode: vi.fn(),
}));

vi.mock("../../../src/models/Challenge.js", () => ({ default: mocks.Challenge }));
vi.mock("../../../src/models/TripDay.js", () => ({ default: mocks.TripDay }));
vi.mock("../../../src/models/TripPlan.js", () => ({ default: mocks.TripPlan }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: mocks.geocode }));

const { default: backfillLocations } = await import("../../../src/seed/backfillLocations.js");

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("backfillLocations", () => {
    it("looks for challenges without coordinates and gives them the place found in the trip's province", async () => {
        mocks.Challenge.find.mockReturnValue(query([
            { _id: "c1", nameLocation: "Hồ Xuân Hương", tripDayId: "d1" },
            { _id: "c2", nameLocation: "Nơi không có", tripDayId: "gone" },
            { _id: "c3", nameLocation: "Không tìm thấy", tripDayId: "d1" },
        ]));
        mocks.TripDay.findById.mockImplementation((id) => query(id === "d1" ? { tripId: "t1" } : null));
        mocks.TripPlan.findById.mockReturnValue(query({ location: "Lâm Đồng" }));
        mocks.geocode.mockImplementation(async (name) => (name === "Không tìm thấy" ? undefined : { latitude: 11.94, longitude: 108.44 }));

        await backfillLocations({ delayMs: 0 });

        const [filter] = mocks.Challenge.find.mock.calls[0];
        expect(filter.$or).toContainEqual({ latitude: { $exists: false } });
        expect(mocks.geocode).toHaveBeenNthCalledWith(1, "Hồ Xuân Hương", "Lâm Đồng");
        // a challenge whose day is gone is looked up without a province
        expect(mocks.geocode).toHaveBeenNthCalledWith(2, "Nơi không có", "");
        expect(mocks.Challenge.updateOne).toHaveBeenCalledTimes(2);
        expect(mocks.Challenge.updateOne).toHaveBeenCalledWith({ _id: "c1" }, { $set: { latitude: 11.94, longitude: 108.44 } });
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("2 of 3"));
    });

    it("does nothing when every challenge has its coordinates", async () => {
        mocks.Challenge.find.mockReturnValue(query([]));

        await backfillLocations();

        expect(mocks.geocode).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("0 of 0"));
    });
});
