// HTTP-level tests of sharing a trip as a post: ownership, the introduction, what the public sees,
// that a private trip stays private until its owner shares it, and removing the post.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({
    default: {
        findOwnedById: vi.fn(), findPublicById: vi.fn(), setPost: vi.fn(), setVisibility: vi.fn(), disableShare: vi.fn(),
        listPublic: vi.fn(), countPublic: vi.fn(),
    },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/postLikeRepository.js", () => ({
    default: { exists: vi.fn(), countByTrip: vi.fn(), countByTrips: vi.fn(), likedTripIds: vi.fn() },
}));
vi.mock("../../src/repositories/savedPostRepository.js", () => ({ default: { exists: vi.fn(), savedTripIds: vi.fn() } }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: postLikeRepository } = await import("../../src/repositories/postLikeRepository.js");
const { default: savedPostRepository } = await import("../../src/repositories/savedPostRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const auth = (id = OWNER) => `Bearer ${generateAccessToken({ _id: id })}`;
const account = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });

let trip;
const wireStore = (initial = {}) => {
    trip = { _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Da Lat", status: "active", ...initial };
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && String(userId) === OWNER && trip.status !== "delete" ? { ...trip } : null);
    tripPlanRepository.findPublicById.mockImplementation(async (id) =>
        id === TRIP_ID && trip.visibility === "public" && trip.status !== "delete" ? { ...trip } : null);
    tripPlanRepository.setPost.mockImplementation(async (id, postContent, postedAt) => {
        trip = { ...trip, visibility: "public", postContent, postedAt };
        return { ...trip };
    });
    tripPlanRepository.setVisibility.mockImplementation(async (id, visibility) => {
        const { postContent, postedAt, ...rest } = trip;
        trip = visibility === "private" ? { ...rest, visibility } : { ...trip, visibility };
        return { ...trip };
    });
    tripPlanRepository.disableShare.mockResolvedValue({});
    tripPlanRepository.listPublic.mockImplementation(async () => (trip.visibility === "public" ? [{ ...trip }] : []));
    tripPlanRepository.countPublic.mockImplementation(async () => (trip.visibility === "public" ? 1 : 0));
};

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    const accounts = { [OWNER]: account(OWNER), [STRANGER]: account(STRANGER) };
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    postLikeRepository.exists.mockResolvedValue(false);
    postLikeRepository.countByTrip.mockResolvedValue(0);
    postLikeRepository.countByTrips.mockResolvedValue({});
    postLikeRepository.likedTripIds.mockResolvedValue([]);
    savedPostRepository.exists.mockResolvedValue(false);
    savedPostRepository.savedTripIds.mockResolvedValue([]);
    tripDayRepository.findByTripId.mockResolvedValue([
        { _id: "d1", tripId: TRIP_ID, title: "Day 1", day: 0, dayOfWeek: "Mon", date: "2026-01-01", transportCost: 1, foodCost: 2, otherCost: 3 },
    ]);
    challengeRepository.findByTripDayId.mockResolvedValue([
        { _id: "c1", challengeSummary: "Cafe", nameLocation: "Cafe A", location: "Da Lat", latitude: "1", longitude: "2", points: 50, imageUrl: "/files/private-photo" },
    ]);
    wireStore();
});

const share = (body = { content: "Chuyến đi tuyệt vời" }, id = OWNER) =>
    request(app).post(`/trip-plan/${TRIP_ID}/post`).set("Authorization", auth(id)).send(body);
const status = (id = OWNER) => request(app).get(`/trip-plan/${TRIP_ID}/post`).set("Authorization", auth(id));
const remove = (id = OWNER) => request(app).delete(`/trip-plan/${TRIP_ID}/post`).set("Authorization", auth(id));

describe("share a trip as a post", () => {
    it("a trip is not a post, and not readable by anybody, until the owner shares it", async () => {
        expect((await status().expect(200)).body).toMatchObject({ isPosted: false, visibility: "private", content: "" });
        await request(app).get(`/public-trip/${TRIP_ID}`).expect(404);
        expect((await request(app).get("/public-trip").expect(200)).body.items).toEqual([]);
    });

    it("the owner shares it with an introduction and it becomes a public post", async () => {
        const res = await share().expect(200);

        expect(res.body).toMatchObject({ isPosted: true, visibility: "public", content: "Chuyến đi tuyệt vời" });
        expect(res.body.postedAt).toBeDefined();
        expect((await status().expect(200)).body).toMatchObject({ isPosted: true, content: "Chuyến đi tuyệt vời" });
    });

    it("the post shows in the list and opens with the trip, the introduction and no private data", async () => {
        await share().expect(200);

        const listed = (await request(app).get("/public-trip").expect(200)).body.items[0];
        expect(listed).toMatchObject({ _id: TRIP_ID, nameTrip: "Da Lat", postContent: "Chuyến đi tuyệt vời" });

        const opened = (await request(app).get(`/public-trip/${TRIP_ID}`).expect(200)).body.tripDatas;
        expect(opened).toMatchObject({ nameTrip: "Da Lat", postContent: "Chuyến đi tuyệt vời" });
        expect(opened.dataTripDays).toHaveLength(1);
        const text = JSON.stringify(opened);
        expect(text).not.toContain(OWNER);
        expect(text).not.toContain("private-photo");
    });

    it("sharing again only changes the introduction", async () => {
        await share({ content: "one" }).expect(200);
        const first = trip.postedAt;
        const res = await share({ content: "two" }).expect(200);

        expect(res.body).toMatchObject({ message: "Post updated", content: "two" });
        expect(trip.postedAt).toEqual(first);
    });

    it("the introduction is optional", async () => {
        const res = await share({}).expect(200);

        expect(res.body).toMatchObject({ isPosted: true, content: "" });
    });

    it.each([[5], [{ a: 1 }], ["a".repeat(1001)]])("rejects the introduction %j with 400 and publishes nothing", async (content) => {
        await share({ content }).expect(400);

        expect(tripPlanRepository.setPost).not.toHaveBeenCalled();
        expect(trip.visibility).toBeUndefined();
    });

    it("rejects a trip without any day with 400", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([]);

        await share().expect(400);
        expect(trip.visibility).toBeUndefined();
    });

    it("somebody who does not own the trip cannot see its post state, share it or remove the post (404, nothing written)", async () => {
        await status(STRANGER).expect(404);
        await share({ content: "x" }, STRANGER).expect(404);
        await remove(STRANGER).expect(404);

        expect(tripPlanRepository.setPost).not.toHaveBeenCalled();
        expect(trip.visibility).toBeUndefined();
    });

    it("a deleted or unknown trip cannot be shared", async () => {
        wireStore({ status: "delete" });
        await share().expect(404);
        await request(app).post("/trip-plan/not-an-id/post").set("Authorization", auth()).send({}).expect(404);
    });

    it("requires signing in", async () => {
        await request(app).post(`/trip-plan/${TRIP_ID}/post`).send({}).expect(401);
        await request(app).get(`/trip-plan/${TRIP_ID}/post`).expect(401);
        await request(app).delete(`/trip-plan/${TRIP_ID}/post`).expect(401);
    });
});

describe("remove the post", () => {
    it("the owner removes it: the trip goes private, the introduction is gone and the public gets 404", async () => {
        await share().expect(200);

        const res = await remove().expect(200);

        expect(res.body).toMatchObject({ message: "Post removed", isPosted: false, visibility: "private", content: "" });
        expect(trip.postContent).toBeUndefined();
        await request(app).get(`/public-trip/${TRIP_ID}`).expect(404);
        expect((await request(app).get("/public-trip").expect(200)).body.items).toEqual([]);
    });

    it("also turns off the share link of the trip", async () => {
        wireStore({ visibility: "public", shareEnabled: true, shareToken: "t" });

        await remove().expect(200);

        expect(tripPlanRepository.disableShare).toHaveBeenCalledWith(TRIP_ID);
    });

    it("is idempotent and keeps the trip itself", async () => {
        await remove().expect(200);
        await remove().expect(200);

        expect(trip.status).toBe("active");
    });
});
