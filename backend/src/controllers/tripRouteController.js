import tripRouteService from "../services/tripRouteService.js";
import asyncHandler from "../utils/asyncHandler.js";

const propose = asyncHandler(async (req, res) => {
    res.status(200).json(await tripRouteService.proposeRoute(req.trip, req.user._id, req.body?.dayId));
});

const apply = asyncHandler(async (req, res) => {
    res.status(200).json(await tripRouteService.applyRoute(req.trip, req.user._id, req.body?.proposalId));
});

const discard = asyncHandler(async (req, res) => {
    res.status(200).json(await tripRouteService.discardRoute(req.trip, req.user._id, req.params.proposalId));
});

export default { propose, apply, discard };
