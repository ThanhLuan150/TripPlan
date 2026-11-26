import TripAiProposal from "../models/TripAiProposal.js";

const create = (data) => TripAiProposal.create(data);

// Proposal of this trip made for this user (anything else -> null)
const findOwned = (id, tripId, userId) => TripAiProposal.findOne({ _id: id, tripId, userId });

const remove = (id, tripId, userId) => TripAiProposal.deleteOne({ _id: id, tripId, userId });

// Once the itinerary changed, every older proposal of the trip is stale
const removeByTrip = (tripId) => TripAiProposal.deleteMany({ tripId });

export default { create, findOwned, remove, removeByTrip };
