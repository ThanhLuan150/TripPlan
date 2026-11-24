import TripPlan from "../models/TripPlan.js";

const ACTIVE = { status: { $ne: "delete" } };

const findActiveByUser = (userId) => TripPlan.find({ userId, ...ACTIVE });

// Trip that belongs to the user and is not deleted (used by the ownership middleware)
const findOwnedById = (id, userId) => TripPlan.findOne({ _id: id, userId, ...ACTIVE });

const findOverlapping = (userId, startDate, endDate) =>
    TripPlan.find({
        userId,
        ...ACTIVE,
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
    });

const existsActiveWithName = (userId, nameTrip) =>
    TripPlan.exists({ userId, nameTrip, ...ACTIVE });

const findById = (id) => TripPlan.findById(id);

const create = (data) => TripPlan.create(data);

const updateById = (id, update) => TripPlan.findByIdAndUpdate(id, update, { new: true });

const softDelete = (id) => TripPlan.findByIdAndUpdate(id, { $set: { status: "delete" } }, { new: true });

// Trip behind a share link: sharing on, not deleted. Anything else -> null.
const findSharedByToken = (shareToken) => TripPlan.findOne({ shareToken, shareEnabled: true, ...ACTIVE });

const enableShare = (id, shareToken) =>
    TripPlan.findByIdAndUpdate(id, { $set: { shareEnabled: true, shareToken, sharePermission: "view", sharedAt: new Date() } }, { new: true });

const disableShare = (id) =>
    TripPlan.findByIdAndUpdate(id, { $set: { shareEnabled: false }, $unset: { shareToken: "", sharedAt: "" } }, { new: true });

export default {
    findSharedByToken,
    enableShare,
    disableShare,
    findById,
    findActiveByUser,
    findOwnedById,
    findOverlapping,
    existsActiveWithName,
    create,
    updateById,
    softDelete,
};
