import SavedPost from "../models/SavedPost.js";

// Idempotent: saving twice keeps a single row. Two requests at the same moment may both try
// the insert; the unique index rejects the second one (E11000), which also means "already saved".
const add = async (userId, tripId) => {
    try {
        await SavedPost.updateOne({ userId, tripId }, { $setOnInsert: { userId, tripId, createdAt: new Date() } }, { upsert: true });
    } catch (err) {
        if (err?.code !== 11000) {
            throw err;
        }
    }
};

const remove = (userId, tripId) => SavedPost.deleteOne({ userId, tripId });

const exists = async (userId, tripId) => Boolean(await SavedPost.exists({ userId, tripId }));

// Every trip id the user saved, newest save first (as strings).
const tripIdsByUser = async (userId) => {
    const rows = await SavedPost.find({ userId }).sort({ createdAt: -1, _id: -1 }).select("tripId").lean();
    return rows.map((row) => String(row.tripId));
};

// Which of these trips the user saved (as strings).
const savedTripIds = async (userId, tripIds) => {
    if (tripIds.length === 0) {
        return [];
    }
    const rows = await SavedPost.find({ userId, tripId: { $in: tripIds } }).select("tripId").lean();
    return rows.map((row) => String(row.tripId));
};

// How many users saved each of these posts: { tripId: count } (one query for the whole page).
const countByTrips = async (tripIds) => {
    if (tripIds.length === 0) {
        return {};
    }
    const rows = await SavedPost.aggregate([{ $match: { tripId: { $in: tripIds } } }, { $group: { _id: "$tripId", count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
};

export default { countByTrips, add, remove, exists, tripIdsByUser, savedTripIds };
