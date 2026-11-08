import mongoose from "mongoose";

const UserChallengeProgressSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    chaId: { type: mongoose.Schema.ObjectId, ref: "Challenge" },
    completed: { type: Boolean, default: false },
    endAt: { type: Date },
}, {
    timestamps: true,
});

// Model name kept as "UserChallengProgress" (sic) so the existing collection is used.
const UserChallengeProgress = mongoose.model("UserChallengProgress", UserChallengeProgressSchema);

export default UserChallengeProgress;
