// HTTP-level tests of browsing public trips and keeping a copy. The repositories are replaced
// by an in-memory store, so the real routes, auth and services run.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({
    default: { findById: vi.fn(), updateById: vi.fn() },
}));
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({
    default: {
        findPublicById: vi.fn(), listPublic: vi.fn(), countPublic: vi.fn(), create: vi.fn(),
        existsActiveWithName: vi.fn(), softDelete: vi.fn(), findOwnedById: vi.fn(),
    },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn(), create: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), create: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: { create: vi.fn() } }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/postLikeRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), countByTrip: vi.fn(), countByTrips: vi.fn(), likedTripIds: vi.fn() },
}));
vi.mock("../../src/repositories/savedPostRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), tripIdsByUser: vi.fn(), savedTripIds: vi.fn() },
}));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: postLikeRepository } = await import("../../src/repositories/postLikeRepository.js");
const { default: savedPostRepository } = await import("../../src/repositories/savedPostRepository.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: challengeProgressRepository } = await import("../../src/repositories/challengeProgressRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const READER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const COPY_ID = "64b0000000000000000000c1";

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;

const publicTrip = {
    _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Da Lat", status: "active", visibility: "public",
    startDate: "2026-01-01", endDate: "2026-01-02", transportCostTotal: 1, foodCostTotal: 2, otherCostTotal: 3, shareToken: "secret-token",
};

beforeEach(() => {
    vi.resetAllMocks();
    postLikeRepository.exists.mockResolvedValue(false);
    postLikeRepository.countByTrip.mockResolvedValue(0);
    postLikeRepository.countByTrips.mockResolvedValue({});
    postLikeRepository.likedTripIds.mockResolvedValue([]);
    savedPostRepository.exists.mockResolvedValue(false);
    savedPostRepository.savedTripIds.mockResolvedValue([]);
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripPlanRepository.findPublicById.mockImplementation(async (id) => (id === TRIP_ID ? { ...publicTrip } : null));
    tripPlanRepository.listPublic.mockResolvedValue([{ _id: TRIP_ID, nameTrip: "Da Lat", location: "Da Lat" }]);
    tripPlanRepository.countPublic.mockResolvedValue(1);
    tripPlanRepository.existsActiveWithName.mockResolvedValue(false);
    tripPlanRepository.create.mockImplementation(async (data) => ({ _id: COPY_ID, ...data }));
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d1", tripId: TRIP_ID, day: 0, title: "Day 1", imageUrl: "/files/day" }]);
    tripDayRepository.create.mockImplementation(async (data) => ({ _id: "nd1", ...data }));
    challengeRepository.findByTripDayId.mockResolvedValue([{ _id: "c1", tripDayId: "d1", challengeSummary: "Cafe", nameLocation: "Cafe A", imageUrl: "/files/private-photo", points: 5 }]);
    challengeRepository.create.mockImplementation(async (data) => ({ _id: "nc1", ...data }));
});

describe("browse public trips", () => {
    it("anyone lists public trips without signing in: cards only, newest first, paged", async () => {
        const res = await request(app).get("/public-trip?page=2&limit=5").expect(200);
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.body).toMatchObject({ page: 2, limit: 5, total: 1, items: [{ _id: TRIP_ID, nameTrip: "Da Lat" }] });
        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(5, 5, "");
    });

    it("bad paging values fall back to the defaults and the page size is capped", async () => {
        await request(app).get("/public-trip?page=-3&limit=abc").expect(200);
        expect(tripPlanRepository.listPublic).toHaveBeenLastCalledWith(0, 12, "");
        await request(app).get("/public-trip?page[x]=1&limit=100000").expect(200);
        expect(tripPlanRepository.listPublic).toHaveBeenLastCalledWith(0, 50, "");
    });

    it("the list asks the database for public trips only", async () => {
        // the repository is the single place that filters on visibility
        await request(app).get("/public-trip").expect(200);
        expect(tripPlanRepository.listPublic).toHaveBeenCalledTimes(1);
        expect(tripPlanRepository.findOwnedById).not.toHaveBeenCalled();
    });
});

describe("keep a copy of a public trip", () => {
    const copy = (id = TRIP_ID, who = READER) => request(app).post(`/public-trip/${id}/copy`).set("Authorization", auth(who));

    it("a signed-in user gets a private copy that is theirs", async () => {
        const res = await copy().expect(201);
        expect(res.body).toMatchObject({ tripId: COPY_ID, nameTrip: "Da Lat (bản sao)" });
        const created = tripPlanRepository.create.mock.calls[0][0];
        expect(String(created.userId)).toBe(READER);
        expect(created.visibility).toBeUndefined(); // the schema default makes it private
        expect(created.shareToken).toBeUndefined();
        // fresh progress for the reader, and the owner's check-in photo is not copied
        expect(String(challengeProgressRepository.create.mock.calls[0][0])).toBe(READER);
        expect(challengeRepository.create.mock.calls[0][0].imageUrl).toBeUndefined();
    });

    it("the original is only read", async () => {
        await copy().expect(201);
        expect(tripPlanRepository.softDelete).not.toHaveBeenCalled();
    });

    it("needs a signed-in user", async () => {
        await request(app).post(`/public-trip/${TRIP_ID}/copy`).expect(401);
        expect(tripPlanRepository.create).not.toHaveBeenCalled();
    });

    it("a private, deleted, unknown or malformed id gives 404 and creates nothing", async () => {
        await copy("64b0000000000000000000ff").expect(404);
        await copy("not-an-id").expect(404);
        expect(tripPlanRepository.create).not.toHaveBeenCalled();
    });
});
