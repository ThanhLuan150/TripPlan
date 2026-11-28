import PostLike from "../models/PostLike.js";

// Idempotent: liking twice keeps a single row. Two requests at the same moment may both try
// the insert; the unique index rejects the second one (E11000), which also means "already liked".
const add = async (userId, tripId) => {
    try {
        await PostLike.updateOne({ tripId, userId }, { $setOnInsert: { tripId, userId, createdAt: new Date() } }, { upsert: true });
    } catch (err) {
        if (err?.code !== 11000) {
            throw err;
        }
    }
};

const remove = (userId, tripId) => PostLike.deleteOne({ tripId, userId });

const exists = async (userId, tripId) => Boolean(await PostLike.exists({ tripId, userId }));

const countByTrip = (tripId) => PostLike.countDocuments({ tripId });

// { tripId: count } for a page of trips, in one query.
const countByTrips = async (tripIds) => {
    if (tripIds.length === 0) {
        return {};
    }
    const rows = await PostLike.aggregate([{ $match: { tripId: { $in: tripIds } } }, { $group: { _id: "$tripId", count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
};

// Which of these trips the user liked (as strings).
const likedTripIds = async (userId, tripIds) => {
    if (tripIds.length === 0) {
        return [];
    }
    const rows = await PostLike.find({ userId, tripId: { $in: tripIds } }).select("tripId").lean();
    return rows.map((row) => String(row.tripId));
};

export default { add, remove, exists, countByTrip, countByTrips, likedTripIds };
