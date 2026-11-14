import mongoose from "mongoose";

export const SETTINGS_KEY = "app";

// One document (key "app") with the settings the admin panel edits. The
// public ones (app name, support e-mail, hotline) are read by the app.
const SettingSchema = mongoose.Schema({
    key: { type: String, required: true, unique: true, default: SETTINGS_KEY },
    appName: { type: String, trim: true, default: "Aloca" },
    supportEmail: { type: String, trim: true, default: "" },
    hotline: { type: String, trim: true, default: "" },
    updatedAt: { type: Date, default: Date.now },
});

const Setting = mongoose.model("Setting", SettingSchema);

export default Setting;
