import challengeService from "../services/challengeService.js";
import asyncHandler from "../utils/asyncHandler.js";

const checkProgress = asyncHandler(async (req, res) => {
    res.status(200).json(await challengeService.checkProgress(req.challengeProgress, req.body));
});

const updateProgress = asyncHandler(async (req, res) => {
    res.status(200).json(await challengeService.completeChallenge(req.challengeProgress, req.user._id, req.body));
});

export default { checkProgress, updateProgress };
