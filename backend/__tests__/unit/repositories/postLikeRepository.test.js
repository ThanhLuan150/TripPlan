import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/PostLike.js", () => ({
    default: { updateOne: vi.fn(), deleteOne: vi.fn(), exists: vi.fn(), countDocuments: vi.fn(), aggregate: vi.fn(), find: vi.fn() },
}));

const { default: PostLike } = await import("../../../src/models/PostLike.js");
const { default: postLikeRepository } = await import("../../../src/repositories/postLikeRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("postLikeRepository", () => {
    it("adds with an upsert keyed by (trip, user) so there is never a duplicate", async () => {
        await postLikeRepository.add("u", "t");

        const [filter, update, options] = PostLike.updateOne.mock.calls[0];
        expect(filter).toEqual({ tripId: "t", userId: "u" });
        expect(update.$setOnInsert).toMatchObject({ tripId: "t", userId: "u" });
        expect(options).toEqual({ upsert: true });
    });

    it("treats a duplicate key error (two requests at once) as already liked", async () => {
        PostLike.updateOne.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

        await expect(postLikeRepository.add("u", "t")).resolves.toBeUndefined();
    });

    it("rethrows any other database error", async () => {
        PostLike.updateOne.mockRejectedValue(new Error("down"));

        await expect(postLikeRepository.add("u", "t")).rejects.toThrow("down");
    });

    it("removes only that like", () => {
        postLikeRepository.remove("u", "t");
        expect(PostLike.deleteOne).toHaveBeenCalledWith({ tripId: "t", userId: "u" });
    });

    it("tells whether a like exists", async () => {
        PostLike.exists.mockResolvedValueOnce({ _id: "x" }).mockResolvedValueOnce(null);

        await expect(postLikeRepository.exists("u", "t")).resolves.toBe(true);
        await expect(postLikeRepository.exists("u", "t2")).resolves.toBe(false);
        expect(PostLike.exists).toHaveBeenCalledWith({ tripId: "t", userId: "u" });
    });

    it("counts the likes of one trip", async () => {
        PostLike.countDocuments.mockResolvedValue(4);

        await expect(postLikeRepository.countByTrip("t")).resolves.toBe(4);
        expect(PostLike.countDocuments).toHaveBeenCalledWith({ tripId: "t" });
    });

    it("counts a page of trips in one query and returns a map by trip id", async () => {
        PostLike.aggregate.mockResolvedValue([{ _id: "a", count: 2 }, { _id: "b", count: 1 }]);

        await expect(postLikeRepository.countByTrips(["a", "b", "c"])).resolves.toEqual({ a: 2, b: 1 });
        expect(PostLike.aggregate).toHaveBeenCalledTimes(1);
        expect(PostLike.aggregate.mock.calls[0][0][0]).toEqual({ $match: { tripId: { $in: ["a", "b", "c"] } } });
    });

    it("skips the database for an empty page", async () => {
        await expect(postLikeRepository.countByTrips([])).resolves.toEqual({});
        await expect(postLikeRepository.likedTripIds("u", [])).resolves.toEqual([]);
        expect(PostLike.aggregate).not.toHaveBeenCalled();
        expect(PostLike.find).not.toHaveBeenCalled();
    });

    it("lists which trips of a page the user liked, as strings", async () => {
        const lean = vi.fn().mockResolvedValue([{ tripId: 1 }, { tripId: 3 }]);
        PostLike.find.mockReturnValue({ select: () => ({ lean }) });

        await expect(postLikeRepository.likedTripIds("u", [1, 2, 3])).resolves.toEqual(["1", "3"]);
        expect(PostLike.find).toHaveBeenCalledWith({ userId: "u", tripId: { $in: [1, 2, 3] } });
    });
});
