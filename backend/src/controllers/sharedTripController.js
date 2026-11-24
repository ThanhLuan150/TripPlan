import tripShareService from "../services/tripShareService.js";
import asyncHandler from "../utils/asyncHandler.js";

// Public (no sign-in): the token in the url is the only credential.
const getSharedTrip = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store"); // a revoked link must stop working at once
    res.set("Referrer-Policy", "no-referrer");
    res.status(200).json(await tripShareService.getSharedTrip(req.params.token));
});

export default { getSharedTrip };
