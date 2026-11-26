import mongoose from "mongoose";

export const SEARCH_STATUSES = ["draft", "created"];

// One AI destination recommendation the user asked for: what they typed and what the AI answered,
// kept so they can open it again later. "draft" = not used yet, "created" = they started a plan from it.
const DestinationSearchSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    query: { type: String, default: "" },
    interests: { type: [String], default: [] },
    region: { type: String, default: "" },
    budget: { type: String, default: "" },
    recommendations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    status: { type: String, enum: SEARCH_STATUSES, default: "draft" },
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// "my searches", newest first
DestinationSearchSchema.index({ userId: 1, createdAt: -1 });

const DestinationSearch = mongoose.model("DestinationSearch", DestinationSearchSchema);

export default DestinationSearch;
