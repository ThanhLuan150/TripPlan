import bcrypt from "bcrypt";
import mongoose from "mongoose";
import adminRepository from "../repositories/adminRepository.js";
import contentRepository from "../repositories/contentRepository.js";
import tripPlanRepository from "../repositories/tripPlanRepository.js";
import userRepository from "../repositories/userRepository.js";
import { ROLES } from "../models/User.js";
import HttpError from "../utils/HttpError.js";
import activityLogService from "./activityLogService.js";

// Data of the admin panel, shaped for the web app (ids as strings, dates as
// ISO strings). Lists are the 1000 newest records.

export const LIST_LIMIT = 1000;
const DAY_MS = 86_400_000;

const growth = (current, previous) => (previous ? (current - previous) / previous : 0);
const startOfUtcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const dayKey = (time) => new Date(time).toISOString().slice(0, 10);
const validId = (id, message) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new HttpError(404, message);
    }
};

// ---- dashboard -----------------------------------------------------------------

const dashboard = async () => {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * DAY_MS);
    const previous30 = new Date(now.getTime() - 60 * DAY_MS);
    const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    // `to` is exclusive: include what happened this very second
    const to = new Date(now.getTime() + 1);

    const [
        users, usersNow, usersPrev,
        trips, tripsNow, tripsPrev,
        completed, completedNow, completedPrev,
        chats, chatsNow, chatsPrev,
        signups, destinations,
    ] = await Promise.all([
        adminRepository.countUsers(),
        adminRepository.countUsersBetween(last30, to),
        adminRepository.countUsersBetween(previous30, last30),
        adminRepository.countTrips(),
        adminRepository.countTripsBetween(last30, to),
        adminRepository.countTripsBetween(previous30, last30),
        adminRepository.countCompleted(),
        adminRepository.countCompletedBetween(last30, to),
        adminRepository.countCompletedBetween(previous30, last30),
        adminRepository.countChats(),
        adminRepository.countChatsBetween(last30, to),
        adminRepository.countChatsBetween(previous30, last30),
        adminRepository.signupsByMonth(firstMonth),
        adminRepository.topDestinations(5),
    ]);

    const signupsOfMonth = new Map(signups.map(({ _id, value }) => [`${_id.y}-${_id.m}`, value]));
    const newUsers = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return { date: month.toISOString(), value: signupsOfMonth.get(`${month.getFullYear()}-${month.getMonth() + 1}`) ?? 0 };
    });

    return {
        stats: {
            users: { value: users, delta: growth(usersNow, usersPrev) },
            trips: { value: trips, delta: growth(tripsNow, tripsPrev) },
            challengesCompleted: { value: completed, delta: growth(completedNow, completedPrev) },
            aiChats: { value: chats, delta: growth(chatsNow, chatsPrev) },
        },
        newUsers,
        topDestinations: destinations.map(({ _id, trips: count }) => ({ name: _id ?? "", trips: count })),
    };
};

// What the bell of the header shows: only what has something to report.
const alerts = async () => {
    const now = new Date();
    const [newUsers, pending] = await Promise.all([
        adminRepository.countUsersBetween(new Date(startOfUtcDay(now)), new Date(now.getTime() + 1)),
        contentRepository.countPendingReports(),
    ]);
    const at = now.toISOString();
    return [
        newUsers > 0 && { id: "newUsers", type: "newUsers", count: newUsers, at },
        pending > 0 && { id: "pendingModeration", type: "pendingModeration", count: pending, at },
    ].filter(Boolean);
};

// ---- users ---------------------------------------------------------------------

const EMPTY_STATS = { totalTrips: 0, completedTrips: 0, challengesJoined: 0, challengesCompleted: 0 };

const toUser = (user, stats = EMPTY_STATS) => ({
    id: String(user._id),
    username: user.username,
    fullname: user.fullname || user.username,
    email: user.email,
    phone: user.phone || "",
    image: user.image || "",
    city: user.city || user.address || "",
    role: user.role || "user",
    status: user.isActive || "notActive",
    suspendReason: user.isActive === "suspended" ? user.suspendReason || "" : "",
    suspendedAt: user.isActive === "suspended" ? user.suspendedAt ?? null : null,
    level: user.level ?? 1,
    experience: user.experience ?? 0,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt ?? user.lastLoginAt ?? null,
    ...stats,
});

// Trip / challenge counters of every account: Map userId -> stats
const statsOfUsers = async () => {
    const [trips, challenges] = await Promise.all([adminRepository.tripStatsByUser(), adminRepository.challengeStatsByUser()]);
    const stats = new Map();
    const entry = (id) => {
        const key = String(id);
        if (!stats.has(key)) {
            stats.set(key, { ...EMPTY_STATS });
        }
        return stats.get(key);
    };
    for (const row of trips) {
        Object.assign(entry(row._id), { totalTrips: row.trips, completedTrips: row.completed });
    }
    for (const row of challenges) {
        Object.assign(entry(row._id), { challengesJoined: row.joined, challengesCompleted: row.completed });
    }
    return stats;
};

const listUsers = async () => {
    const [users, stats] = await Promise.all([adminRepository.listUsers(LIST_LIMIT), statsOfUsers()]);
    return users.map((user) => toUser(user, stats.get(String(user._id))));
};

const PROFILE_LIMIT = 50;
const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
const PHONE_PATTERN = /^[0-9+\s().-]{6,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One account with its trips, challenges and what it did lately.
const getUser = async (id) => {
    validId(id, "User not found");
    const user = await adminRepository.findUserById(id);
    if (!user) {
        throw new HttpError(404, "User not found");
    }
    const [stats, trips, progress, aiConversations, logs] = await Promise.all([
        statsOfUsers(),
        adminRepository.listUserTrips(user._id, PROFILE_LIMIT),
        adminRepository.listUserProgress(user._id, PROFILE_LIMIT),
        adminRepository.countUserChats(user._id),
        contentRepository.listLogsByActor(user._id, PROFILE_LIMIT),
    ]);
    const [found, challengesOfTrip] = await Promise.all([
        adminRepository.findChallengesByIds(progress.map((row) => row.chaId)),
        adminRepository.challengesPerTrip(trips.map((trip) => trip._id)),
    ]);
    const challenges = new Map(found.map((item) => [String(item._id), item]));
    const owners = new Map([[String(user._id), user.fullname || user.username]]);

    return {
        user: toUser(user, stats.get(String(user._id))),
        aiConversations,
        trips: trips.map((trip) => toTrip(trip, owners, challengesOfTrip)),
        challenges: progress.map((row) => {
            const challenge = challenges.get(String(row.chaId));
            return {
                id: String(row._id),
                name: challenge?.nameLocation || "",
                location: challenge?.location || "",
                points: challenge?.points ?? 0,
                completed: !!row.completed,
                joinedAt: row.createdAt ?? null,
                completedAt: row.completed ? row.endAt ?? row.updatedAt ?? null : null,
            };
        }),
        activity: logs.map((log) => ({
            id: String(log._id),
            at: log.createdAt,
            action: log.action,
            target: log.target || "",
            level: log.level || "info",
        })),
    };
};

const USER_STATUSES = ["active", "suspended", "delete"];

// Which accounts an admin may move to a state: only "suspended" accounts (and
// deleted ones) can be reactivated, only active accounts can be suspended, and
// other admins must be demoted first.
const checkStatusChange = (target, status) => {
    const current = target.isActive || "notActive";
    if (current === status) {
        throw new HttpError(409, `The account is already ${status}`);
    }
    if (status === "active" && !["suspended", "delete"].includes(current)) {
        throw new HttpError(409, "Only suspended or deleted accounts can be reactivated");
    }
    if (status === "suspended" && current !== "active") {
        throw new HttpError(409, "Only active accounts can be suspended");
    }
    if (status !== "active" && target.role === "admin") {
        throw new HttpError(409, "Change the role of an administrator before suspending or deleting the account");
    }
};

const statusUpdate = (status, reason) => {
    const update = { isActive: status };
    if (status === "suspended") {
        const text = String(reason ?? "").trim();
        if (text.length < 3) {
            throw new HttpError(400, "A reason is required to suspend an account");
        }
        update.suspendReason = text.slice(0, 500);
        update.suspendedAt = new Date();
        // the signed-in sessions end now
        update.refreshToken = "";
    } else {
        update.suspendReason = "";
        update.suspendedAt = null;
        if (status === "delete") {
            update.refreshToken = "";
        }
    }
    return update;
};

const logStatus = (actor, user, status, reason) => {
    const action = { active: "restoreUser", suspended: "suspendUser", delete: "deleteUser" }[status];
    return activityLogService.record({
        actor,
        action,
        target: status === "suspended" ? `@${user.username} — ${String(reason).trim()}` : `@${user.username}`,
        level: status === "active" ? "info" : "warning",
    });
};

// Edit an account: profile (name, email, phone), role and / or state. Password
// and tokens are never touched. Admins cannot change their own account (no
// lock-out). A deleted or suspended account can no longer sign in.
const updateUser = async (actor, id, body = {}) => {
    validId(id, "User not found");
    if (String(actor._id) === String(id)) {
        throw new HttpError(400, "You cannot change your own account");
    }
    const { role, status, suspendReason, fullname, email, phone, image } = body;
    const target = await userRepository.findById(id);
    if (!target) {
        throw new HttpError(404, "User not found");
    }

    const update = {};
    if (fullname !== undefined) {
        const name = String(fullname).trim();
        if (!name || name.length > 100) {
            throw new HttpError(400, "Full name is required (100 characters at most)");
        }
        update.fullname = name;
    }
    if (email !== undefined) {
        const address = String(email).trim().toLowerCase();
        if (!EMAIL_PATTERN.test(address)) {
            throw new HttpError(400, "Email is not valid");
        }
        const owner = await userRepository.findByEmail(address);
        if (owner && String(owner._id) !== String(id)) {
            throw new HttpError(409, "Email already in use");
        }
        update.email = address;
    }
    if (phone !== undefined) {
        const number = String(phone ?? "").trim();
        if (number && !PHONE_PATTERN.test(number)) {
            throw new HttpError(400, "Phone number is not valid");
        }
        update.phone = number;
    }
    if (image !== undefined) {
        update.image = checkImage(image);
    }
    if (role !== undefined) {
        if (!ROLES.includes(role)) {
            throw new HttpError(400, `Role must be one of: ${ROLES.join(", ")}`);
        }
        update.role = role;
    }
    if (status !== undefined) {
        if (!USER_STATUSES.includes(status)) {
            throw new HttpError(400, `Status must be one of: ${USER_STATUSES.join(", ")}`);
        }
        checkStatusChange(target, status);
        Object.assign(update, statusUpdate(status, suspendReason));
    }
    if (Object.keys(update).length === 0) {
        throw new HttpError(400, "Nothing to update");
    }

    const user = await userRepository.updateById(id, { ...update, updatedAt: new Date() });
    const label = `@${user.username}`;
    if (update.role && update.role !== target.role) {
        await activityLogService.record({ actor, action: "changeRole", target: `${label} → ${role}`, level: "warning" });
    }
    if (status !== undefined) {
        await logStatus(actor, user, status, suspendReason);
    }
    if (update.fullname || update.email || update.phone !== undefined || update.image) {
        await activityLogService.record({ actor, action: "updateUser", target: label });
    }
    const stats = await statsOfUsers();
    return toUser(user.toObject(), stats.get(String(user._id)));
};

// Photo of an account: the URL of an uploaded image.
const checkImage = (image) => {
    const url = String(image ?? "").trim();
    if (!/^https?:\/\/\S+$/i.test(url) || url.length > 500) {
        throw new HttpError(400, "Image must be a http(s) URL");
    }
    return url;
};

// Create an account that is already active (no email confirmation): the admin
// gives a first password, the user can change it with "forgot password".
const createUser = async (actor, { fullname, username, email, phone, role = "user", password } = {}) => {
    const name = String(fullname ?? "").trim();
    const login = String(username ?? "").trim().toLowerCase();
    const address = String(email ?? "").trim().toLowerCase();
    const number = String(phone ?? "").trim();
    if (!name || name.length > 100) {
        throw new HttpError(400, "Full name is required (100 characters at most)");
    }
    if (!USERNAME_PATTERN.test(login)) {
        throw new HttpError(400, "Username: 3-30 letters, digits, dot or underscore");
    }
    if (!EMAIL_PATTERN.test(address)) {
        throw new HttpError(400, "Email is not valid");
    }
    if (number && !PHONE_PATTERN.test(number)) {
        throw new HttpError(400, "Phone number is not valid");
    }
    if (!ROLES.includes(role)) {
        throw new HttpError(400, `Role must be one of: ${ROLES.join(", ")}`);
    }
    if (typeof password !== "string" || password.length < 8) {
        throw new HttpError(400, "Password must have at least 8 characters");
    }
    const [byEmail, byUsername] = await Promise.all([userRepository.findByEmail(address), userRepository.findByUsername(login)]);
    if (byEmail) {
        throw new HttpError(409, "Email already in use", { field: "email" });
    }
    if (byUsername) {
        throw new HttpError(409, "Username already in use", { field: "username" });
    }
    const user = await userRepository.create({
        username: login,
        fullname: name,
        email: address,
        phone: number,
        role,
        password: await bcrypt.hash(password, 10),
        isActive: "active",
    });
    await activityLogService.record({ actor, action: "createUser", target: `@${login}` });
    return toUser(user.toObject ? user.toObject() : user);
};

const BULK_LIMIT = 200;

// The same state change for several accounts: the ones that cannot take it
// (yourself, administrators, wrong current state) are skipped, not an error.
const bulkUpdateUsers = async (actor, { ids, status, suspendReason } = {}) => {
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > BULK_LIMIT) {
        throw new HttpError(400, `Send between 1 and ${BULK_LIMIT} user ids`);
    }
    if (!USER_STATUSES.includes(status)) {
        throw new HttpError(400, `Status must be one of: ${USER_STATUSES.join(", ")}`);
    }
    const update = statusUpdate(status, suspendReason);
    const updated = [];
    const skipped = [];
    for (const id of [...new Set(ids.map(String))]) {
        const target = mongoose.isValidObjectId(id) && String(actor._id) !== id ? await userRepository.findById(id) : null;
        try {
            if (!target) {
                throw new HttpError(404, "User not found");
            }
            checkStatusChange(target, status);
        } catch {
            skipped.push(id);
            continue;
        }
        await userRepository.updateById(id, { ...update, updatedAt: new Date() });
        await logStatus(actor, target, status, suspendReason);
        updated.push(id);
    }
    return { updated, skipped };
};

// ---- trips ---------------------------------------------------------------------

const tripPhase = ({ startDate, endDate }) => {
    if (!startDate || !endDate) {
        return "upcoming";
    }
    const now = Date.now();
    if (now < new Date(startDate).getTime()) {
        return "upcoming";
    }
    return now > new Date(endDate).getTime() + DAY_MS - 1 ? "completed" : "ongoing";
};

const toTrip = (trip, owners, challenges) => ({
    id: String(trip._id),
    nameTrip: trip.nameTrip || "",
    location: trip.location || "",
    owner: owners.get(String(trip.userId)) ?? "",
    startDate: trip.startDate,
    endDate: trip.endDate,
    days: trip.startDate && trip.endDate ? Math.max(1, Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / DAY_MS) + 1) : 0,
    transportCostTotal: trip.transportCostTotal ?? 0,
    foodCostTotal: trip.foodCostTotal ?? 0,
    otherCostTotal: trip.otherCostTotal ?? 0,
    imageUrl: trip.imageUrl || "",
    // a trip has no createdAt: the first 4 bytes of its ObjectId are the creation time
    createdAt: trip._id?.getTimestamp ? trip._id.getTimestamp().toISOString() : null,
    phase: tripPhase(trip),
    challenges: challenges.get(String(trip._id)) ?? 0,
    status: trip.status || "active",
});

const listTrips = async () => {
    const trips = await adminRepository.listTrips(LIST_LIMIT);
    const [people, challenges] = await Promise.all([
        adminRepository.findUsersByIds(trips.map((trip) => trip.userId)),
        adminRepository.challengesPerTrip(trips.map((trip) => trip._id)),
    ]);
    const owners = new Map(people.map((person) => [String(person._id), person.fullname || person.username]));
    return trips.map((trip) => toTrip(trip, owners, challenges));
};

// One trip with its days (what the user planned).
const getTrip = async (id) => {
    validId(id, "Trip not found");
    const trip = await adminRepository.findTripById(id);
    if (!trip) {
        throw new HttpError(404, "Trip not found");
    }
    const [people, challenges, days] = await Promise.all([
        adminRepository.findUsersByIds([trip.userId]),
        adminRepository.challengesPerTrip([trip._id]),
        adminRepository.listTripDays(trip._id),
    ]);
    const owners = new Map(people.map((person) => [String(person._id), person.fullname || person.username]));
    return {
        ...toTrip(trip, owners, challenges),
        ownerId: trip.userId ? String(trip.userId) : "",
        plan: days.map((day) => ({
            id: String(day._id),
            day: day.day ?? 0,
            date: day.date ?? null,
            title: day.title || "",
            imageUrl: day.imageUrl || "",
            cost: (day.transportCost ?? 0) + (day.foodCost ?? 0) + (day.otherCost ?? 0),
        })),
    };
};

// Soft delete: the trip disappears from the user's list too.
const deleteTrip = async (actor, id) => {
    validId(id, "Trip not found");
    const trip = await tripPlanRepository.softDelete(id);
    if (!trip) {
        throw new HttpError(404, "Trip not found");
    }
    await activityLogService.record({ actor, action: "deleteTrip", target: trip.nameTrip, level: "warning" });
    return { message: "Delete trip successfully" };
};

// ---- challenges ------------------------------------------------------------------

const toChallenge = (challenge, provinces, progress) => {
    const { participants = 0, completed = 0 } = progress.get(String(challenge._id)) ?? {};
    return {
        id: String(challenge._id),
        nameLocation: challenge.nameLocation || "",
        location: challenge.location || "",
        challengeSummary: challenge.challengeSummary || "",
        province: provinces.get(String(challenge._id)) ?? "",
        points: challenge.points ?? 0,
        participants,
        completed,
    };
};

const listChallenges = async () => {
    const challenges = await adminRepository.listChallenges(LIST_LIMIT);
    const [provinces, progress] = await Promise.all([
        adminRepository.provinceOfChallenges(challenges),
        adminRepository.progressOfChallenges(challenges.map((challenge) => challenge._id)),
    ]);
    return challenges.map((challenge) => toChallenge(challenge, provinces, progress));
};

const MAX_POINTS = 1000;

// Edit a challenge. Its points are what users earn when they complete it.
const updateChallenge = async (actor, id, body = {}) => {
    validId(id, "Challenge not found");
    const update = {};
    for (const key of ["nameLocation", "challengeSummary"]) {
        if (body[key] !== undefined) {
            if (typeof body[key] !== "string" || (key === "nameLocation" && !body[key].trim())) {
                throw new HttpError(400, `Invalid ${key}`);
            }
            update[key] = body[key].trim();
        }
    }
    if (body.points !== undefined) {
        if (!Number.isInteger(body.points) || body.points < 0 || body.points > MAX_POINTS) {
            throw new HttpError(400, `Points must be a whole number from 0 to ${MAX_POINTS}`);
        }
        update.points = body.points;
    }
    if (Object.keys(update).length === 0) {
        throw new HttpError(400, "Nothing to update");
    }
    const challenge = await adminRepository.updateChallenge(id, update);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }
    await activityLogService.record({ actor, action: "updateChallenge", target: challenge.nameLocation });
    const [provinces, progress] = await Promise.all([
        adminRepository.provinceOfChallenges([challenge]),
        adminRepository.progressOfChallenges([challenge._id]),
    ]);
    return toChallenge(challenge, provinces, progress);
};

// Soft deleting is not possible (a challenge belongs to a trip day): it is removed with its progress.
const deleteChallenge = async (actor, id) => {
    validId(id, "Challenge not found");
    const challenge = await adminRepository.deleteChallenge(id);
    if (!challenge) {
        throw new HttpError(404, "Challenge not found");
    }
    await activityLogService.record({ actor, action: "updateChallenge", target: `- ${challenge.nameLocation}`, level: "warning" });
    return { message: "Delete challenge successfully" };
};

// ---- AI assistant -----------------------------------------------------------------

const AI_CHART_DAYS = 14;

const aiOverview = async () => {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * DAY_MS);
    const previous30 = new Date(now.getTime() - 60 * DAY_MS);
    const to = new Date(now.getTime() + 1);
    const today = startOfUtcDay(now);
    const chartFrom = today - (AI_CHART_DAYS - 1) * DAY_MS;

    const [conversations, now30, prev30, messages, chatUsers, perDay, chats] = await Promise.all([
        adminRepository.countChats(),
        adminRepository.countChatsBetween(last30, to),
        adminRepository.countChatsBetween(previous30, last30),
        adminRepository.countMessages(),
        adminRepository.distinctChatUsers(),
        adminRepository.messagesPerDay(new Date(chartFrom)),
        adminRepository.listChats(LIST_LIMIT),
    ]);
    const [people, perChat] = await Promise.all([
        adminRepository.findUsersByIds(chats.map((chat) => chat.userId)),
        adminRepository.messagesPerChat(chats.map((chat) => chat._id)),
    ]);
    const names = new Map(people.map((person) => [String(person._id), person.fullname || person.username]));
    const valueOfDay = new Map(perDay.map(({ _id, value }) => [_id, value]));

    return {
        stats: {
            conversations: { value: conversations, delta: growth(now30, prev30) },
            messages: { value: messages },
            activeUsers: { value: chatUsers.length },
            avgMessages: { value: conversations ? Math.round((messages / conversations) * 10) / 10 : 0 },
        },
        dailyMessages: Array.from({ length: AI_CHART_DAYS }, (_, i) => {
            const time = chartFrom + i * DAY_MS;
            return { date: new Date(time).toISOString(), value: valueOfDay.get(dayKey(time)) ?? 0 };
        }),
        chats: chats.map((chat) => ({
            id: String(chat._id),
            title: chat.title || "",
            user: names.get(String(chat.userId)) ?? "",
            messages: perChat.get(String(chat._id)) ?? 0,
            updatedAt: chat.updatedAt ?? chat.createdAt,
        })),
    };
};

// ---- roles -------------------------------------------------------------------------

// What each role may do. Roles are fixed (User.role: "user" | "admin"); this is
// what the routes of the API enforce.
export const PERMISSIONS = [
    { permission: "planTrips", roles: ["user", "admin"] },
    { permission: "chatAi", roles: ["user", "admin"] },
    { permission: "completeChallenges", roles: ["user", "admin"] },
    { permission: "viewRanking", roles: ["user", "admin"] },
    { permission: "deleteOwnAccount", roles: ["user", "admin"] },
    { permission: "deleteAnyAccount", roles: ["admin"] },
    { permission: "manageContent", roles: ["admin"] },
    { permission: "moderate", roles: ["admin"] },
    { permission: "viewReports", roles: ["admin"] },
    { permission: "manageSettings", roles: ["admin"] },
];

const roles = async () => {
    const rows = await adminRepository.countUsersByRole();
    const members = Object.fromEntries(ROLES.map((role) => [role, rows.find((row) => (row._id || "user") === role)?.members ?? 0]));
    return { members, permissions: PERMISSIONS };
};

// ---- reports ------------------------------------------------------------------------

const PERIODS = { "7d": 7, "30d": 30, "90d": 90 };

// Trips created per day (per week for 90 days): [{ date, value }]
const trendOf = (perDay, from, days) => {
    const bucket = days > 30 ? 7 : 1;
    const valueOfDay = new Map(perDay.map(({ _id, value }) => [_id, value]));
    return Array.from({ length: Math.ceil(days / bucket) }, (_, i) => {
        let value = 0;
        for (let d = 0; d < bucket; d++) {
            value += valueOfDay.get(dayKey(from + (i * bucket + d) * DAY_MS)) ?? 0;
        }
        return { date: new Date(from + i * bucket * DAY_MS).toISOString(), value };
    });
};

const rateOf = ({ started, completed }) => (started ? completed / started : 0);

const reports = async (period) => {
    const days = PERIODS[period];
    if (!days) {
        throw new HttpError(400, `Period must be one of: ${Object.keys(PERIODS).join(", ")}`);
    }
    // whole UTC days, ending with today
    const end = startOfUtcDay(new Date()) + DAY_MS;
    const from = end - days * DAY_MS;
    const previousFrom = from - days * DAY_MS;
    const [start, middle, finish] = [new Date(previousFrom), new Date(from), new Date(end)];

    const [usersNow, usersPrev, tripsNow, tripsPrev, progressNow, progressPrev, costNow, costPrev, perDay, provinces] =
        await Promise.all([
            adminRepository.countUsersBetween(middle, finish),
            adminRepository.countUsersBetween(start, middle),
            adminRepository.countTripsBetween(middle, finish),
            adminRepository.countTripsBetween(start, middle),
            adminRepository.progressInPeriod(middle, finish),
            adminRepository.progressInPeriod(start, middle),
            adminRepository.averageTripCost(middle, finish),
            adminRepository.averageTripCost(start, middle),
            adminRepository.tripsPerDay(middle, finish),
            adminRepository.provincesInPeriod(middle, finish),
        ]);
    const averageCost = (rows) => Math.round(rows[0]?.avgCost ?? 0);

    return {
        stats: {
            newUsers: { value: usersNow, delta: growth(usersNow, usersPrev) },
            tripsCreated: { value: tripsNow, delta: growth(tripsNow, tripsPrev) },
            completionRate: { value: rateOf(progressNow), delta: growth(rateOf(progressNow), rateOf(progressPrev)) },
            avgTripCost: { value: averageCost(costNow), delta: growth(averageCost(costNow), averageCost(costPrev)) },
        },
        tripsCreated: trendOf(perDay, from, days),
        provinces: provinces.map(({ _id, trips, avgCost }) => ({ name: _id ?? "", trips, avgCost: Math.round(avgCost ?? 0) })),
    };
};

// ---- activity log & moderation -------------------------------------------------------

const listLogs = async () =>
    (await contentRepository.listLogs(LIST_LIMIT)).map((log) => ({
        id: String(log._id),
        at: log.createdAt,
        actor: log.actorName,
        action: log.action,
        target: log.target,
        ip: log.ip,
        level: log.level,
    }));

const toReport = (report) => ({
    id: String(report._id),
    type: report.type,
    reason: report.reason,
    content: report.content,
    author: report.authorName,
    reportedAt: report.createdAt,
    status: report.status,
});

const listReports = async () => (await contentRepository.listReports(LIST_LIMIT)).map(toReport);

// Approve (keep the content) or reject (remove it) a reported item.
const decideReport = async (actor, id, status) => {
    validId(id, "Report not found");
    if (!["approved", "rejected"].includes(status)) {
        throw new HttpError(400, "Status must be approved or rejected");
    }
    const report = await contentRepository.decideReport(id, status, actor._id);
    if (!report) {
        throw new HttpError(404, "Report not found");
    }
    await activityLogService.record({ actor, action: "moderate", target: `${status}: ${report.content}` });
    return toReport(report);
};

export default {
    dashboard,
    alerts,
    listUsers,
    getUser,
    updateUser,
    bulkUpdateUsers,
    createUser,
    getTrip,
    listTrips,
    deleteTrip,
    listChallenges,
    deleteChallenge,
    roles,
    updateChallenge,
    aiOverview,
    reports,
    listLogs,
    listReports,
    decideReport,
};
