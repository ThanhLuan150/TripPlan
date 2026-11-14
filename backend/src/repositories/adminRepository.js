import mongoose from "mongoose";
import User from "../models/User.js";
import TripPlan from "../models/TripPlan.js";
import TripDay from "../models/TripDay.js";
import Challenge from "../models/Challenge.js";
import UserChallengeProgress from "../models/UserChallengeProgress.js";
import ChatAi from "../models/ChatAi.js";
import Question from "../models/Question.js";
import Response from "../models/Response.js";

// Read queries of the admin panel over the existing collections. Lists are
// capped (newest first) and returned as plain objects (.lean()).

const ACTIVE_TRIP = { status: { $ne: "delete" } };
const USER_HIDDEN_FIELDS = "-password -code -refreshToken -resetPasswordExpires -fcmToken";

// A trip has no createdAt: its ObjectId starts with the creation time, so a
// date range is a range of ObjectIds.
const idFromDate = (date) =>
    new mongoose.Types.ObjectId(Math.floor(date.getTime() / 1000).toString(16).padStart(8, "0") + "0".repeat(16));
const tripsCreated = (from, to) => ({ ...ACTIVE_TRIP, _id: { $gte: idFromDate(from), $lt: idFromDate(to) } });
const between = (field, from, to) => ({ [field]: { $gte: from, $lt: to } });

const ids = (list) => [...new Set(list.filter(Boolean).map(String))];

// ---- users -----------------------------------------------------------------

const listUsers = (limit) => User.find({}).select(USER_HIDDEN_FIELDS).sort({ createdAt: -1 }).limit(limit).lean();

const countUsers = () => User.countDocuments({ isActive: { $ne: "delete" } });

const countUsersBetween = (from, to) => User.countDocuments(between("createdAt", from, to));

// [{ _id: { y, m }, value }] of the sign-ups since `from`
const signupsByMonth = (from) =>
    User.aggregate([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } }, value: { $sum: 1 } } },
    ]);

const findUserById = (id) => User.findById(id).select(USER_HIDDEN_FIELDS).lean();

const updateManyUsers = (userIds, update) => User.updateMany({ _id: { $in: ids(userIds) } }, { $set: update });

// [{ _id: userId, trips, completed }]: trips of every account (a trip is
// completed once its end date has passed)
const tripStatsByUser = () =>
    TripPlan.aggregate([
        { $match: ACTIVE_TRIP },
        {
            $group: {
                _id: "$userId",
                trips: { $sum: 1 },
                completed: { $sum: { $cond: [{ $lt: ["$endDate", new Date()] }, 1, 0] } },
            },
        },
    ]);

// [{ _id: userId, joined, completed }]
const challengeStatsByUser = () =>
    UserChallengeProgress.aggregate([
        { $group: { _id: "$userId", joined: { $sum: 1 }, completed: { $sum: { $cond: ["$completed", 1, 0] } } } },
    ]);

const listUserTrips = (userId, limit) => TripPlan.find({ userId, ...ACTIVE_TRIP }).sort({ _id: -1 }).limit(limit).lean();

const listUserProgress = (userId, limit) => UserChallengeProgress.find({ userId }).sort({ updatedAt: -1 }).limit(limit).lean();

const findChallengesByIds = (challengeIds) => Challenge.find({ _id: { $in: ids(challengeIds) } }).select("nameLocation location points").lean();

const countUserChats = (userId) => ChatAi.countDocuments({ userId });

const listTripDays = (tripId) => TripDay.find({ tripId }).sort({ day: 1 }).lean();

const findTripById = (id) => TripPlan.findById(id).lean();

const findUsersByIds = (userIds) => User.find({ _id: { $in: ids(userIds) } }).select("fullname username").lean();

// ---- trips -----------------------------------------------------------------

const listTrips = (limit) => TripPlan.find({}).sort({ _id: -1 }).limit(limit).lean();

const countTrips = () => TripPlan.countDocuments(ACTIVE_TRIP);

const countTripsBetween = (from, to) => TripPlan.countDocuments(tripsCreated(from, to));

const topDestinations = (limit) =>
    TripPlan.aggregate([
        { $match: ACTIVE_TRIP },
        { $group: { _id: "$location", trips: { $sum: 1 } } },
        { $sort: { trips: -1 } },
        { $limit: limit },
    ]);

// [{ _id: "yyyy-mm-dd", value }] of the trips created in the period
const tripsPerDay = (from, to) =>
    TripPlan.aggregate([
        { $match: tripsCreated(from, to) },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$_id" } } }, value: { $sum: 1 } } },
    ]);

const COST = { $add: [{ $ifNull: ["$transportCostTotal", 0] }, { $ifNull: ["$foodCostTotal", 0] }, { $ifNull: ["$otherCostTotal", 0] }] };

// [{ avgCost }] (empty when there is no trip)
const averageTripCost = (from, to) =>
    TripPlan.aggregate([{ $match: tripsCreated(from, to) }, { $group: { _id: null, avgCost: { $avg: COST } } }]);

// [{ _id: province, trips, avgCost }]
const provincesInPeriod = (from, to) =>
    TripPlan.aggregate([
        { $match: tripsCreated(from, to) },
        { $group: { _id: "$location", trips: { $sum: 1 }, avgCost: { $avg: COST } } },
        { $sort: { trips: -1 } },
        { $limit: 7 },
    ]);

// number of challenges of each trip: [{ _id: tripId, n }]
const challengesPerTrip = async (tripIds) => {
    const days = await TripDay.find({ tripId: { $in: ids(tripIds) } }).select("_id tripId").lean();
    const perDay = await Challenge.aggregate([
        { $match: { tripDayId: { $in: days.map((day) => day._id) } } },
        { $group: { _id: "$tripDayId", n: { $sum: 1 } } },
    ]);
    const dayToTrip = new Map(days.map((day) => [String(day._id), String(day.tripId)]));
    const perTrip = new Map();
    for (const { _id, n } of perDay) {
        const tripId = dayToTrip.get(String(_id));
        perTrip.set(tripId, (perTrip.get(tripId) ?? 0) + n);
    }
    return perTrip;
};

// ---- challenges ------------------------------------------------------------

const listChallenges = (limit) => Challenge.find({}).sort({ _id: -1 }).limit(limit).lean();

// Removes the challenge and the progress users made on it.
const deleteChallenge = async (id) => {
    const challenge = await Challenge.findByIdAndDelete(id).lean();
    if (challenge) {
        await UserChallengeProgress.deleteMany({ chaId: id });
    }
    return challenge;
};

// [{ _id: role, members }] of the accounts that are not deleted
const countUsersByRole = () =>
    User.aggregate([{ $match: { isActive: { $ne: "delete" } } }, { $group: { _id: "$role", members: { $sum: 1 } } }]);

const updateChallenge = (id, update) =>
    Challenge.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();

// province (the trip's location) of each challenge: Map challengeId -> province
const provinceOfChallenges = async (challenges) => {
    const days = await TripDay.find({ _id: { $in: ids(challenges.map((c) => c.tripDayId)) } }).select("tripId").lean();
    const trips = await TripPlan.find({ _id: { $in: ids(days.map((day) => day.tripId)) } }).select("location").lean();
    const locationOfTrip = new Map(trips.map((trip) => [String(trip._id), trip.location]));
    const tripOfDay = new Map(days.map((day) => [String(day._id), String(day.tripId)]));
    return new Map(
        challenges.map((c) => [String(c._id), locationOfTrip.get(tripOfDay.get(String(c.tripDayId))) ?? ""]),
    );
};

// participants and completions of each challenge: Map challengeId -> { participants, completed }
const progressOfChallenges = async (challengeIds) => {
    const rows = await UserChallengeProgress.aggregate([
        { $match: { chaId: { $in: challengeIds } } },
        { $group: { _id: "$chaId", participants: { $sum: 1 }, completed: { $sum: { $cond: ["$completed", 1, 0] } } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), { participants: row.participants, completed: row.completed }]));
};

const countCompleted = () => UserChallengeProgress.countDocuments({ completed: true });

const countCompletedBetween = (from, to) =>
    UserChallengeProgress.countDocuments({ completed: true, ...between("endAt", from, to) });

// how many challenges were started / completed in the period (completion rate)
const progressInPeriod = async (from, to) => {
    const range = between("createdAt", from, to);
    const [started, completed] = await Promise.all([
        UserChallengeProgress.countDocuments(range),
        UserChallengeProgress.countDocuments({ ...range, completed: true }),
    ]);
    return { started, completed };
};

// ---- AI conversations --------------------------------------------------------

const countChats = () => ChatAi.countDocuments({});

const countChatsBetween = (from, to) => ChatAi.countDocuments(between("createdAt", from, to));

const countMessages = async () => {
    const [questions, responses] = await Promise.all([Question.countDocuments({}), Response.countDocuments({})]);
    return questions + responses;
};

const distinctChatUsers = () => ChatAi.distinct("userId");

const listChats = (limit) => ChatAi.find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(limit).lean();

// [{ _id: "yyyy-mm-dd", value }] of the messages (questions + answers) since `from`
const messagesPerDay = async (from) => {
    const pipeline = [
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: 1 } } },
    ];
    const [questions, responses] = await Promise.all([Question.aggregate(pipeline), Response.aggregate(pipeline)]);
    const perDay = new Map();
    for (const { _id, value } of [...questions, ...responses]) {
        perDay.set(_id, (perDay.get(_id) ?? 0) + value);
    }
    return [...perDay].map(([_id, value]) => ({ _id, value }));
};

// number of messages of each conversation: Map chatId -> count
const messagesPerChat = async (chatIds) => {
    const pipeline = [{ $match: { chatAiId: { $in: chatIds } } }, { $group: { _id: "$chatAiId", n: { $sum: 1 } } }];
    const [questions, responses] = await Promise.all([Question.aggregate(pipeline), Response.aggregate(pipeline)]);
    const perChat = new Map();
    for (const { _id, n } of [...questions, ...responses]) {
        perChat.set(String(_id), (perChat.get(String(_id)) ?? 0) + n);
    }
    return perChat;
};

export default {
    listUsers,
    deleteChallenge,
    countUsersByRole,
    listTripDays,
    findTripById,
    findUserById,
    updateManyUsers,
    tripStatsByUser,
    challengeStatsByUser,
    listUserTrips,
    listUserProgress,
    findChallengesByIds,
    countUserChats,
    countUsers,
    countUsersBetween,
    signupsByMonth,
    findUsersByIds,
    listTrips,
    countTrips,
    countTripsBetween,
    topDestinations,
    tripsPerDay,
    averageTripCost,
    provincesInPeriod,
    challengesPerTrip,
    listChallenges,
    updateChallenge,
    provinceOfChallenges,
    progressOfChallenges,
    countCompleted,
    countCompletedBetween,
    progressInPeriod,
    countChats,
    countChatsBetween,
    countMessages,
    distinctChatUsers,
    listChats,
    messagesPerDay,
    messagesPerChat,
};
