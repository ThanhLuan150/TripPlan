import { getDistance } from "geolib";
import challengeRepository from "../repositories/challengeRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import userRepository from "../repositories/userRepository.js";
import HttpError from "../utils/HttpError.js";

export const MAX_DISTANCE_METERS = 250;

// How far the user is from the challenge's location.
const checkProgress = async (progress, { lat, lng }) => {
    const challenge = await challengeRepository.findById(progress.chaId);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }
    if (!challenge.latitude || !challenge.longitude) {
        throw new HttpError(400, "This challenge has no location");
    }
    if (lat === undefined || lng === undefined) {
        throw new HttpError(400, "Missing lat / lng");
    }
    const distance = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: challenge.latitude, longitude: challenge.longitude },
    );
    if (distance > MAX_DISTANCE_METERS) {
        return { message: "Please complete the mission at the location provided", distance };
    }
    return { message: "Complete the challenge", distance };
};

// Save the photo; the first time the challenge is completed the user earns its points.
const completeChallenge = async (progress, userId, { imageUrl }) => {
    const challenge = await challengeRepository.setImage(progress.chaId, imageUrl);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }
    if (!progress.completed) {
        await challengeProgressRepository.markCompleted(progress._id);
        await userRepository.incrementExperience(userId, challenge.points ?? 0);
    }
    return { message: "Update Progress challenge Successfully" };
};

export default { checkProgress, completeChallenge };
