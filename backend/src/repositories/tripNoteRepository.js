import TripNote from "../models/TripNote.js";

// Every query is scoped to the trip AND the user: a note of someone else never matches.
const findByTrip = (tripId, userId) => TripNote.find({ tripId, userId }).sort({ createdAt: -1, _id: -1 });

const countByTrip = (tripId, userId) => TripNote.countDocuments({ tripId, userId });

const findOwned = (id, tripId, userId) => TripNote.findOne({ _id: id, tripId, userId });

const create = (data) => TripNote.create(data);

const updateContent = (id, content) =>
    TripNote.findByIdAndUpdate(id, { $set: { content, updatedAt: new Date() } }, { new: true });

const remove = (id) => TripNote.findByIdAndDelete(id);

export default { findByTrip, countByTrip, findOwned, create, updateContent, remove };
