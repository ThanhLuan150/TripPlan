import Video from "../models/Video.js";
import Showcase from "../models/Showcase.js";
import Announcement from "../models/Announcement.js";
import Setting, { SETTINGS_KEY } from "../models/Setting.js";
import ActivityLog from "../models/ActivityLog.js";
import ContentReport from "../models/ContentReport.js";

// Queries over the collections the admin panel owns: videos, announcements,
// settings, activity log and reported content.

// ---- videos ----------------------------------------------------------------

const listVideos = (limit) => Video.find({}).sort({ createdAt: -1 }).limit(limit).lean();

// what the app shows: published only, optionally just the home-page ones
const listPublishedVideos = ({ home = false } = {}) =>
    Video.find({ status: "published", ...(home ? { showOnHome: true } : {}) })
        .sort({ createdAt: -1 })
        .lean();

const createVideo = (data) => Video.create(data);

const updateVideo = (id, update) =>
    Video.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();

const deleteVideo = (id) => Video.findByIdAndDelete(id).lean();

// ---- home page pictures ----------------------------------------------------

const SHOWCASE_ORDER = { sortOrder: 1, createdAt: -1 };

const listShowcase = (limit) => Showcase.find({}).sort(SHOWCASE_ORDER).limit(limit).lean();

// what the app shows
const listPublishedShowcase = () => Showcase.find({ status: "published" }).sort(SHOWCASE_ORDER).lean();

const createShowcase = (data) => Showcase.create(data);

const updateShowcase = (id, update) =>
    Showcase.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();

const deleteShowcase = (id) => Showcase.findByIdAndDelete(id).lean();

const countShowcase = () => Showcase.countDocuments({});

// ---- announcements -----------------------------------------------------------

const listAnnouncements = (limit) => Announcement.find({}).sort({ publishAt: -1 }).limit(limit).lean();

// what the app shows: published and already due
const listVisibleAnnouncements = (now) =>
    Announcement.find({ status: "published", publishAt: { $lte: now } })
        .sort({ publishAt: -1 })
        .limit(100)
        .lean();

const createAnnouncement = (data) => Announcement.create(data);

const updateAnnouncement = (id, update) =>
    Announcement.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();

const deleteAnnouncement = (id) => Announcement.findByIdAndDelete(id).lean();

// ---- settings ----------------------------------------------------------------

// the settings document, created with its defaults the first time
const getSettings = () =>
    Setting.findOneAndUpdate({ key: SETTINGS_KEY }, { $setOnInsert: { key: SETTINGS_KEY } }, { upsert: true, new: true }).lean();

const saveSettings = (update) =>
    Setting.findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: { ...update, updatedAt: new Date() } },
        { upsert: true, new: true, runValidators: true },
    ).lean();

// ---- activity log --------------------------------------------------------------

const listLogs = (limit) => ActivityLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();

const listLogsByActor = (actorId, limit) => ActivityLog.find({ actorId }).sort({ createdAt: -1 }).limit(limit).lean();

const createLog = (data) => ActivityLog.create(data);

// ---- reported content ----------------------------------------------------------

const listReports = (limit) => ContentReport.find({}).sort({ createdAt: -1 }).limit(limit).lean();

const countPendingReports = () => ContentReport.countDocuments({ status: "pending" });

const createReport = (data) => ContentReport.create(data);

const decideReport = (id, status, adminId) =>
    ContentReport.findByIdAndUpdate(
        id,
        { $set: { status, decidedBy: adminId, decidedAt: new Date() } },
        { new: true },
    ).lean();

export default {
    listVideos,
    listPublishedVideos,
    createVideo,
    updateVideo,
    deleteVideo,
    listShowcase,
    listPublishedShowcase,
    createShowcase,
    updateShowcase,
    deleteShowcase,
    countShowcase,
    listAnnouncements,
    listVisibleAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getSettings,
    saveSettings,
    listLogs,
    listLogsByActor,
    createLog,
    listReports,
    countPendingReports,
    createReport,
    decideReport,
};
