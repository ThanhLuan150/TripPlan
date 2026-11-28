import followService from "../services/followService.js";
import asyncHandler from "../utils/asyncHandler.js";

const getProfile = asyncHandler(async (req, res) => {
    res.status(200).json(await followService.getProfile(req.user, req.params.id));
});

const follow = asyncHandler(async (req, res) => {
    res.status(200).json(await followService.follow(req.user, req.params.id));
});

const unfollow = asyncHandler(async (req, res) => {
    res.status(200).json(await followService.unfollow(req.user, req.params.id));
});

export default { getProfile, follow, unfollow };
