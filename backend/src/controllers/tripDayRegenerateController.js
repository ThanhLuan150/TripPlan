import tripDayRegenerateService from "../services/tripDayRegenerateService.js";
import asyncHandler from "../utils/asyncHandler.js";

const propose = asyncHandler(async (req, res) => {
    res.status(200).json(await tripDayRegenerateService.proposeDay(req.trip, req.user._id, req.body?.dayId, req.body?.instruction));
});

const apply = asyncHandler(async (req, res) => {
    res.status(200).json(await tripDayRegenerateService.applyDay(req.trip, req.user._id, req.body?.proposalId));
});

const discard = asyncHandler(async (req, res) => {
    res.status(200).json(await tripDayRegenerateService.discardDay(req.trip, req.user._id, req.params.proposalId));
});

export default { propose, apply, discard };
