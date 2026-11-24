import FavoriteTrip from "../models/FavoriteTrip.js";

// Idempotent: adding twice keeps a single row (the unique index also guards races).
const add = (userId, tripId) =>
    FavoriteTrip.updateOne({ userId, tripId }, { $setOnInsert: { userId, tripId, createdAt: new Date() } }, { upsert: true });

const remove = (userId, tripId) => FavoriteTrip.deleteOne({ userId, tripId });

// Newest favorite first; tripId is populated, deleted trips are filtered by the service.
const findByUser = (userId) => FavoriteTrip.find({ userId }).sort({ createdAt: -1 }).populate("tripId");

export default { add, remove, findByUser };
