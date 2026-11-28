import { beforeEach, describe, expect, it, vi } from "vitest";
import savedPostService from "../../../src/services/savedPostService.js";
import savedPostRepository from "../../../src/repositories/savedPostRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({
    default: { findPublicById: vi.fn(), findPublicIdsIn: vi.fn(), listPublicByIds: vi.fn() },
}));
vi.mock("../../../src/repositories/savedPostRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), tripIdsByUser: vi.fn(), savedTripIds: vi.fn() },
}));

const ME = "64b000000000000000000001";
const POST = "64b0000000000000000000a1";
const actor = { _id: ME };

beforeEach(() => {
    vi.resetAllMocks();
    tripPlanRepository.findPublicById.mockResolvedValue({ _id: POST, visibility: "public" });
});

describe("save", () => {
    it("stores the save of the caller and answers saved", async () => {
        const result = await savedPostService.save(actor, POST);

        expect(savedPostRepository.add).toHaveBeenCalledWith(ME, POST);
        expect(result).toMatchObject({ saved: true });
    });

    it.each([["malformed id", "abc"], ["undefined id", undefined]])("answers 404 for a %s", async (_n, id) => {
        await expect(savedPostService.save(actor, id)).rejects.toMatchObject({ status: 404 });
        expect(tripPlanRepository.findPublicById).not.toHaveBeenCalled();
        expect(savedPostRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 for a post that is private, deleted or unknown and writes nothing", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);

        await expect(savedPostService.save(actor, POST)).rejects.toMatchObject({ status: 404 });
        expect(savedPostRepository.add).not.toHaveBeenCalled();
    });
});

describe("unsave", () => {
    it("removes only the caller's save and answers not saved", async () => {
        const result = await savedPostService.unsave(actor, POST);

        expect(savedPostRepository.remove).toHaveBeenCalledWith(ME, POST);
        expect(result).toMatchObject({ saved: false });
    });

    it("answers 404 for a malformed id without touching the database", async () => {
        await expect(savedPostService.unsave(actor, "abc")).rejects.toMatchObject({ status: 404 });
        expect(savedPostRepository.remove).not.toHaveBeenCalled();
    });

    it("still removes the save when the post is gone, then answers 404", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);

        await expect(savedPostService.unsave(actor, POST)).rejects.toMatchObject({ status: 404 });
        expect(savedPostRepository.remove).toHaveBeenCalledWith(ME, POST);
    });
});

describe("listSaved", () => {
    it("answers an empty list (without more queries) when nothing is saved", async () => {
        savedPostRepository.tripIdsByUser.mockResolvedValue([]);

        const result = await savedPostService.listSaved(actor, {});

        expect(result).toMatchObject({ page: 1, limit: 12, total: 0, items: [] });
        expect(tripPlanRepository.findPublicIdsIn).not.toHaveBeenCalled();
        expect(tripPlanRepository.listPublicByIds).not.toHaveBeenCalled();
    });

    it("reads only the caller's saves, newest save first, marked saved", async () => {
        savedPostRepository.tripIdsByUser.mockResolvedValue(["c", "a", "b"]);
        tripPlanRepository.findPublicIdsIn.mockResolvedValue(["a", "b", "c"]);
        tripPlanRepository.listPublicByIds.mockResolvedValue([{ _id: "a" }, { _id: "b" }, { _id: "c" }]);

        const result = await savedPostService.listSaved(actor, {});

        expect(savedPostRepository.tripIdsByUser).toHaveBeenCalledWith(ME);
        expect(result.items.map((i) => i._id)).toEqual(["c", "a", "b"]);
        expect(result.items.every((i) => i.saved === true)).toBe(true);
        expect(result.total).toBe(3);
    });

    it("leaves out posts that were deleted or are no longer public", async () => {
        savedPostRepository.tripIdsByUser.mockResolvedValue(["a", "gone", "b"]);
        tripPlanRepository.findPublicIdsIn.mockResolvedValue(["a", "b"]);
        tripPlanRepository.listPublicByIds.mockResolvedValue([{ _id: "a" }, { _id: "b" }]);

        const result = await savedPostService.listSaved(actor, {});

        expect(result.items.map((i) => i._id)).toEqual(["a", "b"]);
        expect(result.total).toBe(2);
        expect(tripPlanRepository.listPublicByIds).toHaveBeenCalledWith(["a", "b"]);
    });

    it("pages the visible posts and clamps bad paging values", async () => {
        savedPostRepository.tripIdsByUser.mockResolvedValue(["a", "b", "c"]);
        tripPlanRepository.findPublicIdsIn.mockResolvedValue(["a", "b", "c"]);
        tripPlanRepository.listPublicByIds.mockImplementation(async (ids) => ids.map((_id) => ({ _id })));

        const second = await savedPostService.listSaved(actor, { page: "2", limit: "2" });
        expect(second).toMatchObject({ page: 2, limit: 2, total: 3 });
        expect(second.items.map((i) => i._id)).toEqual(["c"]);

        expect(await savedPostService.listSaved(actor, { page: "-4", limit: "9999" })).toMatchObject({ page: 1, limit: 50 });
        expect(await savedPostService.listSaved(actor, { page: "x", limit: "y" })).toMatchObject({ page: 1, limit: 12 });
    });

    it("answers an empty page beyond the last one", async () => {
        savedPostRepository.tripIdsByUser.mockResolvedValue(["a"]);
        tripPlanRepository.findPublicIdsIn.mockResolvedValue(["a"]);

        const result = await savedPostService.listSaved(actor, { page: "5" });

        expect(result).toMatchObject({ total: 1, items: [] });
        expect(tripPlanRepository.listPublicByIds).not.toHaveBeenCalled();
    });
});

describe("getState", () => {
    it("is never saved for a visitor who is not signed in", async () => {
        await expect(savedPostService.getState(null, POST)).resolves.toEqual({ saved: false });
        expect(savedPostRepository.exists).not.toHaveBeenCalled();
    });

    it("tells a signed-in viewer whether they saved the post", async () => {
        savedPostRepository.exists.mockResolvedValue(true);

        await expect(savedPostService.getState(actor, POST)).resolves.toEqual({ saved: true });
    });
});

describe("decorate", () => {
    const items = [{ _id: "a", nameTrip: "A" }, { _id: "b" }];

    it("adds the viewer's saves to every card with one query", async () => {
        savedPostRepository.savedTripIds.mockResolvedValue(["b"]);

        const result = await savedPostService.decorate(actor, items);

        expect(result).toEqual([{ _id: "a", nameTrip: "A", saved: false }, { _id: "b", saved: true }]);
        expect(savedPostRepository.savedTripIds).toHaveBeenCalledWith(ME, ["a", "b"]);
    });

    it("never asks anything when nobody is signed in", async () => {
        const result = await savedPostService.decorate(null, items);

        expect(result.every((item) => item.saved === false)).toBe(true);
        expect(savedPostRepository.savedTripIds).not.toHaveBeenCalled();
    });
});
