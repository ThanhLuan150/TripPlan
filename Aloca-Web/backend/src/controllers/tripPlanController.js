import tripService from "../services/tripService.js";
import asyncHandler from "../utils/asyncHandler.js";

const generatePlans = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.generatePlans(req.user._id, req.body));
});

const saveTrip = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.saveTrip(req.user._id, req.body));
});

const listTrips = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.listTrips(req.user._id));
});

const getTripDetail = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.getTripDetail(req.trip, req.user._id));
});

const deleteTrip = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.deleteTrip(req.trip));
});

const getTripLocations = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.getTripLocations(req.trip));
});

export default { generatePlans, saveTrip, listTrips, getTripDetail, deleteTrip, getTripLocations };
