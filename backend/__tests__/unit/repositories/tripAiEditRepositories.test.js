// Repositories used by AI itinerary editing: every query is scoped as the service expects.
import { beforeEach, describe, expect, it, vi } from "vitest";
import TripAiProposal from "../../../src/models/TripAiProposal.js";
import TripDay from "../../../src/models/TripDay.js";
import Challenge from "../../../src/models/Challenge.js";
import UserChallengeProgress from "../../../src/models/UserChallengeProgress.js";
import proposalRepo from "../../../src/repositories/tripAiProposalRepository.js";
import tripDayRepo from "../../../src/repositories/tripDayRepository.js";
import challengeRepo from "../../../src/repositories/challengeRepository.js";
import progressRepo from "../../../src/repositories/challengeProgressRepository.js";

vi.mock("../../../src/models/TripAiProposal.js", () => ({
    default: { create: vi.fn(), findOne: vi.fn(), deleteOne: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("../../../src/models/TripDay.js", () => ({ default: { findByIdAndUpdate: vi.fn() } }));
vi.mock("../../../src/models/Challenge.js", () => ({ default: { findByIdAndUpdate: vi.fn(), deleteMany: vi.fn() } }));
vi.mock("../../../src/models/UserChallengeProgress.js", () => ({ default: { deleteMany: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

describe("tripAiProposalRepository", () => {
    it("creates a proposal", () => {
        proposalRepo.create({ tripId: "t" });
        expect(TripAiProposal.create).toHaveBeenCalledWith({ tripId: "t" });
    });

    it("finds and removes a proposal only for its trip and its user", () => {
        proposalRepo.findOwned("p", "t", "u");
        proposalRepo.remove("p", "t", "u");

        const scope = { _id: { $eq: "p" }, tripId: { $eq: "t" }, userId: { $eq: "u" } };
        expect(TripAiProposal.findOne).toHaveBeenCalledWith(scope);
        expect(TripAiProposal.deleteOne).toHaveBeenCalledWith(scope);
    });

    it("removes every proposal of a trip", () => {
        proposalRepo.removeByTrip("t");
        expect(TripAiProposal.deleteMany).toHaveBeenCalledWith({ tripId: "t" });
    });
});

describe("repositories used to apply an accepted proposal", () => {
    it("updates a day with $set only", () => {
        tripDayRepo.updateById("d", { title: "x" });
        expect(TripDay.findByIdAndUpdate).toHaveBeenCalledWith("d", { $set: { title: "x" } }, { new: true });
    });

    it("updates a challenge with $set and deletes challenges by id", () => {
        challengeRepo.updateById("c", { points: 10 });
        challengeRepo.deleteByIds(["c1", "c2"]);

        expect(Challenge.findByIdAndUpdate).toHaveBeenCalledWith("c", { $set: { points: 10 } }, { new: true });
        expect(Challenge.deleteMany).toHaveBeenCalledWith({ _id: { $in: ["c1", "c2"] } });
    });

    it("deletes the progress of the given challenges", () => {
        progressRepo.deleteByChallengeIds(["c1"]);
        expect(UserChallengeProgress.deleteMany).toHaveBeenCalledWith({ chaId: { $in: ["c1"] } });
    });
});
