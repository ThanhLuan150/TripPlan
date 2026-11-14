import { getProvinceFromCoordinates } from "../utils/geocode.js";
import { getRoute } from "../utils/routing.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

// Which province a position is in (the web app keeps it for trip planning).
// Public: the key of the place service stays on the server.
const reverse = asyncHandler(async (req, res) => {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);
    const valid = req.query.lat !== undefined && req.query.lng !== undefined
        && Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    if (!valid) {
        throw new HttpError(400, "lat and lng must be coordinates");
    }
    res.status(200).json({ province: (await getProvinceFromCoordinates(latitude, longitude)) ?? null });
});

// Latitude / longitude of the query, or null when it is not a position.
const position = (lat, lng) => {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const valid = lat !== undefined && lng !== undefined
        && Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    return valid ? { lat: latitude, lng: longitude } : null;
};

// The way by road from one position to another (the web app draws it on its map).
const route = asyncHandler(async (req, res) => {
    const from = position(req.query.fromLat, req.query.fromLng);
    const to = position(req.query.toLat, req.query.toLng);
    if (!from || !to) {
        throw new HttpError(400, "fromLat, fromLng, toLat and toLng must be coordinates");
    }
    let found;
    try {
        found = await getRoute(from, to);
    } catch (err) {
        console.log(`[route] ${err.message}`);
        throw new HttpError(503, "Route service unavailable");
    }
    if (!found) {
        throw new HttpError(404, "No route found");
    }
    res.status(200).json(found);
});

export default { reverse, route };
