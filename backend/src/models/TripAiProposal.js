import mongoose from "mongoose";

// An itinerary proposed by the AI for a trip, kept on the server until the owner accepts or rejects
// it (or it expires). Accepting saves exactly this document, never what the client sends back.
const TripAiProposalSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    days: [mongoose.Schema.Types.Mixed],
    // removed by MongoDB one hour after creation
    createdAt: { type: Date, default: Date.now, expires: 3600 },
});

const TripAiProposal = mongoose.model("TripAiProposal", TripAiProposalSchema);

export default TripAiProposal;
