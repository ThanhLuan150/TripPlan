import { beforeEach, describe, expect, it, vi } from "vitest";
import TripRouteProposal from "../../../src/models/TripRouteProposal.js";
import repo from "../../../src/repositories/tripRouteProposalRepository.js";
import challengeRepo from "../../../src/repositories/challengeRepository.js";
import Challenge from "../../../src/models/Challenge.js";

vi.mock("../../../src/models/TripRouteProposal.js", async (importOriginal) => {
    const original = await importOriginal();
    Object.assign(original.default, { create: vi.fn(), findOne: vi.fn(), deleteOne: vi.fn(), deleteMany: vi.fn() });
    return original;
});
vi.mock("../../../src/models/Challenge.js", async (importOriginal) => {
    const original = await importOriginal();
    original.default.find = vi.fn();
    return original;
});

beforeEach(() => vi.clearAllMocks());

describe("tripRouteProposalRepository", () => {
    it("finds and removes a proposal only for its trip and its user", () => {
        repo.findOwned("p", "t", "u");
        repo.remove("p", "t", "u");

        const scope = { _id: { $eq: "p" }, tripId: { $eq: "t" }, userId: { $eq: "u" } };
        expect(TripRouteProposal.findOne).toHaveBeenCalledWith(scope);
        expect(TripRouteProposal.deleteOne).toHaveBeenCalledWith(scope);
    });

    it("creates a proposal and removes the proposals of a day", () => {
        repo.create({ dayId: "d" });
        repo.removeByDay("d");
        expect(TripRouteProposal.create).toHaveBeenCalledWith({ dayId: "d" });
        expect(TripRouteProposal.deleteMany).toHaveBeenCalledWith({ dayId: "d" });
    });

    it("expires a proposal after an hour", () => {
        expect(TripRouteProposal.schema.path("createdAt").options.expires).toBe(3600);
    });
});

describe("challengeRepository visiting order", () => {
    const list = (...items) => Challenge.find.mockResolvedValue(items);

    it("lists the places with an order first (by it), then the ones without, oldest first", async () => {
        list({ _id: "n1" }, { _id: "b", order: 1 }, { _id: "n2" }, { _id: "a", order: 0 });
        expect((await challengeRepo.findByTripDayId("d")).map((c) => c._id)).toEqual(["a", "b", "n1", "n2"]);
        expect(Challenge.find).toHaveBeenCalledWith({ tripDayId: "d" });
    });

    it("keeps the stored order of places that have none (older trips)", async () => {
        list({ _id: "1" }, { _id: "2" }, { _id: "3" });
        expect((await challengeRepo.findByTripDayId("d")).map((c) => c._id)).toEqual(["1", "2", "3"]);
    });

    it("gives the first place of the day in that order", async () => {
        list({ _id: "x" }, { _id: "y", order: 0 });
        expect((await challengeRepo.findFirstByTripDayId("d"))._id).toBe("y");
        list();
        expect(await challengeRepo.findFirstByTripDayId("d")).toBeNull();
    });
});
