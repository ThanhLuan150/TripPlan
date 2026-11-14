import mongoose from "mongoose";
import contentRepository from "../repositories/contentRepository.js";
import { VIDEO_STATUSES } from "../models/Video.js";
import { SHOWCASE_KINDS, SHOWCASE_STATUSES } from "../models/Showcase.js";
import { ANNOUNCEMENT_STATUSES } from "../models/Announcement.js";
import { REPORT_REASONS, REPORT_TYPES } from "../models/ContentReport.js";
import HttpError from "../utils/HttpError.js";
import { youtubeThumbnail } from "../utils/youtube.js";
import activityLogService from "./activityLogService.js";
import { LIST_LIMIT } from "./adminService.js";

// Videos, announcements and settings: edited from the admin panel, read by the app.

const validId = (id, message) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(404, message);
    }
};
const bad = (message) => new HttpError(400, message);
const isUrl = (value) => /^https?:\/\/\S+$/i.test(value);

// Trimmed text field of the body: undefined when it was not sent.
const text = (body, key, { max = 200, required = false, url = false } = {}) => {
    const value = body[key];
    if (value === undefined) {
        if (required) {
            throw bad(`${key} is required`);
        }
        return undefined;
    }
    if (typeof value !== "string") {
        throw bad(`Invalid ${key}`);
    }
    const trimmed = value.trim();
    if ((required && !trimmed) || trimmed.length > max || (url && trimmed && !isUrl(trimmed))) {
        throw bad(`Invalid ${key}`);
    }
    return trimmed;
};

// only the keys that were sent
const defined = (data) => Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

// ---- videos --------------------------------------------------------------------------

const toVideo = (video) => ({
    id: String(video._id),
    title: video.title,
    location: video.location || "",
    youtubeLink: video.youtubeLink || "",
    src: video.src || "",
    durationSec: video.durationSec ?? 0,
    views: video.views ?? 0,
    showOnHome: !!video.showOnHome,
    status: video.status,
    createdAt: video.createdAt,
});

const cleanVideo = (body = {}, { create }) => {
    const data = defined({
        title: text(body, "title", { required: create }),
        location: text(body, "location"),
        youtubeLink: text(body, "youtubeLink", { max: 500, url: true }),
        src: text(body, "src", { max: 500, url: true }),
    });
    if (body.durationSec !== undefined) {
        if (!Number.isInteger(body.durationSec) || body.durationSec < 0) {
            throw bad("Invalid durationSec");
        }
        data.durationSec = body.durationSec;
    }
    if (body.showOnHome !== undefined) {
        if (typeof body.showOnHome !== "boolean") {
            throw bad("Invalid showOnHome");
        }
        data.showOnHome = body.showOnHome;
    }
    if (body.status !== undefined) {
        if (!VIDEO_STATUSES.includes(body.status)) {
            throw bad(`status must be one of: ${VIDEO_STATUSES.join(", ")}`);
        }
        data.status = body.status;
    }
    if (!create && Object.keys(data).length === 0) {
        throw bad("Nothing to update");
    }
    return data;
};

const listVideos = async () => (await contentRepository.listVideos(LIST_LIMIT)).map(toVideo);

const createVideo = async (actor, body) => {
    const video = await contentRepository.createVideo(cleanVideo(body, { create: true }));
    await activityLogService.record({ actor, action: "manageVideo", target: `+ ${video.title}` });
    return toVideo(video.toObject());
};

const updateVideo = async (actor, id, body) => {
    validId(id, "Video not found");
    const video = await contentRepository.updateVideo(id, cleanVideo(body, { create: false }));
    if (!video) {
        throw new HttpError(404, "Video not found");
    }
    await activityLogService.record({ actor, action: "manageVideo", target: video.title });
    return toVideo(video);
};

const deleteVideo = async (actor, id) => {
    validId(id, "Video not found");
    const video = await contentRepository.deleteVideo(id);
    if (!video) {
        throw new HttpError(404, "Video not found");
    }
    await activityLogService.record({ actor, action: "manageVideo", target: `- ${video.title}`, level: "warning" });
    return { message: "Delete video successfully" };
};

// What the app shows (`home` = only the home-page videos).
const listPublicVideos = async ({ home = false } = {}) =>
    (await contentRepository.listPublishedVideos({ home })).map((video) => ({
        id: String(video._id),
        title: video.title,
        location: video.location || "",
        youtubeLink: video.youtubeLink || "",
        src: video.src || "",
        thumbnail: youtubeThumbnail(video.youtubeLink),
    }));

// ---- home page pictures ----------------------------------------------------------------

const toShowcase = (item) => ({
    id: String(item._id),
    kind: item.kind,
    title: item.title || "",
    location: item.location || "",
    imageUrl: item.imageUrl,
    status: item.status,
    sortOrder: item.sortOrder ?? 0,
    createdAt: item.createdAt,
});

const cleanShowcase = (body = {}, { create }) => {
    const data = defined({
        title: text(body, "title"),
        location: text(body, "location"),
        imageUrl: text(body, "imageUrl", { max: 500, url: true, required: create }),
    });
    if (create || body.kind !== undefined) {
        if (!SHOWCASE_KINDS.includes(body.kind)) {
            throw bad(`kind must be one of: ${SHOWCASE_KINDS.join(", ")}`);
        }
        data.kind = body.kind;
    }
    if (body.status !== undefined) {
        if (!SHOWCASE_STATUSES.includes(body.status)) {
            throw bad(`status must be one of: ${SHOWCASE_STATUSES.join(", ")}`);
        }
        data.status = body.status;
    }
    if (body.sortOrder !== undefined) {
        if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 9999) {
            throw bad("Invalid sortOrder");
        }
        data.sortOrder = body.sortOrder;
    }
    if (data.imageUrl === "") {
        throw bad("Invalid imageUrl");
    }
    if (!create && Object.keys(data).length === 0) {
        throw bad("Nothing to update");
    }
    return data;
};

const label = (item) => `${item.kind} ${item.title || ""}`.trim();

const listShowcase = async () => (await contentRepository.listShowcase(LIST_LIMIT)).map(toShowcase);

const createShowcase = async (actor, body) => {
    const item = await contentRepository.createShowcase(cleanShowcase(body, { create: true }));
    await activityLogService.record({ actor, action: "manageShowcase", target: `+ ${label(item)}` });
    return toShowcase(item.toObject());
};

const updateShowcase = async (actor, id, body) => {
    validId(id, "Picture not found");
    const item = await contentRepository.updateShowcase(id, cleanShowcase(body, { create: false }));
    if (!item) {
        throw new HttpError(404, "Picture not found");
    }
    await activityLogService.record({ actor, action: "manageShowcase", target: label(item) });
    return toShowcase(item);
};

const deleteShowcase = async (actor, id) => {
    validId(id, "Picture not found");
    const item = await contentRepository.deleteShowcase(id);
    if (!item) {
        throw new HttpError(404, "Picture not found");
    }
    await activityLogService.record({ actor, action: "manageShowcase", target: `- ${label(item)}`, level: "warning" });
    return { message: "Delete picture successfully" };
};

// What the home page of the app shows.
const getPublicHome = async () => {
    const items = await contentRepository.listPublishedShowcase();
    return {
        banners: items
            .filter((item) => item.kind === "banner")
            .map((item) => ({ id: String(item._id), title: item.title || "", imageUrl: item.imageUrl })),
        suggestions: items
            .filter((item) => item.kind === "suggestion")
            .map((item) => ({ id: String(item._id), title: item.title || "", location: item.location || "", imageUrl: item.imageUrl })),
    };
};

// ---- announcements ----------------------------------------------------------------------

const toAnnouncement = (item) => ({
    id: String(item._id),
    title: item.title,
    message: item.message || "",
    status: item.status,
    publishAt: item.publishAt,
    createdAt: item.createdAt,
});

const cleanAnnouncement = (body = {}, { create }) => {
    const data = defined({
        title: text(body, "title", { required: create }),
        message: text(body, "message", { max: 2000 }),
    });
    if (body.status !== undefined) {
        if (!ANNOUNCEMENT_STATUSES.includes(body.status)) {
            throw bad(`status must be one of: ${ANNOUNCEMENT_STATUSES.join(", ")}`);
        }
        data.status = body.status;
    }
    if (body.publishAt !== undefined) {
        const date = new Date(body.publishAt);
        if (typeof body.publishAt !== "string" || Number.isNaN(date.getTime())) {
            throw bad("Invalid publishAt");
        }
        data.publishAt = date;
    }
    if (!create && Object.keys(data).length === 0) {
        throw bad("Nothing to update");
    }
    return data;
};

const listAnnouncements = async () => (await contentRepository.listAnnouncements(LIST_LIMIT)).map(toAnnouncement);

const createAnnouncement = async (actor, body) => {
    const item = await contentRepository.createAnnouncement(cleanAnnouncement(body, { create: true }));
    await activityLogService.record({ actor, action: "manageAnnouncement", target: `+ ${item.title}` });
    return toAnnouncement(item.toObject());
};

const updateAnnouncement = async (actor, id, body) => {
    validId(id, "Announcement not found");
    const item = await contentRepository.updateAnnouncement(id, cleanAnnouncement(body, { create: false }));
    if (!item) {
        throw new HttpError(404, "Announcement not found");
    }
    await activityLogService.record({ actor, action: "manageAnnouncement", target: item.title });
    return toAnnouncement(item);
};

const deleteAnnouncement = async (actor, id) => {
    validId(id, "Announcement not found");
    const item = await contentRepository.deleteAnnouncement(id);
    if (!item) {
        throw new HttpError(404, "Announcement not found");
    }
    await activityLogService.record({ actor, action: "manageAnnouncement", target: `- ${item.title}`, level: "warning" });
    return { message: "Delete announcement successfully" };
};

// What the app shows: published and already due, newest first.
const listPublicAnnouncements = async () =>
    (await contentRepository.listVisibleAnnouncements(new Date())).map((item) => ({
        id: String(item._id),
        title: item.title,
        message: item.message || "",
        publishAt: item.publishAt,
    }));

// ---- settings ---------------------------------------------------------------------------

const toSettings = (settings) => ({
    appName: settings.appName,
    supportEmail: settings.supportEmail || "",
    hotline: settings.hotline || "",
});

const getSettings = async () => toSettings(await contentRepository.getSettings());

const saveSettings = async (actor, body = {}) => {
    const data = defined({
        appName: text(body, "appName", { max: 60 }),
        supportEmail: text(body, "supportEmail", { max: 120 }),
        hotline: text(body, "hotline", { max: 30 }),
    });
    if (data.appName === "") {
        throw bad("Invalid appName");
    }
    if (data.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supportEmail)) {
        throw bad("Invalid supportEmail");
    }
    if (data.hotline && !/^[0-9+().\s-]+$/.test(data.hotline)) {
        throw bad("Invalid hotline");
    }
    if (Object.keys(data).length === 0) {
        throw bad("Nothing to update");
    }
    const settings = await contentRepository.saveSettings(data);
    await activityLogService.record({ actor, action: "updateSettings", target: Object.keys(data).join(", ") });
    return toSettings(settings);
};

// ---- reported content (from the app) ------------------------------------------------------

// A signed-in user reports some content; it waits for an admin in "Moderation".
const reportContent = async (user, body = {}) => {
    if (!REPORT_TYPES.includes(body.type)) {
        throw bad(`type must be one of: ${REPORT_TYPES.join(", ")}`);
    }
    if (!REPORT_REASONS.includes(body.reason)) {
        throw bad(`reason must be one of: ${REPORT_REASONS.join(", ")}`);
    }
    await contentRepository.createReport({
        type: body.type,
        reason: body.reason,
        content: text(body, "content", { max: 500, required: true }),
        authorName: text(body, "authorName", { max: 100 }) ?? "",
        reporterId: user._id,
    });
    return { message: "Report sent successfully" };
};

export default {
    listVideos,
    createVideo,
    updateVideo,
    deleteVideo,
    listPublicVideos,
    listShowcase,
    createShowcase,
    updateShowcase,
    deleteShowcase,
    getPublicHome,
    listAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    listPublicAnnouncements,
    getSettings,
    saveSettings,
    reportContent,
};
