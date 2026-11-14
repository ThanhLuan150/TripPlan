import { getProvinceFromCoordinates } from "../utils/geocode.js";
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

export default { reverse };
