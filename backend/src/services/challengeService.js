import { getDistance } from "geolib";
import challengeRepository from "../repositories/challengeRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import userRepository from "../repositories/userRepository.js";
import tripDayRepository from "../repositories/tripDayRepository.js";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import { getLocationFromNameLocation } from "../utils/geocode.js";
import HttpError from "../utils/HttpError.js";

export const MAX_DISTANCE_METERS = 250;

// A challenge saved while the place lookup was down has no coordinates: look
// the place up now (with the province of its trip) and keep the result, so the
// user can check in. Returns the challenge's latitude / longitude, or null.
const locate = async (challenge) => {
    if (challenge.latitude && challenge.longitude) {
        return { latitude: challenge.latitude, longitude: challenge.longitude };
    }
    const day = await tripDayRepository.findById(challenge.tripDayId);
    const trip = day ? await tripPlanRepository.findById(day.tripId) : null;
    const place =
        (await getLocationFromNameLocation(challenge.nameLocation, trip?.location ?? "")) ??
        (challenge.location ? await getLocationFromNameLocation(challenge.location, "") : undefined);
    if (!place) {
        return null;
    }
    await challengeRepository.setCoordinates(challenge._id, place.latitude, place.longitude);
    return { latitude: place.latitude, longitude: place.longitude };
};

// How far the user is from the challenge's location.
const checkProgress = async (progress, { lat, lng }) => {
    const challenge = await challengeRepository.findById(progress.chaId);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }
    if (lat === undefined || lng === undefined) {
        throw new HttpError(400, "Missing lat / lng");
    }
    const place = await locate(challenge);
    if (!place) {
        throw new HttpError(400, "This challenge has no location");
    }
    const distance = getDistance({ latitude: lat, longitude: lng }, place);
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
