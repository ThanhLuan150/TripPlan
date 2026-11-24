import mongoose from "mongoose";

// A trip the user saved as favorite. One row per (user, trip).
const FavoriteTripSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", required: true },
    createdAt: { type: Date, default: Date.now },
});

// no duplicate favorites, and fast "my favorites" lookups
FavoriteTripSchema.index({ userId: 1, tripId: 1 }, { unique: true });

const FavoriteTrip = mongoose.model("FavoriteTrip", FavoriteTripSchema);

export default FavoriteTrip;
