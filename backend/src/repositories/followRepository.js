import Follow from "../models/Follow.js";

// Idempotent: following twice keeps a single row (the unique index also guards races).
const add = (followerId, followingId) =>
    Follow.updateOne({ followerId, followingId }, { $setOnInsert: { followerId, followingId, createdAt: new Date() } }, { upsert: true });

const remove = (followerId, followingId) => Follow.deleteOne({ followerId, followingId });

const exists = async (followerId, followingId) => Boolean(await Follow.exists({ followerId, followingId }));

const countFollowers = (userId) => Follow.countDocuments({ followingId: userId });

const countFollowing = (userId) => Follow.countDocuments({ followerId: userId });

export default { add, remove, exists, countFollowers, countFollowing };
