import { beforeEach, describe, expect, it, vi } from "vitest";
import postLikeService from "../../../src/services/postLikeService.js";
import postLikeRepository from "../../../src/repositories/postLikeRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { findPublicById: vi.fn() } }));
vi.mock("../../../src/repositories/postLikeRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), countByTrip: vi.fn(), countByTrips: vi.fn(), likedTripIds: vi.fn() },
}));

const ME = "64b000000000000000000001";
const POST = "64b0000000000000000000a1";
const actor = { _id: ME };

beforeEach(() => {
    vi.resetAllMocks();
    tripPlanRepository.findPublicById.mockResolvedValue({ _id: POST, visibility: "public" });
    postLikeRepository.exists.mockResolvedValue(false);
    postLikeRepository.countByTrip.mockResolvedValue(0);
});

describe("like", () => {
    it("stores the like of the caller and returns the new state and count", async () => {
        postLikeRepository.exists.mockResolvedValue(true);
        postLikeRepository.countByTrip.mockResolvedValue(5);

        const result = await postLikeService.like(actor, POST);

        expect(postLikeRepository.add).toHaveBeenCalledWith(ME, POST);
        expect(result).toMatchObject({ liked: true, likesCount: 5 });
    });

    it.each([["malformed id", "abc"], ["undefined id", undefined]])("answers 404 for a %s", async (_n, id) => {
        await expect(postLikeService.like(actor, id)).rejects.toMatchObject({ status: 404 });
        expect(tripPlanRepository.findPublicById).not.toHaveBeenCalled();
        expect(postLikeRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 for a post that is private, deleted or unknown and writes nothing", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);

        await expect(postLikeService.like(actor, POST)).rejects.toMatchObject({ status: 404 });
        expect(postLikeRepository.add).not.toHaveBeenCalled();
    });
});

describe("unlike", () => {
    it("removes only the caller's like and returns the new state and count", async () => {
        postLikeRepository.countByTrip.mockResolvedValue(2);

        const result = await postLikeService.unlike(actor, POST);

        expect(postLikeRepository.remove).toHaveBeenCalledWith(ME, POST);
        expect(result).toMatchObject({ liked: false, likesCount: 2 });
    });

    it("is idempotent: unliking a post you did not like still answers with the real state", async () => {
        const result = await postLikeService.unlike(actor, POST);

        expect(result).toMatchObject({ liked: false, likesCount: 0 });
    });

    it("answers 404 for a malformed id without touching the database", async () => {
        await expect(postLikeService.unlike(actor, "abc")).rejects.toMatchObject({ status: 404 });
        expect(postLikeRepository.remove).not.toHaveBeenCalled();
    });

    it("still removes the like when the post is gone, then answers 404", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);

        await expect(postLikeService.unlike(actor, POST)).rejects.toMatchObject({ status: 404 });
        expect(postLikeRepository.remove).toHaveBeenCalledWith(ME, POST);
    });
});

describe("getState", () => {
    it("is never liked for a visitor who is not signed in", async () => {
        postLikeRepository.countByTrip.mockResolvedValue(7);

        await expect(postLikeService.getState(null, POST)).resolves.toEqual({ liked: false, likesCount: 7 });
        expect(postLikeRepository.exists).not.toHaveBeenCalled();
    });

    it("tells a signed-in viewer whether they liked the post", async () => {
        postLikeRepository.exists.mockResolvedValue(true);
        postLikeRepository.countByTrip.mockResolvedValue(1);

        await expect(postLikeService.getState(actor, POST)).resolves.toEqual({ liked: true, likesCount: 1 });
    });
});

describe("decorate", () => {
    const items = [{ _id: "a", nameTrip: "A" }, { _id: "b" }, { _id: "c" }];

    it("adds counts and the viewer's likes to every card with two queries", async () => {
        postLikeRepository.countByTrips.mockResolvedValue({ a: 3, c: 1 });
        postLikeRepository.likedTripIds.mockResolvedValue(["c"]);

        const result = await postLikeService.decorate(actor, items);

        expect(result).toEqual([
            { _id: "a", nameTrip: "A", likesCount: 3, liked: false },
            { _id: "b", likesCount: 0, liked: false },
            { _id: "c", likesCount: 1, liked: true },
        ]);
        expect(postLikeRepository.likedTripIds).toHaveBeenCalledWith(ME, ["a", "b", "c"]);
    });

    it("never asks which posts a visitor liked when nobody is signed in", async () => {
        postLikeRepository.countByTrips.mockResolvedValue({ a: 2 });

        const result = await postLikeService.decorate(null, items);

        expect(result.every((item) => item.liked === false)).toBe(true);
        expect(result[0].likesCount).toBe(2);
        expect(postLikeRepository.likedTripIds).not.toHaveBeenCalled();
    });
});
