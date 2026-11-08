import mongoose from "mongoose";

const ChallengeSchema = mongoose.Schema({
    tripDayId: { type: mongoose.Schema.ObjectId, ref: "Tripplan" },
    challengeSummary: String,
    nameLocation: String,
    location: String,
    latitude: String,
    longitude: String,
    points: Number,
    imageUrl: String,
})

const Challenge = mongoose.model("Challenge", ChallengeSchema);

export default Challenge;
