import contentService from "../services/contentService.js";
import asyncHandler from "../utils/asyncHandler.js";

// What the app reads from the content managed in the admin panel.

const videos = asyncHandler(async (req, res) => {
    res.status(200).json(await contentService.listPublicVideos({ home: req.query.home === "1" }));
});

const home = asyncHandler(async (req, res) => {
    res.status(200).json(await contentService.getPublicHome());
});

const announcements = asyncHandler(async (req, res) => {
    res.status(200).json(await contentService.listPublicAnnouncements());
});

const settings = asyncHandler(async (req, res) => {
    res.status(200).json(await contentService.getSettings());
});

const report = asyncHandler(async (req, res) => {
    res.status(201).json(await contentService.reportContent(req.user, req.body));
});

export default { home, videos, announcements, settings, report };
