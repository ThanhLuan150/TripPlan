import tripBudgetService from "../services/tripBudgetService.js";
import asyncHandler from "../utils/asyncHandler.js";

const getEstimate = asyncHandler(async (req, res) => {
    res.status(200).json(await tripBudgetService.getEstimate(req.trip, req.user._id));
});

const estimate = asyncHandler(async (req, res) => {
    res.status(200).json(await tripBudgetService.estimate(req.trip, req.user._id, req.body));
});

const updateEstimate = asyncHandler(async (req, res) => {
    res.status(200).json(await tripBudgetService.updateEstimate(req.trip, req.user._id, req.body));
});

export default { getEstimate, estimate, updateEstimate };
