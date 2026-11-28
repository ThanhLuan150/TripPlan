import DestinationSearch from "../models/DestinationSearch.js";

// Every query is scoped to the user: nobody reads or changes another user's searches.

const create = (data) => DestinationSearch.create(data);

// newest first; status filters the two groups
const listByUser = (userId, status, limit) =>
    DestinationSearch.find({ userId: { $eq: userId }, ...(status ? { status: { $eq: status } } : {}) })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

const findOwned = (id, userId) => DestinationSearch.findOne({ _id: { $eq: id }, userId: { $eq: userId } }).lean();

const updateOwned = (id, userId, update) =>
    DestinationSearch.findOneAndUpdate(
        { _id: { $eq: id }, userId: { $eq: userId } },
        { $set: { ...update, updatedAt: new Date() } },
        { new: true },
    ).lean();

const removeOwned = (id, userId) => DestinationSearch.deleteOne({ _id: { $eq: id }, userId: { $eq: userId } });

// keeps only the newest `keep` searches of the user
const trim = async (userId, keep) => {
    const old = await DestinationSearch.find({ userId: { $eq: userId } }).sort({ createdAt: -1 }).skip(keep).select("_id").lean();
    if (old.length > 0) {
        await DestinationSearch.deleteMany({ _id: { $in: old.map((item) => item._id) } });
    }
};

// numbers for the admin panel: all the suggestions and the ones a plan was started from
const countAll = () => DestinationSearch.countDocuments({});

const countCreated = () => DestinationSearch.countDocuments({ status: "created" });

export default {
    countAll,
    countCreated, create, listByUser, findOwned, updateOwned, removeOwned, trim };
