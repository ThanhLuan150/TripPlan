import User from "../models/User.js";

const findById = (id) => User.findById(id);

const findByUsername = (username) => User.findOne({ username: username?.toLowerCase() });

const findByEmail = (email) => User.findOne({ email: email?.toLowerCase() });

const findByUsernameOrEmail = (username, email) =>
    User.findOne({
        $or: [
            { username: username?.toLowerCase() },
            { email: email?.toLowerCase() },
        ],
    });

// Account confirmation: match the code, and the email when the client sends it.
const findByCode = (code, email) =>
    User.findOne(email ? { code, email: email.toLowerCase() } : { code });

const create = (data) => User.create(data);

const updateById = (id, update) => User.findByIdAndUpdate(id, update, { new: true });

const incrementExperience = (id, points) =>
    User.findByIdAndUpdate(id, { $inc: { experience: points } }, { new: true });

// "Điểm cao nhất" ranking
const topByExperience = (limit = 100) =>
    User.aggregate([
        { $match: { isActive: "active", role: { $ne: "admin" } } },
        { $sort: { experience: -1 } },
        { $limit: limit },
        { $project: { _id: "$_id", fullname: "$fullname", experience: "$experience", image: "$image" } },
    ]);

export default {
    findById,
    findByUsername,
    findByEmail,
    findByUsernameOrEmail,
    findByCode,
    create,
    updateById,
    incrementExperience,
    topByExperience,
};
