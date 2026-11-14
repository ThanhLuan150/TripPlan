import mongoose from "mongoose";

export const VIDEO_STATUSES = ["published", "hidden"];

// Travel video shown in the app (home "Video nổi bật" and the videos screen).
// Managed from the admin panel; `src` is an optional direct file URL, the
// YouTube link is what the app opens.
const VideoSchema = mongoose.Schema({
    title: { type: String, required: [true, "Title is required field!"], trim: true },
    location: { type: String, trim: true, default: "" },
    youtubeLink: { type: String, trim: true, default: "" },
    src: { type: String, trim: true, default: "" },
    durationSec: { type: Number, min: 0, default: 0 },
    views: { type: Number, min: 0, default: 0 },
    showOnHome: { type: Boolean, default: false },
    status: { type: String, enum: VIDEO_STATUSES, default: "published" },
    createdAt: { type: Date, default: Date.now },
});

const Video = mongoose.model("Video", VideoSchema);

export default Video;
