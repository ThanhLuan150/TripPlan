import tripNoteService from "../services/tripNoteService.js";
import asyncHandler from "../utils/asyncHandler.js";

const listNotes = asyncHandler(async (req, res) => {
    res.status(200).json(await tripNoteService.listNotes(req.trip, req.user._id));
});

const createNote = asyncHandler(async (req, res) => {
    res.status(201).json(await tripNoteService.createNote(req.trip, req.user._id, req.body?.content));
});

const updateNote = asyncHandler(async (req, res) => {
    res.status(200).json(await tripNoteService.updateNote(req.note, req.body?.content));
});

const deleteNote = asyncHandler(async (req, res) => {
    res.status(200).json(await tripNoteService.deleteNote(req.note));
});

export default { listNotes, createNote, updateNote, deleteNote };
