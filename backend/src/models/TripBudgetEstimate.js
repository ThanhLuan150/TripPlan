import mongoose from "mongoose";

// The budget the AI ESTIMATED for a trip (one per trip and user, replaced on each new estimate).
// It is a forecast only: it is never an expense, never added to the trip's costs and never counted
// as money actually spent. `isEstimate` is always true so every reader can tell it apart.
const CategorySchema = mongoose.Schema({
    key: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
}, { _id: false });

const TripBudgetEstimateSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", required: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    isEstimate: { type: Boolean, default: true },
    currency: { type: String, default: "VND" },
    travelers: { type: Number, required: true, min: 1 },
    spendingLevel: { type: String, enum: ["budget", "moderate", "premium"], default: "moderate" },
    categories: [CategorySchema],
    // always the sum of the categories (computed by the server)
    total: { type: Number, required: true, min: 0 },
    assumptions: [String],
    // "ai": as the AI answered; "manual": the user adjusted the amounts afterwards
    source: { type: String, enum: ["ai", "manual"], default: "ai" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

TripBudgetEstimateSchema.index({ tripId: 1, userId: 1 }, { unique: true });

const TripBudgetEstimate = mongoose.model("TripBudgetEstimate", TripBudgetEstimateSchema);

export default TripBudgetEstimate;
