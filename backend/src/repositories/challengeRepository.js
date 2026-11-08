import Challenge from "../models/Challenge.js";

const create = (data) => Challenge.create(data);

const findById = (id) => Challenge.findById(id);

const findByTripDayId = (tripDayId) => Challenge.find({ tripDayId });

const findFirstByTripDayId = (tripDayId) => Challenge.findOne({ tripDayId });

const setImage = (id, imageUrl) =>
    Challenge.findByIdAndUpdate(id, { imageUrl }, { new: true, projection: { _id: 1, points: 1 } });

export default { create, findById, findByTripDayId, findFirstByTripDayId, setImage };
