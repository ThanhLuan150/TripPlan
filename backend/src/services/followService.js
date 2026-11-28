import mongoose from "mongoose";
import followRepository from "../repositories/followRepository.js";
import userRepository from "../repositories/userRepository.js";
import HttpError from "../utils/HttpError.js";

// Follow relations between accounts. Every function takes the CALLER from the token
// (never a follower id from the client), so nobody can follow on behalf of someone else.

// The target must exist and be usable: a missing / deleted / not confirmed account is 404,
// a suspended (blocked) one is 403.
const findTarget = async (targetId) => {
    if (!mongoose.isValidObjectId(targetId)) {
        throw new HttpError(404, "User not found");
    }
    const target = await userRepository.findById(targetId);
    if (!target || target.isActive === "delete" || target.isActive === "notActive") {
        throw new HttpError(404, "User not found");
    }
    if (target.isActive === "suspended") {
        throw new HttpError(403, "This account is suspended");
    }
    return target;
};

const isSelf = (actorId, targetId) => String(actorId) === String(targetId);

const state = async (actorId, targetId) => ({
    following: await followRepository.exists(actorId, targetId),
    followersCount: await followRepository.countFollowers(targetId),
    followingCount: await followRepository.countFollowing(targetId),
});

// Public profile of another account: nothing private (no email, phone, address).
// "me" is the signed-in user (the client does not store its own id).
const getProfile = async (actor, targetId) => {
    const target = await findTarget(targetId === "me" ? actor._id : targetId);
    return {
        user: {
            id: String(target._id),
            fullname: target.fullname || target.username,
            image: target.image,
            backgroundImage: target.backgroundImage,
            experience: target.experience ?? 0,
            isSelf: isSelf(actor._id, target._id),
            ...(await state(actor._id, target._id)),
        },
    };
};

const follow = async (actor, targetId) => {
    const target = await findTarget(targetId);
    if (isSelf(actor._id, target._id)) {
        throw new HttpError(400, "You cannot follow yourself");
    }
    await followRepository.add(actor._id, target._id);
    return { message: "Followed", ...(await state(actor._id, target._id)) };
};

// Idempotent: unfollowing someone you do not follow is a no-op (200, following: false).
// Only the caller's own relation (followerId = token user) is ever deleted, so another
// account's follow can never be removed. A suspended / deleted account can still be
// unfollowed, otherwise a relation to it could never be cleaned up.
const unfollow = async (actor, targetId) => {
    if (!mongoose.isValidObjectId(targetId)) {
        throw new HttpError(404, "User not found");
    }
    const target = await userRepository.findById(targetId);
    await followRepository.remove(actor._id, targetId);
    if (!target) {
        // the account is gone: the dangling relation is cleaned above
        throw new HttpError(404, "User not found");
    }
    return { message: "Unfollowed", ...(await state(actor._id, target._id)) };
};

export default { getProfile, follow, unfollow };
