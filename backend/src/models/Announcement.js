import mongoose from "mongoose";

export const ANNOUNCEMENT_STATUSES = ["draft", "published"];

// Notification written by an admin and shown to every user in the app's
// notifications screen. A published announcement becomes visible at `publishAt`
// (a future date = scheduled).
const AnnouncementSchema = mongoose.Schema({
    title: { type: String, required: [true, "Title is required field!"], trim: true },
    message: { type: String, trim: true, default: "" },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: "draft" },
    publishAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

const Announcement = mongoose.model("Announcement", AnnouncementSchema);

export default Announcement;
