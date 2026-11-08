import mongoose from "mongoose";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import chatRepository from "../repositories/chatRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";

// Ownership checks, after `authenticate`: the resource must belong to req.user.
// Each one loads the resource onto req so the controller does not query it again.

// req.params.id is a (not deleted) trip of the user -> req.trip
export const ownTrip = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const trip = mongoose.isValidObjectId(id) ? await tripPlanRepository.findOwnedById(id, req.user._id) : null;
    if (!trip) {
        throw new HttpError(404, "Data Trip not found!");
    }
    req.trip = trip;
    next();
});

// req.params.id is a conversation of the user -> req.chat
export const ownChat = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const chat = mongoose.isValidObjectId(id) ? await chatRepository.findOwned(id, req.user._id) : null;
    if (!chat) {
        throw new HttpError(404, "This conversation does not exist");
    }
    req.chat = chat;
    next();
});

// req.body.chaId is a challenge of one of the user's trips -> req.challengeProgress
export const ownChallenge = asyncHandler(async (req, res, next) => {
    const { chaId } = req.body;
    const progress = mongoose.isValidObjectId(chaId)
        ? await challengeProgressRepository.findOne(req.user._id, chaId)
        : null;
    if (!progress) {
        throw new HttpError(404, "Challenge not found");
    }
    req.challengeProgress = progress;
    next();
});
