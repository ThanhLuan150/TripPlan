import userService from "../services/userService.js";
import asyncHandler from "../utils/asyncHandler.js";

const updateProfile = asyncHandler(async (req, res) => {
    res.status(200).json(await userService.updateProfile(req.user._id, req.body));
});

const deleteAccount = asyncHandler(async (req, res) => {
    res.status(200).json(await userService.deleteAccount(req.user, req.params.id));
});

export default { updateProfile, deleteAccount };
