import { beforeEach, describe, expect, it, vi } from "vitest";
import tripNoteService, { MAX_NOTE_CONTENT, MAX_NOTES_PER_TRIP } from "../../../src/services/tripNoteService.js";
import tripNoteRepository from "../../../src/repositories/tripNoteRepository.js";

vi.mock("../../../src/repositories/tripNoteRepository.js", () => ({
    default: { findByTrip: vi.fn(), countByTrip: vi.fn(), create: vi.fn(), updateContent: vi.fn(), remove: vi.fn() },
}));

const TRIP = { _id: "64b0000000000000000000a1" };
const USER = "64b000000000000000000001";
const note = (extra = {}) => ({ _id: "n1", tripId: TRIP._id, userId: USER, content: "hello", createdAt: "c", updatedAt: "u", ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    tripNoteRepository.countByTrip.mockResolvedValue(0);
});

describe("trip note service", () => {
    it("lists the notes of the trip for the user, without the owner id", async () => {
        tripNoteRepository.findByTrip.mockResolvedValue([note()]);

        const res = await tripNoteService.listNotes(TRIP, USER);

        expect(tripNoteRepository.findByTrip).toHaveBeenCalledWith(TRIP._id, USER);
        expect(res.notes).toEqual([{ _id: "n1", tripId: TRIP._id, content: "hello", createdAt: "c", updatedAt: "u" }]);
    });

    it("creates a trimmed note linked to the trip and the user", async () => {
        tripNoteRepository.create.mockImplementation(async (data) => note(data));

        const res = await tripNoteService.createNote(TRIP, USER, "  Book the boat  ");

        expect(tripNoteRepository.create).toHaveBeenCalledWith({ tripId: TRIP._id, userId: USER, content: "Book the boat" });
        expect(res.note.content).toBe("Book the boat");
        expect(res.note).not.toHaveProperty("userId");
    });

    it.each([[undefined], [null], [""], ["   \n "], [5], [{ $ne: 1 }], [["a"]]])("rejects invalid content (%j)", async (content) => {
        await expect(tripNoteService.createNote(TRIP, USER, content)).rejects.toMatchObject({ status: 400 });
        await expect(tripNoteService.updateNote(note(), content)).rejects.toMatchObject({ status: 400 });
        expect(tripNoteRepository.create).not.toHaveBeenCalled();
        expect(tripNoteRepository.updateContent).not.toHaveBeenCalled();
    });

    it("accepts exactly the maximum length and rejects one more", async () => {
        tripNoteRepository.create.mockImplementation(async (data) => note(data));

        await expect(tripNoteService.createNote(TRIP, USER, "a".repeat(MAX_NOTE_CONTENT))).resolves.toBeDefined();
        await expect(tripNoteService.createNote(TRIP, USER, "a".repeat(MAX_NOTE_CONTENT + 1))).rejects.toMatchObject({ status: 400 });
    });

    it("refuses a new note once the trip has the maximum number", async () => {
        tripNoteRepository.countByTrip.mockResolvedValue(MAX_NOTES_PER_TRIP);

        await expect(tripNoteService.createNote(TRIP, USER, "one more")).rejects.toMatchObject({ status: 400 });
        expect(tripNoteRepository.create).not.toHaveBeenCalled();
    });

    it("updates the content of a note", async () => {
        tripNoteRepository.updateContent.mockResolvedValue(note({ content: "new" }));

        const res = await tripNoteService.updateNote(note(), " new ");

        expect(tripNoteRepository.updateContent).toHaveBeenCalledWith("n1", "new");
        expect(res.note.content).toBe("new");
    });

    it("deletes a note", async () => {
        const res = await tripNoteService.deleteNote(note());

        expect(tripNoteRepository.remove).toHaveBeenCalledWith("n1");
        expect(res.message).toMatch(/deleted/);
    });
});
