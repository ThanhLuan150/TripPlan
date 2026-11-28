import savedPostService from "../services/savedPostService.js";
import asyncHandler from "../utils/asyncHandler.js";

const save = asyncHandler(async (req, res) => {
    res.status(200).json(await savedPostService.save(req.user, req.params.id));
});

const unsave = asyncHandler(async (req, res) => {
    res.status(200).json(await savedPostService.unsave(req.user, req.params.id));
});

// Always the caller's own list: no user id is read from the request.
const listSaved = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store"); // private to the user and must reflect unsaves at once
    res.status(200).json(await savedPostService.listSaved(req.user, req.query));
});

export default { save, unsave, listSaved };
