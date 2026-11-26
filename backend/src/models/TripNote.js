import mongoose from "mongoose";

// A private note the user wrote on one of their trips. Several notes per trip are allowed.
// Notes are never copied with a trip and never part of a shared / public view.
const TripNoteSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", required: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// "notes of this trip of this user", newest first
TripNoteSchema.index({ tripId: 1, userId: 1, createdAt: -1 });

const TripNote = mongoose.model("TripNote", TripNoteSchema);

export default TripNote;
