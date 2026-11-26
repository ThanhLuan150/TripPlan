import TripAiProposal from "../models/TripAiProposal.js";

const create = (data) => TripAiProposal.create(data);

// Proposal of this trip made for this user (anything else -> null)
const findOwned = (id, tripId, userId) => TripAiProposal.findOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

const remove = (id, tripId, userId) => TripAiProposal.deleteOne({
    _id: { $eq: id },
    tripId: { $eq: tripId },
    userId: { $eq: userId },
});

// Once the itinerary changed, every older proposal of the trip is stale
const removeByTrip = (tripId) => TripAiProposal.deleteMany({ tripId });

export default { create, findOwned, remove, removeByTrip };
