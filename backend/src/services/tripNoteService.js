import tripNoteRepository from "../repositories/tripNoteRepository.js";
import HttpError from "../utils/HttpError.js";

export const MAX_NOTE_CONTENT = 2000;
export const MAX_NOTES_PER_TRIP = 50;

// Text of a note: a string, not empty after trimming, within the length limit.
const cleanContent = (content) => {
    if (typeof content !== "string") {
        throw new HttpError(400, "content must be a string");
    }
    const text = content.trim();
    if (!text) {
        throw new HttpError(400, "content must not be empty");
    }
    if (text.length > MAX_NOTE_CONTENT) {
        throw new HttpError(400, `content must be at most ${MAX_NOTE_CONTENT} characters`);
    }
    return text;
};

const view = (note) => ({
    _id: note._id,
    tripId: note.tripId,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
});

// trip: loaded by ownTrip (owned by the user, not deleted)
const listNotes = async (trip, userId) => {
    const notes = await tripNoteRepository.findByTrip(trip._id, userId);
    return { message: "Get trip notes successfully", tripId: trip._id, notes: notes.map(view) };
};

const createNote = async (trip, userId, content) => {
    const text = cleanContent(content);
    if ((await tripNoteRepository.countByTrip(trip._id, userId)) >= MAX_NOTES_PER_TRIP) {
        throw new HttpError(400, `A trip can have at most ${MAX_NOTES_PER_TRIP} notes`);
    }
    const note = await tripNoteRepository.create({ tripId: trip._id, userId, content: text });
    return { message: "Trip note created", note: view(note) };
};

// note: loaded by ownNote (belongs to this trip and this user)
const updateNote = async (note, content) => {
    const text = cleanContent(content);
    const updated = await tripNoteRepository.updateContent(note._id, text);
    return { message: "Trip note updated", note: view(updated) };
};

const deleteNote = async (note) => {
    await tripNoteRepository.remove(note._id);
    return { message: "Trip note deleted" };
};

export default { listNotes, createNote, updateNote, deleteNote };
