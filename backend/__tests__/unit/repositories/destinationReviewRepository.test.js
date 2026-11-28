import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/DestinationReview.js", () => ({
    default: {
        findById: vi.fn(), findOne: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn(), deleteOne: vi.fn(),
        find: vi.fn(), countDocuments: vi.fn(), aggregate: vi.fn(),
    },
}));

const { default: DestinationReview } = await import("../../../src/models/DestinationReview.js");
const { default: repo } = await import("../../../src/repositories/destinationReviewRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("destinationReviewRepository", () => {
    it("finds a review by id and by (user, destination)", () => {
        repo.findById("r");
        repo.findByUser("u", "Hà Giang");

        expect(DestinationReview.findById).toHaveBeenCalledWith("r");
        expect(DestinationReview.findOne).toHaveBeenCalledWith({ userId: "u", destination: "Hà Giang" });
    });

    it("creates and deletes by id", () => {
        repo.create({ a: 1 });
        repo.deleteById("r");

        expect(DestinationReview.create).toHaveBeenCalledWith({ a: 1 });
        expect(DestinationReview.deleteOne).toHaveBeenCalledWith({ _id: "r" });
    });

    it("updates only the given fields and stamps the update date", () => {
        repo.updateById("r", { rating: 3 });

        const [id, update, options] = DestinationReview.findByIdAndUpdate.mock.calls[0];
        expect(id).toBe("r");
        expect(update.$set).toMatchObject({ rating: 3 });
        expect(update.$set.updatedAt).toBeInstanceOf(Date);
        expect(options).toEqual({ new: true });
    });

    it("lists one page of a destination, newest first, with the author's public name", async () => {
        const lean = vi.fn().mockResolvedValue([{ _id: 1 }]);
        const populate = vi.fn(() => ({ lean }));
        const limit = vi.fn(() => ({ populate }));
        const skip = vi.fn(() => ({ limit }));
        const sort = vi.fn(() => ({ skip }));
        DestinationReview.find.mockReturnValue({ sort });

        await expect(repo.listByDestination("Hà Giang", 10, 5)).resolves.toEqual([{ _id: 1 }]);
        expect(DestinationReview.find).toHaveBeenCalledWith({ destination: "Hà Giang" });
        expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(skip).toHaveBeenCalledWith(10);
        expect(limit).toHaveBeenCalledWith(5);
        expect(populate).toHaveBeenCalledWith("userId", "username image");
    });

    it("counts the reviews of a destination", () => {
        repo.countByDestination("Hà Giang");
        expect(DestinationReview.countDocuments).toHaveBeenCalledWith({ destination: "Hà Giang" });
    });

    it("computes the average and the count in the database over every review of the destination", async () => {
        DestinationReview.aggregate.mockResolvedValue([{ _id: null, average: 4.25, count: 4 }]);

        await expect(repo.summarize("Hà Giang")).resolves.toEqual({ average: 4.25, count: 4 });
        expect(DestinationReview.aggregate).toHaveBeenCalledWith([
            { $match: { destination: "Hà Giang" } },
            { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
        ]);
    });

    it("summarizes a destination without reviews as no average and zero", async () => {
        DestinationReview.aggregate.mockResolvedValue([]);

        await expect(repo.summarize("Hà Giang")).resolves.toEqual({ average: null, count: 0 });
    });
});

describe("destinationReviewRepository: admin panel", () => {
    it("lists the newest reviews of every destination", async () => {
        const lean = vi.fn().mockResolvedValue([{ _id: 1 }]);
        const limit = vi.fn(() => ({ lean }));
        const sort = vi.fn(() => ({ limit }));
        DestinationReview.find.mockReturnValue({ sort });

        await expect(repo.listRecent(1000)).resolves.toEqual([{ _id: 1 }]);
        expect(DestinationReview.find).toHaveBeenCalledWith({});
        expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(limit).toHaveBeenCalledWith(1000);
    });

    it("counts all the reviews, the ones of a period and the ones of a user", () => {
        const from = new Date("2026-01-01");
        const to = new Date("2026-02-01");
        repo.countAll();
        repo.countBetween(from, to);
        repo.countByUser("u1");

        expect(DestinationReview.countDocuments.mock.calls).toEqual([[{}], [{ createdAt: { $gte: from, $lt: to } }], [{ userId: "u1" }]]);
    });
});
