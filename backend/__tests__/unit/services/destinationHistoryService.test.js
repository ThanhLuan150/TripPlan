import { beforeEach, describe, expect, it, vi } from "vitest";
import destinationHistoryService from "../../../src/services/destinationHistoryService.js";
import destinationSearchRepository from "../../../src/repositories/destinationSearchRepository.js";

vi.mock("../../../src/repositories/destinationSearchRepository.js", () => ({
    default: { listByUser: vi.fn(), findOwned: vi.fn(), updateOwned: vi.fn(), removeOwned: vi.fn() },
}));

const USER = "64b000000000000000000001";
const ID = "64b0000000000000000000e1";
const search = (extra = {}) => ({
    _id: ID,
    query: "Nơi mát mẻ",
    interests: ["núi"],
    region: "Lâm Đồng",
    budget: "3 triệu",
    recommendations: ["A", "B", "C", "D"].map((name) => ({ name, description: "d", reason: "r", inApp: false })),
    status: "draft",
    createdAt: new Date("2026-03-01"),
    ...extra,
});

beforeEach(() => vi.resetAllMocks());

describe("list", () => {
    it("returns summaries of the user's suggestions, with the first names and the count", async () => {
        destinationSearchRepository.listByUser.mockResolvedValue([search()]);

        const result = await destinationHistoryService.list(USER, "draft");

        expect(destinationSearchRepository.listByUser).toHaveBeenCalledWith(USER, "draft", 30);
        expect(result.items).toEqual([
            expect.objectContaining({ id: ID, query: "Nơi mát mẻ", count: 4, names: ["A", "B", "C"], status: "draft", tripId: undefined }),
        ]);
        expect(result.items[0].recommendations).toBeUndefined();
    });

    it("lists both groups without a status and rejects an unknown one", async () => {
        destinationSearchRepository.listByUser.mockResolvedValue([]);
        await destinationHistoryService.list(USER);
        expect(destinationSearchRepository.listByUser).toHaveBeenCalledWith(USER, undefined, 30);
        await expect(destinationHistoryService.list(USER, "other")).rejects.toMatchObject({ status: 400 });
        await expect(destinationHistoryService.list(USER, { $ne: "x" })).rejects.toMatchObject({ status: 400 });
    });
});

describe("get", () => {
    it("returns one suggestion with its places", async () => {
        destinationSearchRepository.findOwned.mockResolvedValue(search({ tripId: "64b0000000000000000000a1" }));
        const { search: found } = await destinationHistoryService.get(USER, ID);
        expect(destinationSearchRepository.findOwned).toHaveBeenCalledWith(ID, USER);
        expect(found.recommendations).toHaveLength(4);
        expect(found.tripId).toBe("64b0000000000000000000a1");
    });

    it("answers 404 for a missing, foreign or malformed id", async () => {
        destinationSearchRepository.findOwned.mockResolvedValue(null);
        await expect(destinationHistoryService.get(USER, ID)).rejects.toMatchObject({ status: 404 });
        await expect(destinationHistoryService.get(USER, "abc")).rejects.toMatchObject({ status: 404 });
    });
});

describe("update", () => {
    it("marks a suggestion as created, optionally with its trip", async () => {
        destinationSearchRepository.updateOwned.mockResolvedValue(search({ status: "created" }));
        const result = await destinationHistoryService.update(USER, ID, { status: "created", tripId: "64b0000000000000000000a1" });
        expect(destinationSearchRepository.updateOwned).toHaveBeenCalledWith(ID, USER, { status: "created", tripId: "64b0000000000000000000a1" });
        expect(result.search.status).toBe("created");
    });

    it.each([[undefined], [{}], [{ status: "x" }], [{ status: "created", tripId: "no" }]])("answers 400 for %j", async (body) => {
        await expect(destinationHistoryService.update(USER, ID, body)).rejects.toMatchObject({ status: 400 });
        expect(destinationSearchRepository.updateOwned).not.toHaveBeenCalled();
    });

    it("answers 404 for a missing, foreign or malformed id", async () => {
        destinationSearchRepository.updateOwned.mockResolvedValue(null);
        await expect(destinationHistoryService.update(USER, ID, { status: "draft" })).rejects.toMatchObject({ status: 404 });
        await expect(destinationHistoryService.update(USER, "abc", { status: "draft" })).rejects.toMatchObject({ status: 404 });
    });
});

describe("remove", () => {
    it("deletes only the user's own suggestion", async () => {
        destinationSearchRepository.removeOwned.mockResolvedValue({ deletedCount: 1 });
        await destinationHistoryService.remove(USER, ID);
        expect(destinationSearchRepository.removeOwned).toHaveBeenCalledWith(ID, USER);
    });

    it("answers 404 when there is nothing to delete or the id is malformed", async () => {
        destinationSearchRepository.removeOwned.mockResolvedValue({ deletedCount: 0 });
        await expect(destinationHistoryService.remove(USER, ID)).rejects.toMatchObject({ status: 404 });
        await expect(destinationHistoryService.remove(USER, "abc")).rejects.toMatchObject({ status: 404 });
    });
});
