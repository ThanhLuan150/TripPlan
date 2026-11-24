import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/FavoriteTrip.js", () => ({
    default: { updateOne: vi.fn(), deleteOne: vi.fn(), find: vi.fn() },
}));

const { default: FavoriteTrip } = await import("../../../src/models/FavoriteTrip.js");
const { default: favoriteTripRepository } = await import("../../../src/repositories/favoriteTripRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("favoriteTripRepository", () => {
    it("adds with an upsert keyed by (user, trip) so there is never a duplicate", () => {
        favoriteTripRepository.add("u1", "t1");

        const [filter, update, options] = FavoriteTrip.updateOne.mock.calls[0];
        expect(filter).toEqual({ userId: "u1", tripId: "t1" });
        expect(update.$setOnInsert).toMatchObject({ userId: "u1", tripId: "t1" });
        expect(options).toEqual({ upsert: true });
    });

    it("removes only the row of that user", () => {
        favoriteTripRepository.remove("u1", "t1");
        expect(FavoriteTrip.deleteOne).toHaveBeenCalledWith({ userId: "u1", tripId: "t1" });
    });

    it("lists the user's favorites newest first with the trip populated", () => {
        const populate = vi.fn(() => "result");
        const sort = vi.fn(() => ({ populate }));
        FavoriteTrip.find.mockReturnValue({ sort });

        expect(favoriteTripRepository.findByUser("u1")).toBe("result");
        expect(FavoriteTrip.find).toHaveBeenCalledWith({ userId: "u1" });
        expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(populate).toHaveBeenCalledWith("tripId");
    });
});
