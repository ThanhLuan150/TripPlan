import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/SavedPost.js", () => ({
    default: { updateOne: vi.fn(), deleteOne: vi.fn(), exists: vi.fn(), find: vi.fn() },
}));

const { default: SavedPost } = await import("../../../src/models/SavedPost.js");
const { default: savedPostRepository } = await import("../../../src/repositories/savedPostRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("savedPostRepository", () => {
    it("adds with an upsert keyed by (user, trip) so there is never a duplicate", async () => {
        await savedPostRepository.add("u", "t");

        const [filter, update, options] = SavedPost.updateOne.mock.calls[0];
        expect(filter).toEqual({ userId: "u", tripId: "t" });
        expect(update.$setOnInsert).toMatchObject({ userId: "u", tripId: "t" });
        expect(options).toEqual({ upsert: true });
    });

    it("treats a duplicate key error (two requests at once) as already saved", async () => {
        SavedPost.updateOne.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

        await expect(savedPostRepository.add("u", "t")).resolves.toBeUndefined();
    });

    it("rethrows any other database error", async () => {
        SavedPost.updateOne.mockRejectedValue(new Error("down"));

        await expect(savedPostRepository.add("u", "t")).rejects.toThrow("down");
    });

    it("removes only that user's row", () => {
        savedPostRepository.remove("u", "t");
        expect(SavedPost.deleteOne).toHaveBeenCalledWith({ userId: "u", tripId: "t" });
    });

    it("tells whether a post is saved", async () => {
        SavedPost.exists.mockResolvedValueOnce({ _id: "x" }).mockResolvedValueOnce(null);

        await expect(savedPostRepository.exists("u", "t")).resolves.toBe(true);
        await expect(savedPostRepository.exists("u", "t2")).resolves.toBe(false);
        expect(SavedPost.exists).toHaveBeenCalledWith({ userId: "u", tripId: "t" });
    });

    it("lists the trip ids of one user, newest first, as strings", async () => {
        const lean = vi.fn().mockResolvedValue([{ tripId: 2 }, { tripId: 1 }]);
        const sort = vi.fn(() => ({ select: () => ({ lean }) }));
        SavedPost.find.mockReturnValue({ sort });

        await expect(savedPostRepository.tripIdsByUser("u")).resolves.toEqual(["2", "1"]);
        expect(SavedPost.find).toHaveBeenCalledWith({ userId: "u" });
        expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    });

    it("lists which trips of a page the user saved, as strings", async () => {
        const lean = vi.fn().mockResolvedValue([{ tripId: 1 }, { tripId: 3 }]);
        SavedPost.find.mockReturnValue({ select: () => ({ lean }) });

        await expect(savedPostRepository.savedTripIds("u", [1, 2, 3])).resolves.toEqual(["1", "3"]);
        expect(SavedPost.find).toHaveBeenCalledWith({ userId: "u", tripId: { $in: [1, 2, 3] } });
    });

    it("skips the database for an empty page", async () => {
        await expect(savedPostRepository.savedTripIds("u", [])).resolves.toEqual([]);
        expect(SavedPost.find).not.toHaveBeenCalled();
    });
});
