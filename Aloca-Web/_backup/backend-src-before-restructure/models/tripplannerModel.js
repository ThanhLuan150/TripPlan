import mongoose from "mongoose";

const TripPlannerSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    startDate: Date,
    endDate: Date,
    location: String,
    imageUrl: String,
    transportCostTotal: Number,
    foodCostTotal: Number,
    otherCostTotal: Number,
    nameTrip: String,
    status: { type: String, default: "active" }
})

const Tripplan = mongoose.model("Tripplan", TripPlannerSchema);

export default Tripplan;
