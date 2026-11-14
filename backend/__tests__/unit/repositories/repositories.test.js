// Repositories are the only place that builds Mongoose queries: these tests
// check the filters / sorts / options they send (soft-deleted trips excluded,
// lower-cased usernames, owner checks...). The models are mocked, no database.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { modelMock } = vi.hoisted(() => ({
    // a model whose every static is a vi.fn
    modelMock: () => ({
        find: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        create: vi.fn(),
        exists: vi.fn(),
        updateOne: vi.fn(),
        deleteOne: vi.fn(),
        deleteMany: vi.fn(),
        aggregate: vi.fn(),
    }),
}));

vi.mock("../../../src/models/User.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/TripPlan.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/TripDay.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/Challenge.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/UserChallengeProgress.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/ChatAi.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/Question.js", () => ({ default: modelMock() }));
vi.mock("../../../src/models/Response.js", () => ({ default: modelMock() }));

const { default: User } = await import("../../../src/models/User.js");
const { default: TripPlan } = await import("../../../src/models/TripPlan.js");
const { default: TripDay } = await import("../../../src/models/TripDay.js");
const { default: Challenge } = await import("../../../src/models/Challenge.js");
const { default: Progress } = await import("../../../src/models/UserChallengeProgress.js");
const { default: ChatAi } = await import("../../../src/models/ChatAi.js");
const { default: Question } = await import("../../../src/models/Question.js");
const { default: Response } = await import("../../../src/models/Response.js");

const { default: userRepository } = await import("../../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../../src/repositories/challengeRepository.js");
const { default: progressRepository } = await import("../../../src/repositories/challengeProgressRepository.js");
const { default: chatRepository } = await import("../../../src/repositories/chatRepository.js");

const RESULT = Symbol("query result");
// query whose .sort() / .limit() return RESULT
const chain = () => {
    const q = { sort: vi.fn(() => RESULT), limit: vi.fn(() => RESULT) };
    return q;
};

beforeEach(() => {
    vi.resetAllMocks();
    for (const model of [User, TripPlan, TripDay, Challenge, Progress, ChatAi, Question, Response]) {
        for (const fn of Object.values(model)) {
            fn.mockReturnValue(RESULT);
        }
    }
});

describe("userRepository", () => {
    it("finds by id", () => {
        expect(userRepository.findById("u1")).toBe(RESULT);
        expect(User.findById).toHaveBeenCalledWith("u1");
    });

    it("looks usernames and emails up in lower case", () => {
        userRepository.findByUsername("TravelER");
        userRepository.findByEmail("Lan@Example.COM");

        expect(User.findOne).toHaveBeenNthCalledWith(1, { username: "traveler" });
        expect(User.findOne).toHaveBeenNthCalledWith(2, { email: "lan@example.com" });
    });

    it("tolerates a missing username / email", () => {
        userRepository.findByUsername(undefined);
        userRepository.findByEmail(null);

        expect(User.findOne).toHaveBeenNthCalledWith(1, { username: undefined });
        expect(User.findOne).toHaveBeenNthCalledWith(2, { email: undefined });
    });

    it("finds by username or email", () => {
        userRepository.findByUsernameOrEmail("Lan", "LAN@x.vn");

        expect(User.findOne).toHaveBeenCalledWith({ $or: [{ username: "lan" }, { email: "lan@x.vn" }] });
    });

    it("matches a code, with the email when given", () => {
        userRepository.findByCode("123456", "A@B.vn");
        userRepository.findByCode("123456");

        expect(User.findOne).toHaveBeenNthCalledWith(1, { code: "123456", email: "a@b.vn" });
        expect(User.findOne).toHaveBeenNthCalledWith(2, { code: "123456" });
    });

    it("creates and updates (returning the new document)", () => {
        userRepository.create({ username: "lan" });
        userRepository.updateById("u1", { fullname: "Lan" });

        expect(User.create).toHaveBeenCalledWith({ username: "lan" });
        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { fullname: "Lan" }, { new: true });
    });

    it("adds experience points atomically", () => {
        userRepository.incrementExperience("u1", 30);

        expect(User.findByIdAndUpdate).toHaveBeenCalledWith("u1", { $inc: { experience: 30 } }, { new: true });
    });

    it("ranks non-deleted users by experience", () => {
        userRepository.topByExperience(10);
        userRepository.topByExperience();

        const [pipeline] = User.aggregate.mock.calls[0];
        expect(pipeline).toEqual([
            { $match: { isActive: { $ne: "delete" } } },
            { $sort: { experience: -1 } },
            { $limit: 10 },
            { $project: { _id: "$_id", fullname: "$fullname", experience: "$experience", image: "$image" } },
        ]);
        expect(User.aggregate.mock.calls[1][0][2]).toEqual({ $limit: 100 });
    });
});

describe("tripPlanRepository", () => {
    const ACTIVE = { status: { $ne: "delete" } };

    it("lists only the user's non-deleted trips", () => {
        tripPlanRepository.findActiveByUser("u1");
        expect(TripPlan.find).toHaveBeenCalledWith({ userId: "u1", ...ACTIVE });
    });

    it("finds a trip only for its owner", () => {
        tripPlanRepository.findOwnedById("t1", "u1");
        expect(TripPlan.findOne).toHaveBeenCalledWith({ _id: "t1", userId: "u1", ...ACTIVE });
    });

    it("finds trips whose dates overlap the range", () => {
        tripPlanRepository.findOverlapping("u1", "2026-03-01", "2026-03-03");

        expect(TripPlan.find).toHaveBeenCalledWith({
            userId: "u1",
            ...ACTIVE,
            startDate: { $lte: "2026-03-03" },
            endDate: { $gte: "2026-03-01" },
        });
    });

    it("checks name duplicates among active trips", () => {
        tripPlanRepository.existsActiveWithName("u1", "Đà Lạt");
        expect(TripPlan.exists).toHaveBeenCalledWith({ userId: "u1", nameTrip: "Đà Lạt", ...ACTIVE });
    });

    it("creates, updates and soft-deletes", () => {
        tripPlanRepository.create({ nameTrip: "x" });
        tripPlanRepository.updateById("t1", { foodCostTotal: 1 });
        tripPlanRepository.softDelete("t1");

        expect(TripPlan.create).toHaveBeenCalledWith({ nameTrip: "x" });
        expect(TripPlan.findByIdAndUpdate).toHaveBeenNthCalledWith(1, "t1", { foodCostTotal: 1 }, { new: true });
        expect(TripPlan.findByIdAndUpdate).toHaveBeenNthCalledWith(2, "t1", { $set: { status: "delete" } }, { new: true });
    });
});

describe("tripDayRepository", () => {
    it("creates a day and lists the days of a trip in order", () => {
        const q = chain();
        TripDay.find.mockReturnValue(q);

        tripDayRepository.create({ day: 0 });
        expect(tripDayRepository.findByTripId("t1")).toBe(RESULT);

        expect(TripDay.create).toHaveBeenCalledWith({ day: 0 });
        expect(TripDay.find).toHaveBeenCalledWith({ tripId: "t1" });
        expect(q.sort).toHaveBeenCalledWith({ day: 1 });
    });
});

describe("challengeRepository", () => {
    it("creates and finds challenges", () => {
        challengeRepository.create({ points: 10 });
        challengeRepository.findById("c1");
        challengeRepository.findByTripDayId("d1");
        challengeRepository.findFirstByTripDayId("d1");

        expect(Challenge.create).toHaveBeenCalledWith({ points: 10 });
        expect(Challenge.findById).toHaveBeenCalledWith("c1");
        expect(Challenge.find).toHaveBeenCalledWith({ tripDayId: "d1" });
        expect(Challenge.findOne).toHaveBeenCalledWith({ tripDayId: "d1" });
    });

    it("sets the photo and returns only id + points", () => {
        challengeRepository.setImage("c1", "http://img");

        expect(Challenge.findByIdAndUpdate).toHaveBeenCalledWith(
            "c1",
            { imageUrl: "http://img" },
            { new: true, projection: { _id: 1, points: 1 } },
        );
    });
});

describe("challengeProgressRepository", () => {
    it("creates and finds progress", () => {
        progressRepository.create("u1", "c1");
        progressRepository.findOne("u1", "c1");
        progressRepository.findByUserAndChallenges("u1", ["c1", "c2"]);

        expect(Progress.create).toHaveBeenCalledWith({ userId: "u1", chaId: "c1" });
        expect(Progress.findOne).toHaveBeenCalledWith({ userId: "u1", chaId: "c1" });
        expect(Progress.find).toHaveBeenCalledWith({ userId: "u1", chaId: { $in: ["c1", "c2"] } });
    });

    it("marks a challenge completed with its end time", () => {
        progressRepository.markCompleted("p1");

        const [id, update, options] = Progress.findByIdAndUpdate.mock.calls[0];
        expect(id).toBe("p1");
        expect(update).toEqual({ completed: true, endAt: expect.any(Date) });
        expect(options).toEqual({ new: true });
    });

    it.each([
        ["rankingThisMonth", "$month"],
        ["rankingThisWeek", "$week"],
    ])("%s sums the points of challenges completed in the current %s", (method, period) => {
        progressRepository[method]();

        const [pipeline] = Progress.aggregate.mock.calls[0];
        const [match] = pipeline;
        expect(match.$match.completed).toBe(true);
        const [samePeriod, sameYear] = match.$match.$expr.$and;
        expect(samePeriod.$eq[0]).toEqual({ [period]: "$updatedAt" });
        expect(sameYear.$eq[0]).toEqual({ $year: "$updatedAt" });

        expect(pipeline).toContainEqual({
            $lookup: { from: "challenges", localField: "chaId", foreignField: "_id", as: "challenge" },
        });
        expect(pipeline).toContainEqual({
            $group: {
                _id: "$userId",
                fullname: { $first: "$user.fullname" },
                experience: { $sum: "$challenge.points" },
                image: { $first: "$user.image" },
            },
        });
        expect(pipeline.at(-1)).toEqual({ $sort: { experience: -1 } });
    });
});

describe("chatRepository", () => {
    it("finds a conversation only for its owner", () => {
        chatRepository.findOwned("c1", "u1");
        expect(ChatAi.findOne).toHaveBeenCalledWith({ _id: "c1", userId: "u1" });
    });

    it("lists the user's conversations, most recently used first", () => {
        const q = chain();
        ChatAi.find.mockReturnValue(q);

        expect(chatRepository.listByUser("u1")).toBe(RESULT);
        expect(ChatAi.find).toHaveBeenCalledWith({ userId: "u1" });
        expect(q.sort).toHaveBeenCalledWith({ updatedAt: -1, createdAt: -1 });
    });

    it("touch() bumps the last message time", () => {
        chatRepository.touch("c1");
        expect(ChatAi.updateOne).toHaveBeenCalledWith({ _id: "c1" }, { updatedAt: expect.any(Date) });
    });

    it("creates conversations and saves messages", () => {
        chatRepository.create({ title: "Đà Lạt" });
        chatRepository.saveQuestion("c1", "Q");
        chatRepository.saveResponse("c1", "A");

        expect(ChatAi.create).toHaveBeenCalledWith({ title: "Đà Lạt" });
        expect(Question.create).toHaveBeenCalledWith({ chatAiId: "c1", content: "Q" });
        expect(Response.create).toHaveBeenCalledWith({ chatAiId: "c1", content: "A" });
    });

    it("reads questions and answers oldest first", () => {
        const q1 = chain();
        const q2 = chain();
        Question.find.mockReturnValue(q1);
        Response.find.mockReturnValue(q2);

        chatRepository.findQuestions("c1");
        chatRepository.findResponses("c1");

        expect(Question.find).toHaveBeenCalledWith({ chatAiId: "c1" });
        expect(Response.find).toHaveBeenCalledWith({ chatAiId: "c1" });
        expect(q1.sort).toHaveBeenCalledWith({ createdAt: 1 });
        expect(q2.sort).toHaveBeenCalledWith({ createdAt: 1 });
    });

    it("deletes a conversation together with its messages", async () => {
        ChatAi.deleteOne.mockResolvedValue({});
        Response.deleteMany.mockResolvedValue({});
        Question.deleteMany.mockResolvedValue({});

        await chatRepository.deleteWithMessages("c1");

        expect(ChatAi.deleteOne).toHaveBeenCalledWith({ _id: "c1" });
        expect(Response.deleteMany).toHaveBeenCalledWith({ chatAiId: "c1" });
        expect(Question.deleteMany).toHaveBeenCalledWith({ chatAiId: "c1" });
    });
});
