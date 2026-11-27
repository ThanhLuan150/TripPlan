import TripRouteProposal from "../models/TripRouteProposal.js";

const create = (data) => TripRouteProposal.create(data);

// Proposal of this trip made for this user (anything else -> null)
const findOwned = (id, tripId, userId) => TripRouteProposal.findOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

const remove = (id, tripId, userId) => TripRouteProposal.deleteOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

// Once a day was reordered, older proposals of that day are stale
const removeByDay = (dayId) => TripRouteProposal.deleteMany({ dayId });

export default { create, findOwned, remove, removeByDay };
