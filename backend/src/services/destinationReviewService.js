import mongoose from "mongoose";
import destinationReviewRepository from "../repositories/destinationReviewRepository.js";
import { MAX_RATING, MAX_REVIEW_LENGTH, MIN_RATING } from "../models/DestinationReview.js";
import { findProvince } from "../utils/provinces.js";
import HttpError from "../utils/HttpError.js";

// Destination reviews. A destination is a province of the app. Every write takes the CALLER
// from the token (never a user id from the client), and only the author can change or delete
// a review.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Exact province name, else the same 404 whatever was sent (missing, wrong type, unknown).
const resolveDestination = (value) => {
    const destination = findProvince(value);
    if (!destination) {
        throw new HttpError(404, "Destination not found");
    }
    return destination;
};

// Whole number from the query string, else the fallback (never trusts the raw value).
const intOr = (value, fallback, min, max) => {
    const n = Number.parseInt(String(value), 10);
    return Number.isInteger(n) ? Math.min(Math.max(n, min), max) : fallback;
};

// Rating: a whole number of stars in the scale. "4" from a form is fine; 4.5, 0, 6 and "abc" are not.
const cleanRating = (value) => {
    const rating = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
        throw new HttpError(400, `rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}`);
    }
    return rating;
};

const cleanContent = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new HttpError(400, "content is required");
    }
    const content = value.trim();
    if (content.length > MAX_REVIEW_LENGTH) {
        throw new HttpError(400, `content must be at most ${MAX_REVIEW_LENGTH} characters`);
    }
    return content;
};

// Average of all the ratings with one decimal (4.33 -> 4.3); null while there is no review.
const roundAverage = (average) => (average === null || average === undefined ? null : Math.round(average * 10) / 10);

const toSummary = ({ average, count }) => ({ average: roundAverage(average), count });

// What a visitor sees of a review: the text, the stars and the author's public name. Nothing else
// of the author (no e-mail), and `mine` tells the client which one it may edit.
const toReview = (review, viewerId) => {
    const populated = review.userId && typeof review.userId === "object" && "username" in review.userId ? review.userId : null;
    const authorId = String(populated?._id ?? review.userId);
    return {
        _id: String(review._id),
        destination: review.destination,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        author: { _id: authorId, username: populated?.username ?? "", image: populated?.image ?? null },
        mine: Boolean(viewerId) && authorId === String(viewerId),
    };
};

// Reviews of one destination, newest first, paged, with the average over ALL of them.
// viewer may be null (not signed in): then mine is false everywhere and myReview is null.
const list = async (viewer, { destination, page, limit } = {}) => {
    const name = resolveDestination(destination);
    const size = intOr(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const current = intOr(page, 1, 1, 100000);
    const [rows, total, summary, mine] = await Promise.all([
        destinationReviewRepository.listByDestination(name, (current - 1) * size, size),
        destinationReviewRepository.countByDestination(name),
        destinationReviewRepository.summarize(name),
        viewer ? destinationReviewRepository.findByUser(viewer._id, name) : null,
    ]);
    return {
        message: "Get destination reviews successfully",
        destination: name,
        summary: toSummary(summary),
        page: current,
        limit: size,
        total,
        items: rows.map((row) => toReview(row, viewer?._id)),
        // the caller's own review (wherever it is in the list) so the client can offer "edit" instead of the form
        myReview: mine ? toReview({ ...mine.toObject?.() ?? mine, userId: { _id: viewer._id, username: viewer.username, image: viewer.image } }, viewer._id) : null,
    };
};

const DUPLICATE = "You already reviewed this destination, edit your review instead";

const create = async (actor, body = {}) => {
    const destination = resolveDestination(body.destination);
    const rating = cleanRating(body.rating);
    const content = cleanContent(body.content);
    if (await destinationReviewRepository.findByUser(actor._id, destination)) {
        throw new HttpError(409, DUPLICATE);
    }
    let review;
    try {
        review = await destinationReviewRepository.create({ destination, userId: actor._id, rating, content });
    } catch (err) {
        // two requests at the same moment: the unique index lets only one through
        if (err?.code === 11000) {
            throw new HttpError(409, DUPLICATE);
        }
        throw err;
    }
    return {
        message: "Review created successfully",
        review: toReview(review, actor._id),
        summary: toSummary(await destinationReviewRepository.summarize(destination)),
    };
};

// The review of `id` when it exists and belongs to the caller; 404 for an unknown or malformed
// id, 403 for somebody else's review.
const ownReview = async (actor, id) => {
    const review = mongoose.isValidObjectId(id) ? await destinationReviewRepository.findById(String(id)) : null;
    if (!review) {
        throw new HttpError(404, "Review not found");
    }
    if (String(review.userId) !== String(actor._id)) {
        throw new HttpError(403, "You can only change your own review");
    }
    return review;
};

// Only rating and content change: the destination and the author never do.
const update = async (actor, id, body = {}) => {
    const review = await ownReview(actor, id);
    const changes = {};
    if (body.rating !== undefined) {
        changes.rating = cleanRating(body.rating);
    }
    if (body.content !== undefined) {
        changes.content = cleanContent(body.content);
    }
    if (Object.keys(changes).length === 0) {
        throw new HttpError(400, "Nothing to update");
    }
    const saved = await destinationReviewRepository.updateById(review._id, changes);
    return {
        message: "Review updated successfully",
        review: toReview(saved, actor._id),
        summary: toSummary(await destinationReviewRepository.summarize(review.destination)),
    };
};

const remove = async (actor, id) => {
    const review = await ownReview(actor, id);
    await destinationReviewRepository.deleteById(review._id);
    return {
        message: "Review deleted successfully",
        summary: toSummary(await destinationReviewRepository.summarize(review.destination)),
    };
};

export default { list, create, update, remove };
