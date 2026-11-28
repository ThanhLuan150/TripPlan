import TripPlan from "../models/TripPlan.js";
import { keywordPattern } from "../utils/searchPattern.js";

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

// Public trip (not deleted). Private, deleted or missing -> null.
const findPublicById = (id) => TripPlan.findOne({ _id: id, visibility: "public", ...ACTIVE });

// Newest public trips first; only what a card needs (no owner).
const PUBLIC_CARD = "nameTrip location startDate endDate transportCostTotal foodCostTotal otherCostTotal postContent postedAt";

// What anyone may read: public and not deleted. With a keyword, only the posts whose name, destination
// or introduction contain it (case and accent insensitive; the keyword is escaped, never a raw regex).
// The keyword can only narrow this filter, so a private or deleted trip is never reachable by search.
const publicFilter = (keyword) => {
    const filter = { visibility: "public", ...ACTIVE };
    if (keyword) {
        const pattern = new RegExp(keywordPattern(keyword), "i");
        filter.$or = [{ nameTrip: pattern }, { location: pattern }, { postContent: pattern }];
    }
    return filter;
};

const listPublic = (skip, limit, keyword = "") =>
    TripPlan.find(publicFilter(keyword)).sort({ _id: -1 }).skip(skip).limit(limit).select(PUBLIC_CARD).lean();

// Of these ids, the ones that are still public and not deleted (ids only).
const findPublicIdsIn = async (ids) => {
    const rows = await TripPlan.find({ _id: { $in: ids }, visibility: "public", ...ACTIVE }).select("_id").lean();
    return rows.map((row) => String(row._id));
};

// Cards of these public trips (not deleted), in no particular order.
const listPublicByIds = (ids) =>
    TripPlan.find({ _id: { $in: ids }, visibility: "public", ...ACTIVE }).select(PUBLIC_CARD).lean();

const countPublic = (keyword = "") => TripPlan.countDocuments(publicFilter(keyword));

// Going private also drops the post introduction: a private trip is not a post any more. Going public
// stamps the day it became a post ($min keeps the first date when there already is one).
// Posts (public, not deleted) for the admin numbers: all of them, the ones shared in a period and one author's.
const countPosts = () => TripPlan.countDocuments({ visibility: "public", ...ACTIVE });

const countPostsBetween = (from, to) =>
    TripPlan.countDocuments({ visibility: "public", ...ACTIVE, postedAt: { $gte: from, $lt: to } });

const countPostsByUser = (userId) => TripPlan.countDocuments({ userId, visibility: "public", ...ACTIVE });

const setVisibility = (id, visibility) =>
    TripPlan.findByIdAndUpdate(
        id,
        visibility === "private" ? { $set: { visibility }, $unset: { postContent: "", postedAt: "" } } : { $set: { visibility }, $min: { postedAt: new Date() } },
        { new: true },
    );

// Share the trip as a post: public, with the author's introduction.
const setPost = (id, postContent, postedAt) =>
    TripPlan.findByIdAndUpdate(id, { $set: { visibility: "public", postContent, postedAt } }, { new: true });

export default {
    findPublicById,
    listPublic,
    countPublic,
    findPublicIdsIn,
    listPublicByIds,
    setVisibility,
    setPost,
    countPosts,
    countPostsBetween,
    countPostsByUser,
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
