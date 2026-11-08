import TripDay from "../models/TripDay.js";

const create = (data) => TripDay.create(data);

const findByTripId = (tripId) => TripDay.find({ tripId }).sort({ day: 1 });

export default { create, findByTripId };
