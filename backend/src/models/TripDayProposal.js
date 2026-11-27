import mongoose from "mongoose";

// A replacement itinerary of ONE day proposed by the AI, kept on the server until the owner accepts or
// rejects it (or it expires). Accepting saves exactly this document, never what the client sends back.
const TripDayProposalSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    dayId: { type: mongoose.Schema.ObjectId, ref: "TripDay" },
    // challenge ids of the day as they were when the proposal was made (to detect a changed day)
    baseIds: [String],
    // { title, activities, transportCost, foodCost, otherCost }
    day: mongoose.Schema.Types.Mixed,
    // removed by MongoDB one hour after creation
    createdAt: { type: Date, default: Date.now, expires: 3600 },
});

const TripDayProposal = mongoose.model("TripDayProposal", TripDayProposalSchema);

export default TripDayProposal;
