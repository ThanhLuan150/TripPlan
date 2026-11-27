import mongoose from "mongoose";

const ChallengeSchema = mongoose.Schema({
    tripDayId: { type: mongoose.Schema.ObjectId, ref: "TripDay" },
    challengeSummary: String,
    nameLocation: String,
    location: String,
    latitude: String,
    longitude: String,
    points: Number,
    imageUrl: String,
    // position inside its day, set when the owner accepts a route optimization (older places have none)
    order: Number,
})

const Challenge = mongoose.model("Challenge", ChallengeSchema);

export default Challenge;
