import destinationReviewService from "../services/destinationReviewService.js";
import asyncHandler from "../utils/asyncHandler.js";

const list = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store"); // a new, edited or deleted review must show at once
    res.status(200).json(await destinationReviewService.list(req.user ?? null, req.query));
});

const create = asyncHandler(async (req, res) => {
    res.status(201).json(await destinationReviewService.create(req.user, req.body));
});

const update = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationReviewService.update(req.user, req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
    res.status(200).json(await destinationReviewService.remove(req.user, req.params.id));
});

export default { list, create, update, remove };
