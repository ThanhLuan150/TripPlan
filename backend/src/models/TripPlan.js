import mongoose from "mongoose";

const TripPlanSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    startDate: Date,
    endDate: Date,
    location: String,
    imageUrl: String,
    transportCostTotal: Number,
    foodCostTotal: Number,
    otherCostTotal: Number,
    nameTrip: String,
    // "active" or "delete" (soft delete)
    status: { type: String, default: "active" },
    // Who may open the trip: "private" (only the owner, and admins in the admin panel) or
    // "public" (anyone may read it, read only). Old trips have no value and count as private.
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    // Sharing by link: the link works only while shareEnabled and the token matches.
    // Turning sharing off removes the token, so an old link never works again.
    shareEnabled: { type: Boolean, default: false },
    shareToken: { type: String, unique: true, sparse: true },
    // what the link allows; only "view" (read only) exists, there is no shared editing
    sharePermission: { type: String, enum: ["view"], default: "view" },
    sharedAt: Date,
});

// Model name kept as "Tripplan" so the existing "tripplans" collection is used.
const TripPlan = mongoose.model("Tripplan", TripPlanSchema);

export default TripPlan;
