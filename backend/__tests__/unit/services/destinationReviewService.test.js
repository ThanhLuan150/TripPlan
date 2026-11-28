import { beforeEach, describe, expect, it, vi } from "vitest";
import service from "../../../src/services/destinationReviewService.js";
import repo from "../../../src/repositories/destinationReviewRepository.js";

vi.mock("../../../src/repositories/destinationReviewRepository.js", () => ({
    default: {
        findById: vi.fn(), findByUser: vi.fn(), create: vi.fn(), updateById: vi.fn(), deleteById: vi.fn(),
        listByDestination: vi.fn(), countByDestination: vi.fn(), summarize: vi.fn(),
    },
}));

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const REVIEW = "64b0000000000000000000e1";
const actor = { _id: ME };
const DEST = "Hà Giang";

const stored = (extra = {}) => ({ _id: REVIEW, destination: DEST, userId: ME, rating: 4, content: "Đẹp", createdAt: new Date(), updatedAt: new Date(), ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    repo.findByUser.mockResolvedValue(null);
    repo.summarize.mockResolvedValue({ average: 4, count: 1 });
    repo.listByDestination.mockResolvedValue([]);
    repo.countByDestination.mockResolvedValue(0);
});

describe("create", () => {
    it("stores a valid review of the caller and answers with the new average", async () => {
        repo.create.mockImplementation(async (data) => stored(data));
        repo.summarize.mockResolvedValue({ average: 4.333, count: 3 });

        const result = await service.create(actor, { destination: ` ${DEST} `, rating: "4", content: "  Đẹp  " });

        expect(repo.create).toHaveBeenCalledWith({ destination: DEST, userId: ME, rating: 4, content: "Đẹp" });
        expect(result.review).toMatchObject({ rating: 4, content: "Đẹp", mine: true });
        expect(result.summary).toEqual({ average: 4.3, count: 3 });
    });

    it("never takes the author from the body", async () => {
        repo.create.mockImplementation(async (data) => stored(data));

        await service.create(actor, { destination: DEST, rating: 5, content: "ok", userId: OTHER });

        expect(repo.create.mock.calls[0][0].userId).toBe(ME);
    });

    it.each([[undefined], [""], ["Atlantis"], ["hà giang"], [{ $ne: "x" }], [["Hà Giang"]], [5]])("answers 404 for the destination %j", async (destination) => {
        await expect(service.create(actor, { destination, rating: 4, content: "x" })).rejects.toMatchObject({ status: 404, message: "Destination not found" });
        expect(repo.create).not.toHaveBeenCalled();
    });

    it.each([[0], [6], [4.5], [-1], ["abc"], [""], [null], [undefined], [{ $gt: 1 }], [NaN]])("rejects the rating %j (outside the 1-5 scale)", async (rating) => {
        await expect(service.create(actor, { destination: DEST, rating, content: "x" })).rejects.toMatchObject({ status: 400 });
        expect(repo.create).not.toHaveBeenCalled();
    });

    it.each([[1], [5], ["3"]])("accepts the rating %j", async (rating) => {
        repo.create.mockImplementation(async (data) => stored(data));
        await expect(service.create(actor, { destination: DEST, rating, content: "x" })).resolves.toBeDefined();
    });

    it.each([[undefined], [""], ["   "], [5], [{}], ["a".repeat(1001)]])("rejects the comment %j", async (content) => {
        await expect(service.create(actor, { destination: DEST, rating: 4, content })).rejects.toMatchObject({ status: 400 });
        expect(repo.create).not.toHaveBeenCalled();
    });

    it("answers 409 when the user already reviewed the destination (one review per destination)", async () => {
        repo.findByUser.mockResolvedValue(stored());

        await expect(service.create(actor, { destination: DEST, rating: 4, content: "x" })).rejects.toMatchObject({ status: 409 });
        expect(repo.findByUser).toHaveBeenCalledWith(ME, DEST);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it("answers 409 when two requests race and the unique index rejects the second", async () => {
        repo.create.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

        await expect(service.create(actor, { destination: DEST, rating: 4, content: "x" })).rejects.toMatchObject({ status: 409 });
    });

    it("rethrows any other database error", async () => {
        repo.create.mockRejectedValue(new Error("down"));

        await expect(service.create(actor, { destination: DEST, rating: 4, content: "x" })).rejects.toThrow("down");
    });
});

describe("list", () => {
    it("answers the page, the total and the average of ALL the reviews", async () => {
        repo.listByDestination.mockResolvedValue([
            stored({ userId: { _id: OTHER, username: "linh", image: "i.png" } }),
            stored({ _id: "r2", userId: { _id: ME, username: "me" } }),
        ]);
        repo.countByDestination.mockResolvedValue(25);
        repo.summarize.mockResolvedValue({ average: 3.666, count: 25 });
        repo.findByUser.mockResolvedValue(stored({ _id: "r2" }));

        const result = await service.list({ ...actor, username: "me" }, { destination: DEST, page: "2", limit: "10" });

        expect(repo.listByDestination).toHaveBeenCalledWith(DEST, 10, 10);
        expect(result).toMatchObject({ destination: DEST, page: 2, limit: 10, total: 25, summary: { average: 3.7, count: 25 }, myReview: expect.objectContaining({ _id: "r2", mine: true, author: expect.objectContaining({ username: "me" }) }) });
        expect(result.items[0]).toMatchObject({ author: { _id: OTHER, username: "linh", image: "i.png" }, mine: false });
        expect(result.items[1]).toMatchObject({ mine: true });
    });

    it("an anonymous visitor has no review of their own and nothing is looked up for them", async () => {
        repo.listByDestination.mockResolvedValue([stored({ userId: { _id: OTHER, username: "linh" } })]);

        const result = await service.list(null, { destination: DEST });

        expect(repo.findByUser).not.toHaveBeenCalled();
        expect(result.myReview).toBeNull();
        expect(result.items[0].mine).toBe(false);
    });

    it("never exposes more of the author than the public name, id and picture", async () => {
        repo.listByDestination.mockResolvedValue([stored({ userId: { _id: OTHER, username: "linh", email: "x@y.z", password: "hash" } })]);

        const [item] = (await service.list(null, { destination: DEST })).items;

        expect(Object.keys(item.author).sort()).toEqual(["_id", "image", "username"]);
    });

    it("answers an empty list and no average for a destination without reviews", async () => {
        repo.summarize.mockResolvedValue({ average: null, count: 0 });

        expect(await service.list(null, { destination: DEST })).toMatchObject({ total: 0, items: [], summary: { average: null, count: 0 } });
    });

    it("rounds the average to one decimal", async () => {
        repo.summarize.mockResolvedValue({ average: 4.25, count: 4 });
        expect((await service.list(null, { destination: DEST })).summary.average).toBe(4.3);
        repo.summarize.mockResolvedValue({ average: 3.04, count: 5 });
        expect((await service.list(null, { destination: DEST })).summary.average).toBe(3);
    });

    it("falls back to safe paging whatever the query holds", async () => {
        for (const query of [{ page: "0", limit: "-5" }, { page: { $gt: 1 }, limit: ["x"] }, { page: "abc", limit: "100000" }]) {
            const result = await service.list(null, { destination: DEST, ...query });
            expect(result.page).toBeGreaterThanOrEqual(1);
            expect(result.limit).toBeGreaterThanOrEqual(1);
            expect(result.limit).toBeLessThanOrEqual(50);
        }
    });

    it.each([[undefined], ["Atlantis"], [{ $ne: "x" }]])("answers 404 for the destination %j", async (destination) => {
        await expect(service.list(null, { destination })).rejects.toMatchObject({ status: 404 });
        expect(repo.listByDestination).not.toHaveBeenCalled();
    });
});

describe("update", () => {
    it("lets the author change the rating and the comment and answers the new average", async () => {
        repo.findById.mockResolvedValue(stored());
        repo.updateById.mockImplementation(async (id, data) => stored(data));
        repo.summarize.mockResolvedValue({ average: 2, count: 1 });

        const result = await service.update(actor, REVIEW, { rating: 2, content: " Tạm " });

        expect(repo.updateById).toHaveBeenCalledWith(REVIEW, { rating: 2, content: "Tạm" });
        expect(result.review).toMatchObject({ rating: 2, content: "Tạm" });
        expect(result.summary).toEqual({ average: 2, count: 1 });
    });

    it("changes only what was sent, and never the destination or the author", async () => {
        repo.findById.mockResolvedValue(stored());
        repo.updateById.mockImplementation(async (id, data) => stored(data));

        await service.update(actor, REVIEW, { rating: 5, destination: "Hà Nội", userId: OTHER });

        expect(repo.updateById).toHaveBeenCalledWith(REVIEW, { rating: 5 });
    });

    it("answers 403 for somebody else's review and changes nothing", async () => {
        repo.findById.mockResolvedValue(stored({ userId: OTHER }));

        await expect(service.update(actor, REVIEW, { rating: 1 })).rejects.toMatchObject({ status: 403 });
        expect(repo.updateById).not.toHaveBeenCalled();
    });

    it.each([["malformed id", "abc"], ["undefined id", undefined]])("answers 404 for a %s without a query", async (_n, id) => {
        await expect(service.update(actor, id, { rating: 1 })).rejects.toMatchObject({ status: 404 });
        expect(repo.findById).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown review", async () => {
        repo.findById.mockResolvedValue(null);

        await expect(service.update(actor, REVIEW, { rating: 1 })).rejects.toMatchObject({ status: 404 });
    });

    it("validates the new values and refuses an empty change", async () => {
        repo.findById.mockResolvedValue(stored());

        await expect(service.update(actor, REVIEW, { rating: 9 })).rejects.toMatchObject({ status: 400 });
        await expect(service.update(actor, REVIEW, { content: "  " })).rejects.toMatchObject({ status: 400 });
        await expect(service.update(actor, REVIEW, {})).rejects.toMatchObject({ status: 400, message: "Nothing to update" });
        expect(repo.updateById).not.toHaveBeenCalled();
    });
});

describe("remove", () => {
    it("lets the author delete the review and answers the new average", async () => {
        repo.findById.mockResolvedValue(stored());
        repo.summarize.mockResolvedValue({ average: null, count: 0 });

        const result = await service.remove(actor, REVIEW);

        expect(repo.deleteById).toHaveBeenCalledWith(REVIEW);
        expect(result.summary).toEqual({ average: null, count: 0 });
    });

    it("answers 403 for somebody else's review and deletes nothing", async () => {
        repo.findById.mockResolvedValue(stored({ userId: OTHER }));

        await expect(service.remove(actor, REVIEW)).rejects.toMatchObject({ status: 403 });
        expect(repo.deleteById).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown or malformed id", async () => {
        repo.findById.mockResolvedValue(null);

        await expect(service.remove(actor, REVIEW)).rejects.toMatchObject({ status: 404 });
        await expect(service.remove(actor, "abc")).rejects.toMatchObject({ status: 404 });
        expect(repo.deleteById).not.toHaveBeenCalled();
    });
});
