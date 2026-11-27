import TripDayProposal from "../models/TripDayProposal.js";

const create = (data) => TripDayProposal.create(data);

// Proposal of this trip made for this user (anything else -> null)
const findOwned = (id, tripId, userId) => TripDayProposal.findOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

const remove = (id, tripId, userId) => TripDayProposal.deleteOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

// Once a day was replaced, older proposals of that day are stale
const removeByDay = (dayId) => TripDayProposal.deleteMany({ dayId });

export default { create, findOwned, remove, removeByDay };
