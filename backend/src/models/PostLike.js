import mongoose from "mongoose";

// "userId likes the public trip (post) tripId". One row per (trip, user), so the same
// like can never exist twice. The like count is counted from these rows (not a counter
// stored on the trip), so it can never drift from the real likes.
const PostLikeSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", required: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
});

// no duplicate like (also guards concurrent requests), "did I like this" lookups and per-trip counts
PostLikeSchema.index({ tripId: 1, userId: 1 }, { unique: true });
// "what did this user like" lookups
PostLikeSchema.index({ userId: 1 });

const PostLike = mongoose.model("PostLike", PostLikeSchema);

export default PostLike;
