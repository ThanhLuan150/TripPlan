import TripDay from "../models/TripDay.js";

const create = (data) => TripDay.create(data);

const findByTripId = (tripId) => TripDay.find({ tripId }).sort({ day: 1 });

const findById = (id) => TripDay.findById(id);

export default { create, findById, findByTripId };
