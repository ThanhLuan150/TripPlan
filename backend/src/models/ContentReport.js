import mongoose from "mongoose";

export const REPORT_TYPES = ["challengePhoto", "chatMessage", "profile", "video", "post"];
export const REPORT_REASONS = ["spam", "inappropriate", "wrongLocation", "copyright", "misinformation", "other"];
export const MAX_REPORT_DETAILS = 500;
export const REPORT_STATUSES = ["pending", "approved", "rejected"];

// Content reported by a user (or flagged for review) that an admin decides on.
const ContentReportSchema = mongoose.Schema({
    type: { type: String, enum: REPORT_TYPES, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    content: { type: String, required: true, trim: true },
    authorName: { type: String, trim: true, default: "" },
    reporterId: { type: mongoose.Schema.ObjectId, ref: "User" },
    // what was reported when it is a record of the app (type "post": the id of the public trip)
    targetId: { type: mongoose.Schema.ObjectId },
    // the reporter's own words (optional); only admins could read them, never the author of the content
    details: { type: String, trim: true, maxlength: MAX_REPORT_DETAILS },
    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    decidedBy: { type: mongoose.Schema.ObjectId, ref: "User" },
    decidedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
});

// One report per user per target: no duplicate even when two requests arrive at the same moment.
ContentReportSchema.index(
    { type: 1, targetId: 1, reporterId: 1 },
    { unique: true, partialFilterExpression: { targetId: { $exists: true } } },
);

const ContentReport = mongoose.model("ContentReport", ContentReportSchema);

export default ContentReport;
