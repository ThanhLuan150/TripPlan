import tripPlanRepository from "../repositories/tripPlanRepository.js";
import tripDayRepository from "../repositories/tripDayRepository.js";
import tripVisibilityService, { publicUrlOf, visibilityOf } from "./tripVisibilityService.js";
import HttpError from "../utils/HttpError.js";

// Share a trip as a post of the Travel Community. The post IS the public trip: it is linked by
// the trip's own id and carries only the author's introduction, so the plan is never copied and
// the reader always sees the current plan. Only the owner gets here (ownTrip), and a trip is
// published only by this explicit action: nothing makes a private trip public by itself.

export const MAX_POST_LENGTH = 1000;

const statusOf = (trip) => {
    const posted = visibilityOf(trip) === "public";
    return {
        tripId: trip._id,
        isPosted: posted,
        visibility: visibilityOf(trip),
        content: posted ? trip.postContent ?? "" : "",
        postedAt: posted ? trip.postedAt ?? null : null,
        publicUrl: publicUrlOf(trip._id, visibilityOf(trip)),
    };
};

// trip: loaded by ownTrip (owned by the user, not deleted)
const getPost = async (trip) => ({ message: "Get trip post successfully", ...statusOf(trip) });

// The introduction is optional text; anything else than text or too long is rejected.
const cleanContent = (value) => {
    if (value === undefined || value === null) {
        return "";
    }
    if (typeof value !== "string") {
        throw new HttpError(400, "content must be text");
    }
    const content = value.trim();
    if (content.length > MAX_POST_LENGTH) {
        throw new HttpError(400, `content must be at most ${MAX_POST_LENGTH} characters`);
    }
    return content;
};

// Publishes the trip with the introduction. Sharing again only changes the introduction
// (the date of the first share stays), so it is idempotent. A trip without any day has
// nothing to show, so it cannot be shared yet.
const sharePost = async (trip, body = {}) => {
    const content = cleanContent(body.content);
    if ((await tripDayRepository.findByTripId(trip._id)).length === 0) {
        throw new HttpError(400, "Add at least one day to the trip before sharing it");
    }
    const alreadyPosted = visibilityOf(trip) === "public";
    const postedAt = alreadyPosted && trip.postedAt ? trip.postedAt : new Date();
    const updated = await tripPlanRepository.setPost(trip._id, content, postedAt);
    return { message: alreadyPosted ? "Post updated" : "Trip shared as a post", ...statusOf(updated ?? { ...trip, visibility: "public", postContent: content, postedAt }) };
};

// Removes the post: the trip goes back to private (and its share link is revoked, exactly like
// turning the visibility off) and the introduction is dropped. The trip itself is kept.
// Idempotent.
const removePost = async (trip) => {
    await tripVisibilityService.setVisibility(trip, "private");
    return { message: "Post removed", ...statusOf({ _id: trip._id, visibility: "private" }) };
};

export default { getPost, sharePost, removePost };
