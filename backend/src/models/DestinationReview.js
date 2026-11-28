import mongoose from "mongoose";

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_REVIEW_LENGTH = 1000;

// A traveller's review of a destination (a province). Rule of the product: one review per
// user per destination (the user edits it instead of writing a second one), rating is a
// whole number of stars from 1 to 5, and a review has a comment.
const DestinationReviewSchema = mongoose.Schema({
    destination: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: MIN_RATING, max: MAX_RATING },
    content: { type: String, required: true, trim: true, maxlength: MAX_REVIEW_LENGTH },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// no second review of the same destination by the same user (also guards concurrent requests)
DestinationReviewSchema.index({ userId: 1, destination: 1 }, { unique: true });
// "reviews of a destination, newest first"
DestinationReviewSchema.index({ destination: 1, createdAt: -1 });

const DestinationReview = mongoose.model("DestinationReview", DestinationReviewSchema);

export default DestinationReview;
