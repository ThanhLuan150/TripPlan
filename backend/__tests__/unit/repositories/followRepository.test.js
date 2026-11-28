import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/Follow.js", () => ({
    default: { updateOne: vi.fn(), deleteOne: vi.fn(), exists: vi.fn(), countDocuments: vi.fn() },
}));

const { default: Follow } = await import("../../../src/models/Follow.js");
const { default: followRepository } = await import("../../../src/repositories/followRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("followRepository", () => {
    it("adds with an upsert keyed by (follower, following) so there is never a duplicate", () => {
        followRepository.add("a", "b");

        const [filter, update, options] = Follow.updateOne.mock.calls[0];
        expect(filter).toEqual({ followerId: "a", followingId: "b" });
        expect(update.$setOnInsert).toMatchObject({ followerId: "a", followingId: "b" });
        expect(options).toEqual({ upsert: true });
    });

    it("removes only that relation", () => {
        followRepository.remove("a", "b");
        expect(Follow.deleteOne).toHaveBeenCalledWith({ followerId: "a", followingId: "b" });
    });

    it("tells whether a relation exists", async () => {
        Follow.exists.mockResolvedValueOnce({ _id: "x" }).mockResolvedValueOnce(null);

        await expect(followRepository.exists("a", "b")).resolves.toBe(true);
        await expect(followRepository.exists("a", "c")).resolves.toBe(false);
        expect(Follow.exists).toHaveBeenCalledWith({ followerId: "a", followingId: "b" });
    });

    it("counts followers and following", async () => {
        Follow.countDocuments.mockResolvedValue(3);

        await expect(followRepository.countFollowers("u")).resolves.toBe(3);
        expect(Follow.countDocuments).toHaveBeenCalledWith({ followingId: "u" });
        await followRepository.countFollowing("u");
        expect(Follow.countDocuments).toHaveBeenLastCalledWith({ followerId: "u" });
    });
});
