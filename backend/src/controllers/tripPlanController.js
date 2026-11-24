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

const duplicateTrip = asyncHandler(async (req, res) => {
    res.status(201).json(await tripService.duplicateTrip(req.trip, req.user._id));
});

const listFavoriteTrips = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.listFavoriteTrips(req.user._id));
});

const addFavoriteTrip = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.addFavoriteTrip(req.trip, req.user._id));
});

const removeFavoriteTrip = asyncHandler(async (req, res) => {
    res.status(200).json(await tripService.removeFavoriteTrip(req.params.id, req.user._id));
});

export default { listFavoriteTrips, addFavoriteTrip, removeFavoriteTrip, duplicateTrip, generatePlans, saveTrip, listTrips, getTripDetail, deleteTrip, getTripLocations };
