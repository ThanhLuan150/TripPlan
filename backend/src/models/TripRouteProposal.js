import mongoose from "mongoose";

// A new visiting order proposed for one day of a trip, kept on the server until the owner accepts or
// rejects it (or it expires). Accepting applies exactly this document, never what the client sends.
const TripRouteProposalSchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan", index: true },
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    dayId: { type: mongoose.Schema.ObjectId, ref: "TripDay" },
    // challenge ids of the day as they were when the proposal was made (to detect a changed day)
    baseOrder: [String],
    // the same ids in the proposed visiting order
    order: [String],
    // removed by MongoDB one hour after creation
    createdAt: { type: Date, default: Date.now, expires: 3600 },
});

const TripRouteProposal = mongoose.model("TripRouteProposal", TripRouteProposalSchema);

export default TripRouteProposal;
