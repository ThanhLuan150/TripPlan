import mongoose from "mongoose";
import postLikeRepository from "../repositories/postLikeRepository.js";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import HttpError from "../utils/HttpError.js";

// Likes on posts. A post is a public trip. Every function takes the CALLER from the token
// (never a user id from the client), so nobody can like or unlike on behalf of someone else.

const NOT_FOUND = "Post not found";

const state = async (userId, tripId) => ({
    liked: await postLikeRepository.exists(userId, tripId),
    likesCount: await postLikeRepository.countByTrip(tripId),
});

// Only a post that is public and not deleted can be liked. Private, deleted, unknown and
// malformed ids all give the same 404.
const findPost = async (tripId) => {
    const post = mongoose.isValidObjectId(tripId) ? await tripPlanRepository.findPublicById(String(tripId)) : null;
    if (!post) {
        throw new HttpError(404, NOT_FOUND);
    }
    return post;
};

// Idempotent: liking again keeps one like and still answers 200 with the real state.
const like = async (actor, tripId) => {
    const post = await findPost(tripId);
    await postLikeRepository.add(actor._id, post._id);
    return { message: "Liked", ...(await state(actor._id, post._id)) };
};

// Idempotent: unliking a post you did not like is a no-op (200, liked: false). Only the
// caller's own like is ever deleted. The like is removed even when the post is gone or
// went private, so it can always be cleaned up; that case still answers 404.
const unlike = async (actor, tripId) => {
    if (!mongoose.isValidObjectId(tripId)) {
        throw new HttpError(404, NOT_FOUND);
    }
    await postLikeRepository.remove(actor._id, tripId);
    const post = await findPost(tripId);
    return { message: "Unliked", ...(await state(actor._id, post._id)) };
};

// Like info of one post for a visitor; viewer may be null (not signed in: liked is false).
const getState = async (viewer, tripId) => ({
    liked: viewer ? await postLikeRepository.exists(viewer._id, tripId) : false,
    likesCount: await postLikeRepository.countByTrip(tripId),
});

// Adds likesCount and liked to a page of cards (two queries for the whole page).
const decorate = async (viewer, items) => {
    const ids = items.map((item) => item._id);
    const [counts, liked] = await Promise.all([
        postLikeRepository.countByTrips(ids),
        viewer ? postLikeRepository.likedTripIds(viewer._id, ids) : [],
    ]);
    const likedSet = new Set(liked);
    return items.map((item) => ({ ...item, likesCount: counts[String(item._id)] ?? 0, liked: likedSet.has(String(item._id)) }));
};

export default { like, unlike, getState, decorate };
