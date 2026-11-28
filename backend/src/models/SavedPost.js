import mongoose from "mongoose";

// "userId saved the public trip (post) tripId to read later". One row per (user, trip), so a
// post can never be saved twice. Private to the user who saved it: nothing here is ever
// shown to anyone else.
const SavedPostSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", required: true },
    createdAt: { type: Date, default: Date.now },
});

// no duplicate save (also guards concurrent requests) and fast "did I save this" lookups
SavedPostSchema.index({ userId: 1, tripId: 1 }, { unique: true });
// "my saved posts, newest first"
SavedPostSchema.index({ userId: 1, createdAt: -1 });

const SavedPost = mongoose.model("SavedPost", SavedPostSchema);

export default SavedPost;
