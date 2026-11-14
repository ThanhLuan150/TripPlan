import mongoose from "mongoose";

export const SHOWCASE_KINDS = ["banner", "suggestion"];
export const SHOWCASE_STATUSES = ["published", "hidden"];

// A picture of the home page of the app, managed from the admin panel:
// "banner" = a slide of the top slider, "suggestion" = a destination of the
// "Có thể bạn sẽ thích?" row (tapping it starts a plan for `location`).
const ShowcaseSchema = mongoose.Schema({
    kind: { type: String, enum: SHOWCASE_KINDS, required: true },
    title: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, required: [true, "Image is required field!"] },
    status: { type: String, enum: SHOWCASE_STATUSES, default: "published" },
    // smaller first
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

const Showcase = mongoose.model("Showcase", ShowcaseSchema);

export default Showcase;
