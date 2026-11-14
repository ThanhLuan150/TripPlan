import mongoose from "mongoose";

export const REPORT_TYPES = ["challengePhoto", "chatMessage", "profile", "video"];
export const REPORT_REASONS = ["spam", "inappropriate", "wrongLocation", "copyright"];
export const REPORT_STATUSES = ["pending", "approved", "rejected"];

// Content reported by a user (or flagged for review) that an admin decides on.
const ContentReportSchema = mongoose.Schema({
    type: { type: String, enum: REPORT_TYPES, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    content: { type: String, required: true, trim: true },
    authorName: { type: String, trim: true, default: "" },
    reporterId: { type: mongoose.Schema.ObjectId, ref: "User" },
    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    decidedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

const ContentReport = mongoose.model("ContentReport", ContentReportSchema);

export default ContentReport;
