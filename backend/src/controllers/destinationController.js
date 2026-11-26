import destinationRecommendService from "../services/destinationRecommendService.js";
import destinationHistoryService from "../services/destinationHistoryService.js";
import asyncHandler from "../utils/asyncHandler.js";

const recommend = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationRecommendService.recommend(req.user._id, req.body));
});

const listHistory = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationHistoryService.list(req.user._id, req.query.status));
});

const getHistory = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationHistoryService.get(req.user._id, req.params.id));
});

const updateHistory = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationHistoryService.update(req.user._id, req.params.id, req.body));
});

const removeHistory = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationHistoryService.remove(req.user._id, req.params.id));
});

export default { recommend, listHistory, getHistory, updateHistory, removeHistory };
