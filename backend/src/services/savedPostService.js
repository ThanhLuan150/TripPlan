import mongoose from "mongoose";
import savedPostRepository from "../repositories/savedPostRepository.js";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import HttpError from "../utils/HttpError.js";

// Saved posts ("read later"). A post is a public trip. Every function takes the CALLER from
// the token (never a user id from the client): the list of saved posts is private, so there
// is no way to ask for somebody else's.

const NOT_FOUND = "Post not found";
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// Only a post that is public and not deleted can be saved. Private, deleted, unknown and
// malformed ids all give the same 404.
const findPost = async (tripId) => {
    const post = mongoose.isValidObjectId(tripId) ? await tripPlanRepository.findPublicById(String(tripId)) : null;
    if (!post) {
        throw new HttpError(404, NOT_FOUND);
    }
    return post;
};

// Idempotent: saving again keeps one row and still answers 200.
const save = async (actor, tripId) => {
    const post = await findPost(tripId);
    await savedPostRepository.add(actor._id, post._id);
    return { message: "Saved", saved: true };
};

// Idempotent: unsaving a post you did not save is a no-op (200, saved: false). Only the
// caller's own row is ever deleted. The row is removed even when the post is gone or went
// private, so it can always be cleaned up; that case still answers 404.
const unsave = async (actor, tripId) => {
    if (!mongoose.isValidObjectId(tripId)) {
        throw new HttpError(404, NOT_FOUND);
    }
    await savedPostRepository.remove(actor._id, tripId);
    await findPost(tripId);
    return { message: "Unsaved", saved: false };
};

// Whole number from the query string, else the fallback (never trusts the raw value).
const intOr = (value, fallback, min, max) => {
    const n = Number.parseInt(String(value), 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
};

// The caller's saved posts, newest save first, paged. Posts deleted or made private since
// are left out (their rows stay, so the post comes back if it turns public again).
const listSaved = async (actor, { page, limit } = {}) => {
    const size = intOr(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const current = intOr(page, 1, 1, 100000);
    const savedIds = await savedPostRepository.tripIdsByUser(actor._id);
    const visible = new Set(savedIds.length ? await tripPlanRepository.findPublicIdsIn(savedIds) : []);
    const ids = savedIds.filter((id) => visible.has(id));
    const pageIds = ids.slice((current - 1) * size, current * size);
    const cards = pageIds.length ? await tripPlanRepository.listPublicByIds(pageIds) : [];
    const byId = new Map(cards.map((card) => [String(card._id), card]));
    const items = pageIds.filter((id) => byId.has(id)).map((id) => ({ ...byId.get(id), saved: true }));
    return { message: "Get saved posts successfully", page: current, limit: size, total: ids.length, items };
};

// Save info of one post for a visitor; viewer may be null (not signed in: saved is false).
const getState = async (viewer, tripId) => ({
    saved: viewer ? await savedPostRepository.exists(viewer._id, tripId) : false,
});

// Adds saved to a page of cards (one query for the whole page).
const decorate = async (viewer, items) => {
    const saved = viewer ? await savedPostRepository.savedTripIds(viewer._id, items.map((item) => item._id)) : [];
    const savedSet = new Set(saved);
    return items.map((item) => ({ ...item, saved: savedSet.has(String(item._id)) }));
};

export default { save, unsave, listSaved, getState, decorate };
