import userService from "../services/userService.js";
import travelPreferenceService from "../services/travelPreferenceService.js";
import asyncHandler from "../utils/asyncHandler.js";

const updateProfile = asyncHandler(async (req, res) => {
    res.status(200).json(await userService.updateProfile(req.user._id, req.body));
});

const deleteAccount = asyncHandler(async (req, res) => {
    res.status(200).json(await userService.deleteAccount(req.user, req.params.id));
});

const getPreferences = asyncHandler(async (req, res) => {
    res.status(200).json(await travelPreferenceService.get(req.user._id));
});

const savePreferences = asyncHandler(async (req, res) => {
    res.status(200).json(await travelPreferenceService.save(req.user._id, req.body));
});

const clearPreferences = asyncHandler(async (req, res) => {
    res.status(200).json(await travelPreferenceService.clear(req.user._id));
});

export default { updateProfile, deleteAccount, getPreferences, savePreferences, clearPreferences };
