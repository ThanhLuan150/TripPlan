import { beforeEach, describe, expect, it, vi } from "vitest";
import TripDayProposal from "../../../src/models/TripDayProposal.js";
import repo from "../../../src/repositories/tripDayProposalRepository.js";

vi.mock("../../../src/models/TripDayProposal.js", async (importOriginal) => {
    const original = await importOriginal();
    Object.assign(original.default, { create: vi.fn(), findOne: vi.fn(), deleteOne: vi.fn(), deleteMany: vi.fn() });
    return original;
});

beforeEach(() => vi.clearAllMocks());

describe("tripDayProposalRepository", () => {
    it("finds and removes a proposal only for its trip and its user", () => {
        repo.findOwned("p", "t", "u");
        repo.remove("p", "t", "u");

        const scope = { _id: { $eq: "p" }, tripId: { $eq: "t" }, userId: { $eq: "u" } };
        expect(TripDayProposal.findOne).toHaveBeenCalledWith(scope);
        expect(TripDayProposal.deleteOne).toHaveBeenCalledWith(scope);
    });

    it("creates a proposal and removes the proposals of a day", () => {
        repo.create({ dayId: "d" });
        repo.removeByDay("d");
        expect(TripDayProposal.create).toHaveBeenCalledWith({ dayId: "d" });
        expect(TripDayProposal.deleteMany).toHaveBeenCalledWith({ dayId: "d" });
    });

    it("expires a proposal after an hour", () => {
        expect(TripDayProposal.schema.path("createdAt").options.expires).toBe(3600);
    });
});
