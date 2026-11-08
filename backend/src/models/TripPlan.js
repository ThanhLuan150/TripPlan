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
});

// Model name kept as "Tripplan" so the existing "tripplans" collection is used.
const TripPlan = mongoose.model("Tripplan", TripPlanSchema);

export default TripPlan;
