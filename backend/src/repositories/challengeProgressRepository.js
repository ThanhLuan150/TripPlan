import UserChallengeProgress from "../models/UserChallengeProgress.js";

const create = (userId, chaId) => UserChallengeProgress.create({ userId, chaId });

const findOne = (userId, chaId) => UserChallengeProgress.findOne({ userId, chaId });

const findByUserAndChallenges = (userId, chaIds) =>
    UserChallengeProgress.find({ userId, chaId: { $in: chaIds } });

const markCompleted = (id) =>
    UserChallengeProgress.findByIdAndUpdate(id, { completed: true, endAt: new Date() }, { new: true });

// Sum of points of the challenges completed in the given period, per user.
const rankingByPeriod = ($expr) =>
    UserChallengeProgress.aggregate([
        { $match: { completed: true, $expr } },
        { $lookup: { from: "challenges", localField: "chaId", foreignField: "_id", as: "challenge" } },
        { $unwind: "$challenge" },
        { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        // the ranking is for travellers: no administrators, no blocked or deleted accounts
        { $match: { "user.role": { $ne: "admin" }, "user.isActive": "active" } },
        {
            $group: {
                _id: "$userId",
                fullname: { $first: "$user.fullname" },
                experience: { $sum: "$challenge.points" },
                image: { $first: "$user.image" },
            },
        },
        { $sort: { experience: -1 } },
    ]);

const rankingThisMonth = () =>
    rankingByPeriod({
        $and: [
            { $eq: [{ $month: "$updatedAt" }, { $month: new Date() }] },
            { $eq: [{ $year: "$updatedAt" }, { $year: new Date() }] },
        ],
    });

const rankingThisWeek = () =>
    rankingByPeriod({
        $and: [
            { $eq: [{ $week: "$updatedAt" }, { $week: new Date() }] },
            { $eq: [{ $year: "$updatedAt" }, { $year: new Date() }] },
        ],
    });

export default {
    create,
    findOne,
    findByUserAndChallenges,
    markCompleted,
    rankingThisMonth,
    rankingThisWeek,
};
