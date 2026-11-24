import { beforeEach, describe, expect, it, vi } from "vitest";
import tripService from "../../../src/services/tripService.js";
import favoriteTripRepository from "../../../src/repositories/favoriteTripRepository.js";

vi.mock("../../../src/repositories/favoriteTripRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), findByUser: vi.fn() },
}));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: {} }));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: {} }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: {} }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const USER = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("favorite trips", () => {
    it("adds the trip for the user", async () => {
        favoriteTripRepository.add.mockResolvedValue({});

        const result = await tripService.addFavoriteTrip({ _id: "t1" }, USER);

        expect(favoriteTripRepository.add).toHaveBeenCalledWith(USER, "t1");
        expect(result).toEqual({ message: "Trip added to favorites", tripId: "t1", isFavorite: true });
    });

    it("adding twice goes through the idempotent upsert again (no duplicate, no error)", async () => {
        favoriteTripRepository.add.mockResolvedValue({});

        await tripService.addFavoriteTrip({ _id: "t1" }, USER);
        await expect(tripService.addFavoriteTrip({ _id: "t1" }, USER)).resolves.toMatchObject({ isFavorite: true });
        expect(favoriteTripRepository.add).toHaveBeenCalledTimes(2);
    });

    it("removes only the favorite of the user, even for an unknown / deleted trip", async () => {
        favoriteTripRepository.remove.mockResolvedValue({ deletedCount: 0 });

        const result = await tripService.removeFavoriteTrip("t1", USER);

        expect(favoriteTripRepository.remove).toHaveBeenCalledWith(USER, "t1");
        expect(result).toEqual({ message: "Trip removed from favorites", tripId: "t1", isFavorite: false });
    });

    it("lists the favorites of the user and leaves out deleted or missing trips", async () => {
        const active = { _id: "t1", userId: USER, status: "active" };
        favoriteTripRepository.findByUser.mockResolvedValue([
            { tripId: active },
            { tripId: { _id: "t2", userId: USER, status: "delete" } }, // deleted since
            { tripId: null }, // trip document gone
            { tripId: { _id: "t3", userId: OTHER, status: "active" } }, // not the user's trip
        ]);

        const result = await tripService.listFavoriteTrips(USER);

        expect(favoriteTripRepository.findByUser).toHaveBeenCalledWith(USER);
        expect(result).toEqual({ message: "Get Favorite Trips Successfully", dataTrip: [active] });
    });

    it("returns an empty list when nothing is favorite", async () => {
        favoriteTripRepository.findByUser.mockResolvedValue([]);

        await expect(tripService.listFavoriteTrips(USER)).resolves.toMatchObject({ dataTrip: [] });
    });
});
