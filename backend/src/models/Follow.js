import mongoose from "mongoose";

// "followerId follows followingId". One row per (follower, following), so the same
// relation can never exist twice. Kept apart from User so counts are cheap and a user
// document does not grow with the number of followers.
const FollowSchema = mongoose.Schema({
    followerId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    followingId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

// no duplicate relation, and fast "who do I follow" lookups
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// fast "who follows this account" lookups and follower counts
FollowSchema.index({ followingId: 1 });

const Follow = mongoose.model("Follow", FollowSchema);

export default Follow;
