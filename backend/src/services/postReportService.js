import mongoose from "mongoose";
import contentRepository from "../repositories/contentRepository.js";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import userRepository from "../repositories/userRepository.js";
import { MAX_REPORT_DETAILS, REPORT_REASONS } from "../models/ContentReport.js";
import HttpError from "../utils/HttpError.js";

// Reports of posts (public trips) go to the same ContentReport collection as every other
// report of the app, with type "post" and the id of the post. The reporter comes from the
// token, is stored for the admins only, and is never part of any answer: the author of the post
// (or anybody else) cannot learn who reported it, or even that a report exists.

const TYPE = "post";
const DUPLICATE = "You already reported this post";

const cleanDetails = (value, required) => {
    if (value === undefined || value === null || value === "") {
        if (required) {
            throw new HttpError(400, "description is required when the reason is other");
        }
        return undefined;
    }
    if (typeof value !== "string") {
        throw new HttpError(400, "description must be text");
    }
    const details = value.trim();
    if (required && !details) {
        throw new HttpError(400, "description is required when the reason is other");
    }
    if (details.length > MAX_REPORT_DETAILS) {
        throw new HttpError(400, `description must be at most ${MAX_REPORT_DETAILS} characters`);
    }
    return details || undefined;
};

// One report per user per post. Own posts cannot be reported; private, deleted, unknown and
// malformed ids all give the same 404.
const report = async (actor, postId, body = {}) => {
    const post = mongoose.isValidObjectId(postId) ? await tripPlanRepository.findPublicById(String(postId)) : null;
    if (!post) {
        throw new HttpError(404, "Post not found");
    }
    if (!REPORT_REASONS.includes(body.reason)) {
        throw new HttpError(400, `reason must be one of: ${REPORT_REASONS.join(", ")}`);
    }
    const details = cleanDetails(body.description, body.reason === "other");
    if (String(post.userId) === String(actor._id)) {
        throw new HttpError(400, "You cannot report your own post");
    }
    if (await contentRepository.reportExists(actor._id, TYPE, post._id)) {
        throw new HttpError(409, DUPLICATE);
    }
    const owner = post.userId ? await userRepository.findById(post.userId) : null;
    try {
        await contentRepository.createReport({
            type: TYPE,
            reason: body.reason,
            // what the admins see in the list: the post as it was when it was reported
            content: [post.nameTrip, post.location].filter(Boolean).join(" - ").slice(0, 500) || String(post._id),
            authorName: owner?.username ?? "",
            reporterId: actor._id,
            targetId: post._id,
            ...(details ? { details } : {}),
        });
    } catch (err) {
        // two requests at the same moment: the unique index lets only one through
        if (err?.code === 11000) {
            throw new HttpError(409, DUPLICATE);
        }
        throw err;
    }
    return { message: "Report sent successfully" };
};

export default { report };
