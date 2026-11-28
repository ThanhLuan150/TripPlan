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
    // Share as a post (Travel Community): the author's short introduction shown with the trip
    // in the public list and page, and when it was shared. The post IS this public trip: nothing
    // of the plan is copied. Both are removed when the trip goes private again.
    postContent: { type: String, trim: true, maxlength: 1000 },
    postedAt: Date,
});

// Model name kept as "Tripplan" so the existing "tripplans" collection is used.
const TripPlan = mongoose.model("Tripplan", TripPlanSchema);

export default TripPlan;
