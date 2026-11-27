import Challenge from "../models/Challenge.js";

const create = (data) => Challenge.create(data);

const findById = (id) => Challenge.findById(id);

// Places of a day in visiting order: the ones with an order first (by it), the others after, oldest first
const byVisitOrder = (a, b) => {
    const hasA = typeof a.order === "number";
    const hasB = typeof b.order === "number";
    if (hasA && hasB) {
        return a.order - b.order;
    }
    return hasA === hasB ? 0 : hasA ? -1 : 1;
};

const findByTripDayId = async (tripDayId) => {
    const found = await Challenge.find({ tripDayId });
    return Array.isArray(found) ? [...found].sort(byVisitOrder) : found;
};

const findFirstByTripDayId = async (tripDayId) => (await findByTripDayId(tripDayId))?.[0] ?? null;

const setImage = (id, imageUrl) =>
    Challenge.findByIdAndUpdate(id, { imageUrl }, { new: true, projection: { _id: 1, points: 1 } });

const setCoordinates = (id, latitude, longitude) => Challenge.findByIdAndUpdate(id, { latitude, longitude });

const updateById = (id, update) => Challenge.findByIdAndUpdate(id, { $set: update }, { new: true });

const deleteByIds = (ids) => Challenge.deleteMany({ _id: { $in: ids } });

export default { updateById, deleteByIds, create, setCoordinates, findById, findByTripDayId, findFirstByTripDayId, setImage };
