import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../../helpers/mongoose.js";

const { modelDouble } = vi.hoisted(() => ({
    modelDouble: () => ({
        find: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        findByIdAndDelete: vi.fn(),
        countDocuments: vi.fn(),
        aggregate: vi.fn(),
        distinct: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
    }),
}));

vi.mock("../../../src/models/User.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/TripPlan.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/TripDay.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Challenge.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/UserChallengeProgress.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/ChatAi.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Question.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Response.js", () => ({ default: modelDouble() }));

const { default: User } = await import("../../../src/models/User.js");
const { default: TripPlan } = await import("../../../src/models/TripPlan.js");
const { default: TripDay } = await import("../../../src/models/TripDay.js");
const { default: Challenge } = await import("../../../src/models/Challenge.js");
const { default: Progress } = await import("../../../src/models/UserChallengeProgress.js");
const { default: ChatAi } = await import("../../../src/models/ChatAi.js");
const { default: Question } = await import("../../../src/models/Question.js");
const { default: Response } = await import("../../../src/models/Response.js");
const { default: repo } = await import("../../../src/repositories/adminRepository.js");

const A = "64b000000000000000000001";
const B = "64b000000000000000000002";
const FROM = new Date("2026-01-01");
const TO = new Date("2026-02-01");

beforeEach(() => vi.resetAllMocks());

describe("users", () => {
    it("lists the newest accounts without secrets", async () => {
        const q = query(["u"]);
        User.find.mockReturnValue(q);

        await expect(repo.listUsers(5)).resolves.toEqual(["u"]);

        expect(q.select).toHaveBeenCalledWith(expect.stringContaining("-password"));
        expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(q.limit).toHaveBeenCalledWith(5);
    });

    it("finds one account without secrets, and updates many", async () => {
        const q = query({ _id: A });
        User.findById.mockReturnValue(q);
        User.updateMany.mockResolvedValue({ modifiedCount: 2 });

        await expect(repo.findUserById(A)).resolves.toEqual({ _id: A });
        await repo.updateManyUsers([A, A, B, null], { isActive: "suspended" });

        expect(q.select).toHaveBeenCalledWith(expect.stringContaining("-refreshToken"));
        expect(User.updateMany).toHaveBeenCalledWith({ _id: { $in: [A, B] } }, { $set: { isActive: "suspended" } });
    });

    it("counts the accounts that are not deleted, those created in a period and by role", async () => {
        User.countDocuments.mockResolvedValue(3);
        User.aggregate.mockResolvedValue([{ _id: "admin", members: 1 }]);

        await repo.countUsers();
        await repo.countUsersBetween(FROM, TO);
        await expect(repo.countUsersByRole()).resolves.toEqual([{ _id: "admin", members: 1 }]);

        expect(User.countDocuments).toHaveBeenNthCalledWith(1, { isActive: { $ne: "delete" } });
        expect(User.countDocuments).toHaveBeenNthCalledWith(2, { createdAt: { $gte: FROM, $lt: TO } });
    });

    it("groups sign-ups by month and finds names by id", async () => {
        User.aggregate.mockResolvedValue([{ _id: { y: 2026, m: 1 }, value: 4 }]);
        User.find.mockReturnValue(query([{ fullname: "An" }]));

        await expect(repo.signupsByMonth(FROM)).resolves.toHaveLength(1);
        await expect(repo.findUsersByIds([A, A])).resolves.toEqual([{ fullname: "An" }]);

        expect(User.find).toHaveBeenCalledWith({ _id: { $in: [A] } });
    });

    it("counts the trips and challenges of every account", async () => {
        TripPlan.aggregate.mockResolvedValue([{ _id: A, trips: 2, completed: 1 }]);
        Progress.aggregate.mockResolvedValue([{ _id: A, joined: 3, completed: 1 }]);

        await expect(repo.tripStatsByUser()).resolves.toHaveLength(1);
        await expect(repo.challengeStatsByUser()).resolves.toHaveLength(1);

        expect(TripPlan.aggregate.mock.calls[0][0][0]).toEqual({ $match: { status: { $ne: "delete" } } });
    });

    it("lists the trips, the challenge progress and the chats of one user", async () => {
        TripPlan.find.mockReturnValue(query(["t"]));
        Progress.find.mockReturnValue(query(["p"]));
        Challenge.find.mockReturnValue(query(["c"]));
        ChatAi.countDocuments.mockResolvedValue(7);

        await expect(repo.listUserTrips(A, 10)).resolves.toEqual(["t"]);
        await expect(repo.listUserProgress(A, 10)).resolves.toEqual(["p"]);
        await expect(repo.findChallengesByIds([A, B])).resolves.toEqual(["c"]);
        await expect(repo.countUserChats(A)).resolves.toBe(7);

        expect(TripPlan.find).toHaveBeenCalledWith({ userId: A, status: { $ne: "delete" } });
    });
});

describe("trips", () => {
    it("lists, counts and reads trips", async () => {
        TripPlan.find.mockReturnValue(query(["t"]));
        TripPlan.findById.mockReturnValue(query({ _id: A }));
        TripPlan.countDocuments.mockResolvedValue(9);
        TripDay.find.mockReturnValue(query(["d"]));

        await expect(repo.listTrips(3)).resolves.toEqual(["t"]);
        await expect(repo.findTripById(A)).resolves.toEqual({ _id: A });
        await expect(repo.listTripDays(A)).resolves.toEqual(["d"]);
        await expect(repo.countTrips()).resolves.toBe(9);
        await repo.countTripsBetween(FROM, TO);

        // a trip has no createdAt: its range is a range of ObjectIds
        const [filter] = TripPlan.countDocuments.mock.calls[1];
        expect(filter.status).toEqual({ $ne: "delete" });
        expect(filter._id.$gte.getTimestamp().getTime()).toBe(Math.floor(FROM.getTime() / 1000) * 1000);
    });

    it("aggregates destinations, trips per day, costs and provinces", async () => {
        TripPlan.aggregate.mockResolvedValue([{ _id: "Huế", trips: 2, avgCost: 10 }]);

        await expect(repo.topDestinations(5)).resolves.toHaveLength(1);
        await repo.tripsPerDay(FROM, TO);
        await repo.averageTripCost(FROM, TO);
        await repo.provincesInPeriod(FROM, TO);

        expect(TripPlan.aggregate).toHaveBeenCalledTimes(4);
        expect(TripPlan.aggregate.mock.calls[0][0]).toContainEqual({ $limit: 5 });
    });

    it("counts the challenges of each trip", async () => {
        TripDay.find.mockReturnValue(query([{ _id: "d1", tripId: A }, { _id: "d2", tripId: A }]));
        Challenge.aggregate.mockResolvedValue([{ _id: "d1", n: 2 }, { _id: "d2", n: 3 }]);

        const perTrip = await repo.challengesPerTrip([A]);

        expect(perTrip.get(A)).toBe(5);
    });
});

describe("challenges", () => {
    it("lists, edits and deletes challenges", async () => {
        Challenge.find.mockReturnValue(query(["c"]));
        Challenge.findByIdAndUpdate.mockReturnValue(query({ _id: A }));
        Challenge.findByIdAndDelete.mockReturnValue(query({ _id: A }));
        Progress.deleteMany.mockResolvedValue({});

        await expect(repo.listChallenges(2)).resolves.toEqual(["c"]);
        await expect(repo.updateChallenge(A, { points: 5 })).resolves.toEqual({ _id: A });
        await expect(repo.deleteChallenge(A)).resolves.toEqual({ _id: A });

        expect(Progress.deleteMany).toHaveBeenCalledWith({ chaId: A });
    });

    it("keeps the progress when the challenge does not exist", async () => {
        Challenge.findByIdAndDelete.mockReturnValue(query(null));

        await expect(repo.deleteChallenge(A)).resolves.toBeNull();

        expect(Progress.deleteMany).not.toHaveBeenCalled();
    });

    it("finds the province (location of the trip) of each challenge", async () => {
        TripDay.find.mockReturnValue(query([{ _id: "d1", tripId: A }]));
        TripPlan.find.mockReturnValue(query([{ _id: A, location: "Huế" }]));

        const provinces = await repo.provinceOfChallenges([{ _id: B, tripDayId: "d1" }, { _id: "x", tripDayId: "none" }]);

        expect(provinces.get(B)).toBe("Huế");
        expect(provinces.get("x")).toBe("");
    });

    it("counts participants and completions", async () => {
        Progress.aggregate.mockResolvedValue([{ _id: A, participants: 4, completed: 1 }]);
        Progress.countDocuments.mockResolvedValue(2);

        const map = await repo.progressOfChallenges([A]);
        await repo.countCompleted();
        await repo.countCompletedBetween(FROM, TO);
        await expect(repo.progressInPeriod(FROM, TO)).resolves.toEqual({ started: 2, completed: 2 });

        expect(map.get(A)).toEqual({ participants: 4, completed: 1 });
    });
});

describe("AI conversations", () => {
    it("counts chats, messages and chatting users", async () => {
        ChatAi.countDocuments.mockResolvedValue(5);
        Question.countDocuments.mockResolvedValue(10);
        Response.countDocuments.mockResolvedValue(9);
        ChatAi.distinct.mockResolvedValue([A, B]);
        ChatAi.find.mockReturnValue(query(["chat"]));

        await expect(repo.countChats()).resolves.toBe(5);
        await repo.countChatsBetween(FROM, TO);
        await expect(repo.countMessages()).resolves.toBe(19);
        await expect(repo.distinctChatUsers()).resolves.toEqual([A, B]);
        await expect(repo.listChats(4)).resolves.toEqual(["chat"]);
    });

    it("merges the questions and the answers of each day and of each chat", async () => {
        Question.aggregate.mockResolvedValue([{ _id: "2026-01-01", value: 2, n: 1 }]);
        Response.aggregate.mockResolvedValue([{ _id: "2026-01-01", value: 3, n: 4 }]);

        await expect(repo.messagesPerDay(FROM)).resolves.toContainEqual({ _id: "2026-01-01", value: 5 });
        const perChat = await repo.messagesPerChat([A]);

        expect(perChat.get("2026-01-01")).toBe(5);
    });
});
