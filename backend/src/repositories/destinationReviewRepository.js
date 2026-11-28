import DestinationReview from "../models/DestinationReview.js";

const findById = (id) => DestinationReview.findById(id);

const findByUser = (userId, destination) => DestinationReview.findOne({ userId, destination });

// Throws the driver's E11000 error when the user already reviewed the destination.
const create = (data) => DestinationReview.create(data);

const updateById = (id, update) =>
    DestinationReview.findByIdAndUpdate(id, { $set: { ...update, updatedAt: new Date() } }, { new: true });

const deleteById = (id) => DestinationReview.deleteOne({ _id: id });

// One page of a destination's reviews, newest first, with the author's public name.
const listByDestination = (destination, skip, limit) =>
    DestinationReview.find({ destination })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username image")
        .lean();

const countByDestination = (destination) => DestinationReview.countDocuments({ destination });

// Average and number of reviews computed by the database over ALL reviews of the destination
// (never from the page that was loaded). { average: null, count: 0 } when there is none.
const summarize = async (destination) => {
    const [row] = await DestinationReview.aggregate([
        { $match: { destination } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    return row ? { average: row.average, count: row.count } : { average: null, count: 0 };
};

// ---- admin panel: every review, newest first, and the numbers of the dashboard ----

const listRecent = (limit) => DestinationReview.find({}).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();

const countAll = () => DestinationReview.countDocuments({});

const countBetween = (from, to) => DestinationReview.countDocuments({ createdAt: { $gte: from, $lt: to } });

const countByUser = (userId) => DestinationReview.countDocuments({ userId });

export default { listRecent, countAll, countBetween, countByUser, findById, findByUser, create, updateById, deleteById, listByDestination, countByDestination, summarize };
