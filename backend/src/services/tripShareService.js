import crypto from "node:crypto";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import tripDayRepository from "../repositories/tripDayRepository.js";
import challengeRepository from "../repositories/challengeRepository.js";
import env from "../config/env.js";
import HttpError from "../utils/HttpError.js";

// 32 random bytes as base64url = 43 characters: not guessable, safe in a URL.
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const newShareToken = () => crypto.randomBytes(32).toString("base64url");

const statusOf = (trip) => {
    const shared = trip.shareEnabled === true && !!trip.shareToken;
    return {
        isShared: shared,
        permission: shared ? trip.sharePermission ?? "view" : null,
        shareToken: shared ? trip.shareToken : null,
        // full link when WEB_URL is set (null: the client builds it from its own address)
        shareUrl: shared && env.webUrl ? `${env.webUrl}/shared/${trip.shareToken}` : null,
        sharedAt: shared ? trip.sharedAt ?? null : null,
    };
};

// trip: loaded by ownTrip (owned by the user, not deleted)
const getShareStatus = async (trip) => ({ message: "Get share status successfully", ...statusOf(trip) });

// Idempotent: while sharing is on the same link is returned (not a new one each time).
const enableShare = async (trip) => {
    if (trip.shareEnabled === true && trip.shareToken) {
        return { message: "Trip is shared", ...statusOf(trip) };
    }
    const updated = await tripPlanRepository.enableShare(trip._id, newShareToken());
    return { message: "Trip is shared", ...statusOf(updated) };
};

// Removes the token: the old link is dead for good (sharing again makes a new link).
const disableShare = async (trip) => {
    await tripPlanRepository.disableShare(trip._id);
    return { message: "Sharing turned off", ...statusOf({}) };
};

// What a visitor (share link or public trip) may see: the plan only. Nothing about the
// owner (id, e-mail, name), the owner's progress, check-in photos or share settings.
export const buildPublicTripView = async (trip) => {
    const days = await tripDayRepository.findByTripId(trip._id);
    const dataTripDays = await Promise.all(days.map(async (day) => {
        const challenges = await challengeRepository.findByTripDayId(day._id);
        return {
            title: day.title,
            day: day.day,
            dayOfWeek: day.dayOfWeek,
            date: day.date,
            transportCost: day.transportCost,
            foodCost: day.foodCost,
            otherCost: day.otherCost,
            challenges: challenges.map((c) => ({
                _id: c._id,
                challengeSummary: c.challengeSummary,
                nameLocation: c.nameLocation,
                location: c.location,
                latitude: c.latitude,
                longitude: c.longitude,
                points: c.points,
            })),
        };
    }));
    return {
        nameTrip: trip.nameTrip,
        location: trip.location,
        startDate: trip.startDate,
        endDate: trip.endDate,
        transportCostTotal: trip.transportCostTotal,
        foodCostTotal: trip.foodCostTotal,
        otherCostTotal: trip.otherCostTotal,
        postContent: trip.postContent,
        postedAt: trip.postedAt,
        dataTripDays,
    };
};

const getSharedTrip = async (token) => {
    const trip = SHARE_TOKEN_PATTERN.test(String(token)) ? await tripPlanRepository.findSharedByToken(token) : null;
    if (!trip) {
        // same answer for malformed, unknown, revoked and deleted: nothing to tell apart
        throw new HttpError(404, "This shared link is invalid or has been turned off");
    }
    return {
        message: "Get shared trip successfully",
        permission: trip.sharePermission ?? "view",
        tripDatas: await buildPublicTripView(trip),
    };
};

export default { getShareStatus, enableShare, disableShare, getSharedTrip };
