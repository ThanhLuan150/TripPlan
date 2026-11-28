import tripPostService from "../services/tripPostService.js";
import postReportService from "../services/postReportService.js";
import asyncHandler from "../utils/asyncHandler.js";

const getPost = asyncHandler(async (req, res) => {
    res.status(200).json(await tripPostService.getPost(req.trip));
});

const sharePost = asyncHandler(async (req, res) => {
    res.status(200).json(await tripPostService.sharePost(req.trip, req.body));
});

const removePost = asyncHandler(async (req, res) => {
    res.status(200).json(await tripPostService.removePost(req.trip));
});

// The answer never says anything about the reporter or the other reports of the post.
const reportPost = asyncHandler(async (req, res) => {
    res.status(201).json(await postReportService.report(req.user, req.params.id, req.body));
});

export default { getPost, sharePost, removePost, reportPost };
