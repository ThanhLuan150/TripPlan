import userRepository from "../repositories/userRepository.js";
import HttpError from "../utils/HttpError.js";

const PROFILE_FIELDS = ["fullname", "email", "phone", "address", "image"];

const updateProfile = async (userId, body) => {
    // only the fields the client sent, so a missing field is not wiped
    const update = {};
    for (const key of PROFILE_FIELDS) {
        if (body[key] !== undefined) {
            update[key] = body[key];
        }
    }
    if (Object.keys(update).length === 0) {
        throw new HttpError(400, "Please provide full information fullname, email, phone, address");
    }
    update.updatedAt = new Date();
    await userRepository.updateById(userId, update);
    return { message: "Update profile successfully" };
};

// A user deletes their own account; an admin may delete any account by id.
const deleteAccount = async (actor, targetId) => {
    const id = actor.role === "admin" && targetId ? targetId : actor._id;
    const user = await userRepository.updateById(id, { isActive: "delete" });
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    return { message: "Delete Acount successfully" };
};

export default { updateProfile, deleteAccount };
