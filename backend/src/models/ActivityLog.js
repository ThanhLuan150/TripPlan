import mongoose from "mongoose";

export const LOG_ACTIONS = [
    "login",
    "register",
    "useAi",
    "createUser",
    "createTrip",
    "deleteTrip",
    "completeChallenge",
    "updateProfile",
    "deleteUser",
    "restoreUser",
    "suspendUser",
    "updateUser",
    "changeRole",
    "updateChallenge",
    "manageVideo",
    "manageShowcase",
    "manageAnnouncement",
    "moderate",
    "updateSettings",
];
export const LOG_LEVELS = ["info", "warning", "error"];

// What users and admins did (sign-in, trips, challenges, admin changes).
const ActivityLogSchema = mongoose.Schema({
    actorId: { type: mongoose.Schema.ObjectId, ref: "User" },
    actorName: { type: String, default: "" },
    action: { type: String, enum: LOG_ACTIONS, required: true },
    target: { type: String, default: "" },
    ip: { type: String, default: "" },
    level: { type: String, enum: LOG_LEVELS, default: "info" },
    createdAt: { type: Date, default: Date.now },
});

const ActivityLog = mongoose.model("ActivityLog", ActivityLogSchema);

export default ActivityLog;
