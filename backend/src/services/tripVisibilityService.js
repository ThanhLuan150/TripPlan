import mongoose from "mongoose";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import { buildPublicTripView } from "./tripShareService.js";
import env from "../config/env.js";
import tripService from "./tripService.js";
import postLikeService from "./postLikeService.js";
import savedPostService from "./savedPostService.js";
import HttpError from "../utils/HttpError.js";
import { cleanKeyword } from "../utils/searchPattern.js";

export const VISIBILITIES = ["private", "public"];

// Trips saved before this field existed have no value: they are private.
export const visibilityOf = (trip) => (trip?.visibility === "public" ? "public" : "private");

// Page where anyone can open a public trip (null: private, or WEB_URL not set so the client builds it).
export const publicUrlOf = (tripId, visibility) =>
    visibility === "public" && env.webUrl ? `${env.webUrl}/trip/${tripId}` : null;

// trip: loaded by ownTrip (owned by the user, not deleted)
const getVisibility = async (trip) => ({
    message: "Get trip visibility successfully",
    tripId: trip._id,
    visibility: visibilityOf(trip),
    publicUrl: publicUrlOf(trip._id, visibilityOf(trip)),
});

// Only the owner gets here (ownTrip). Idempotent. Going private also revokes the share
// link, so "private" really means nobody but the owner can open the trip any more.
const setVisibility = async (trip, visibility) => {
    if (typeof visibility !== "string" || !VISIBILITIES.includes(visibility)) {
        throw new HttpError(400, `visibility must be one of: ${VISIBILITIES.join(", ")}`);
    }
    if (visibilityOf(trip) !== visibility) {
        await tripPlanRepository.setVisibility(trip._id, visibility);
    }
    if (visibility === "private" && trip.shareEnabled === true) {
        await tripPlanRepository.disableShare(trip._id);
    }
    return { message: "Trip visibility updated", tripId: trip._id, visibility, publicUrl: publicUrlOf(trip._id, visibility) };
};

// Read only view for anyone (no sign-in). Private, deleted, unknown or malformed id all
// give the same 404, so the answer never tells whether a private trip exists.
// viewer: the signed-in user or null; the answer carries the like state of the post.
const getPublicTrip = async (id, viewer = null) => {
    const trip = mongoose.isValidObjectId(id) ? await tripPlanRepository.findPublicById(String(id)) : null;
    if (!trip) {
        throw new HttpError(404, "Data Trip not found!");
    }
    return {
        message: "Get public trip successfully",
        tripDatas: await buildPublicTripView(trip),
        ...(await postLikeService.getState(viewer, trip._id)),
        ...(await savedPostService.getState(viewer, trip._id)),
    };
};

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// Whole number from the query string, else the fallback (never trusts the raw value).
const intOr = (value, fallback, min, max) => {
    const n = Number.parseInt(String(value), 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
};

// Public trips for everyone to browse (no sign-in): cards only, newest first, paged.
// q (optional): search by trip name, destination or introduction; a bad keyword is a 400.
const listPublicTrips = async ({ page, limit, q } = {}, viewer = null) => {
    const { keyword, error } = cleanKeyword(q);
    if (error) {
        throw new HttpError(400, error);
    }
    const size = intOr(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const current = intOr(page, 1, 1, 100000);
    const [items, total] = await Promise.all([
        tripPlanRepository.listPublic((current - 1) * size, size, keyword),
        tripPlanRepository.countPublic(keyword),
    ]);
    return { message: "Get public trips successfully", q: keyword, page: current, limit: size, total, items: await savedPostService.decorate(viewer, await postLikeService.decorate(viewer, items)) };
};

// A signed-in user keeps a copy of a public trip: the copy is theirs and private, the
// original is only read. Private, deleted, unknown or malformed ids give the usual 404.
const copyPublicTrip = async (id, userId) => {
    const trip = mongoose.isValidObjectId(id) ? await tripPlanRepository.findPublicById(String(id)) : null;
    if (!trip) {
        throw new HttpError(404, "Data Trip not found!");
    }
    return tripService.duplicateTrip(trip, userId);
};

export default { getVisibility, setVisibility, getPublicTrip, listPublicTrips, copyPublicTrip };
