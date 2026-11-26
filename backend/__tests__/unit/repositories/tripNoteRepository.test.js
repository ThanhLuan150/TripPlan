import { beforeEach, describe, expect, it, vi } from "vitest";
import TripNote from "../../../src/models/TripNote.js";
import repo from "../../../src/repositories/tripNoteRepository.js";

vi.mock("../../../src/models/TripNote.js", () => ({
    default: { find: vi.fn(), countDocuments: vi.fn(), findOne: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn(), findByIdAndDelete: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());

describe("tripNoteRepository", () => {
    it("every lookup is scoped to the trip and the user", () => {
        const sort = vi.fn();
        TripNote.find.mockReturnValue({ sort });

        repo.findByTrip("t", "u");
        repo.countByTrip("t", "u");
        repo.findOwned("n", "t", "u");

        expect(TripNote.find).toHaveBeenCalledWith({ tripId: "t", userId: "u" });
        expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(TripNote.countDocuments).toHaveBeenCalledWith({ tripId: "t", userId: "u" });
        expect(TripNote.findOne).toHaveBeenCalledWith({ _id: "n", tripId: "t", userId: "u" });
    });

    it("creates, updates the content (and the update date) and removes", () => {
        repo.create({ content: "x" });
        repo.updateContent("n", "y");
        repo.remove("n");

        expect(TripNote.create).toHaveBeenCalledWith({ content: "x" });
        const [id, update, options] = TripNote.findByIdAndUpdate.mock.calls[0];
        expect(id).toBe("n");
        expect(update.$set.content).toBe("y");
        expect(update.$set.updatedAt).toBeInstanceOf(Date);
        expect(options).toEqual({ new: true });
        expect(TripNote.findByIdAndDelete).toHaveBeenCalledWith("n");
    });
});
