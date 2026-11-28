import TripBudgetEstimate from "../models/TripBudgetEstimate.js";

// Every query is scoped to the trip AND the user.
const findByTrip = (tripId, userId) => TripBudgetEstimate.findOne({ tripId: { $eq: tripId }, userId: { $eq: userId } });

// One estimate per trip and user: a new estimate replaces the previous one
const save = (tripId, userId, data) => TripBudgetEstimate.findOneAndUpdate(
    { tripId: { $eq: tripId }, userId: { $eq: userId } },
    { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { new: true, upsert: true },
);

// number of saved estimates (admin panel)
const countAll = () => TripBudgetEstimate.countDocuments({});

export default { findByTrip, save, countAll };
