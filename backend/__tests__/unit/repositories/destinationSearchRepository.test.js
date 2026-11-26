import { beforeEach, describe, expect, it, vi } from "vitest";
import DestinationSearch from "../../../src/models/DestinationSearch.js";
import repo from "../../../src/repositories/destinationSearchRepository.js";
import { query as chain } from "../../helpers/mongoose.js";

vi.mock("../../../src/models/DestinationSearch.js", () => ({
    default: { create: vi.fn(), find: vi.fn(), findOne: vi.fn(), findOneAndUpdate: vi.fn(), deleteOne: vi.fn(), deleteMany: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());

describe("destinationSearchRepository", () => {
    it("creates a search", () => {
        repo.create({ query: "x" });
        expect(DestinationSearch.create).toHaveBeenCalledWith({ query: "x" });
    });

    it("lists only the user's searches, newest first, optionally one group", async () => {
        const query = chain([{ _id: "s" }]);
        DestinationSearch.find.mockReturnValue(query);

        await repo.listByUser("u", "draft", 30);
        expect(DestinationSearch.find).toHaveBeenCalledWith({ userId: { $eq: "u" }, status: { $eq: "draft" } });
        expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(query.limit).toHaveBeenCalledWith(30);

        await repo.listByUser("u", undefined, 30);
        expect(DestinationSearch.find).toHaveBeenLastCalledWith({ userId: { $eq: "u" } });
    });

    it("finds, updates and removes only a search of the same user", () => {
        DestinationSearch.findOne.mockReturnValue(chain(null));
        DestinationSearch.findOneAndUpdate.mockReturnValue(chain(null));
        repo.findOwned("s", "u");
        repo.updateOwned("s", "u", { status: "created" });
        repo.removeOwned("s", "u");
        expect(DestinationSearch.findOne).toHaveBeenCalledWith({ _id: { $eq: "s" }, userId: { $eq: "u" } });
        expect(DestinationSearch.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: { $eq: "s" }, userId: { $eq: "u" } },
            { $set: expect.objectContaining({ status: "created", updatedAt: expect.any(Date) }) },
            { new: true },
        );
        expect(DestinationSearch.deleteOne).toHaveBeenCalledWith({ _id: { $eq: "s" }, userId: { $eq: "u" } });
    });

    it("keeps only the newest searches of the user", async () => {
        DestinationSearch.find.mockReturnValue(chain([{ _id: "old1" }, { _id: "old2" }]));
        await repo.trim("u", 30);
        expect(DestinationSearch.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["old1", "old2"] } });

        DestinationSearch.find.mockReturnValue(chain([]));
        DestinationSearch.deleteMany.mockClear();
        await repo.trim("u", 30);
        expect(DestinationSearch.deleteMany).not.toHaveBeenCalled();
    });
});
