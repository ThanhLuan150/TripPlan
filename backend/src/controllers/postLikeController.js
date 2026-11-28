import postLikeService from "../services/postLikeService.js";
import asyncHandler from "../utils/asyncHandler.js";

const like = asyncHandler(async (req, res) => {
    res.status(200).json(await postLikeService.like(req.user, req.params.id));
});

const unlike = asyncHandler(async (req, res) => {
    res.status(200).json(await postLikeService.unlike(req.user, req.params.id));
});

export default { like, unlike };
