import tripVisibilityService from "../services/tripVisibilityService.js";
import asyncHandler from "../utils/asyncHandler.js";

// No sign-in: only trips the owner made public are returned.
const getPublicTrip = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store"); // making a trip private must take effect at once
    res.status(200).json(await tripVisibilityService.getPublicTrip(req.params.id));
});

const listPublicTrips = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(200).json(await tripVisibilityService.listPublicTrips(req.query));
});

const copyPublicTrip = asyncHandler(async (req, res) => {
    res.status(201).json(await tripVisibilityService.copyPublicTrip(req.params.id, req.user._id));
});

export default { getPublicTrip, listPublicTrips, copyPublicTrip };
