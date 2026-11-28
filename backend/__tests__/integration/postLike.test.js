// HTTP-level tests of liking posts (public trips): authorization, like / unlike, duplicates, counts,
// deleted / private posts, and the like state shown in the public list and detail.
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
    default: { findPublicById: vi.fn(), listPublic: vi.fn(), countPublic: vi.fn() },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/postLikeRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), countByTrip: vi.fn(), countByTrips: vi.fn(), likedTripIds: vi.fn() },
}));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: postLikeRepository } = await import("../../src/repositories/postLikeRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const POST = "64b0000000000000000000a1";
const POST_2 = "64b0000000000000000000a2";
const auth = (id = USER) => `Bearer ${generateAccessToken({ _id: id })}`;
let accounts;
let likes; // in-memory "userId>tripId" set standing in for the collection
let posts; // public posts by id

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    accounts = {
        [USER]: { _id: USER, username: "me", isActive: "active", role: "user", lastActiveAt: new Date(), refreshToken: generateRefreshToken({ _id: USER }) },
        [OTHER]: { _id: OTHER, username: "other", isActive: "active", role: "user", lastActiveAt: new Date(), refreshToken: generateRefreshToken({ _id: OTHER }) },
    };
    posts = {
        [POST]: { _id: POST, nameTrip: "Da Lat", location: "Da Lat", status: "active", visibility: "public" },
        [POST_2]: { _id: POST_2, location: "Hue" },
    };
    likes = new Set();
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    tripPlanRepository.findPublicById.mockImplementation(async (id) => posts[id] ?? null);
    tripPlanRepository.listPublic.mockImplementation(async () => Object.values(posts));
    tripPlanRepository.countPublic.mockImplementation(async () => Object.keys(posts).length);
    tripDayRepository.findByTripId.mockResolvedValue([]);
    postLikeRepository.add.mockImplementation(async (u, t) => likes.add(`${u}>${t}`));
    postLikeRepository.remove.mockImplementation(async (u, t) => likes.delete(`${u}>${t}`));
    postLikeRepository.exists.mockImplementation(async (u, t) => likes.has(`${u}>${t}`));
    postLikeRepository.countByTrip.mockImplementation(async (t) => [...likes].filter((l) => l.endsWith(`>${t}`)).length);
    postLikeRepository.countByTrips.mockImplementation(async (ids) =>
        Object.fromEntries(ids.map((t) => [String(t), [...likes].filter((l) => l.endsWith(`>${t}`)).length])));
    postLikeRepository.likedTripIds.mockImplementation(async (u, ids) => ids.filter((t) => likes.has(`${u}>${t}`)).map(String));
});

describe("like endpoints", () => {
    it("require sign-in", async () => {
        expect((await request(app).post(`/public-trip/${POST}/like`)).status).toBe(401);
        expect((await request(app).delete(`/public-trip/${POST}/like`)).status).toBe(401);
        expect(postLikeRepository.add).not.toHaveBeenCalled();
        expect(postLikeRepository.remove).not.toHaveBeenCalled();
    });

    it("an invalid token is refused, not treated as anonymous", async () => {
        expect((await request(app).post(`/public-trip/${POST}/like`).set("Authorization", "Bearer nope")).status).toBe(401);
        expect(postLikeRepository.add).not.toHaveBeenCalled();
    });

    it("likes a post, shows Liked and the total", async () => {
        const res = await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ liked: true, likesCount: 1 });
        expect(postLikeRepository.add).toHaveBeenCalledWith(USER, POST);
    });

    it("never counts a duplicate like twice", async () => {
        await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth());
        const again = await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth());

        expect(again.status).toBe(200);
        expect(again.body).toMatchObject({ liked: true, likesCount: 1 });
        expect(likes.size).toBe(1);
    });

    it("counts the likes of different users", async () => {
        await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth(USER));
        const res = await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth(OTHER));

        expect(res.body).toMatchObject({ liked: true, likesCount: 2 });
    });

    it("handles many requests at the same moment with a single like per user", async () => {
        const results = await Promise.all(
            Array.from({ length: 8 }, () => request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth())),
        );

        expect(results.every((r) => r.status === 200)).toBe(true);
        expect(likes.size).toBe(1);
        expect(results.every((r) => r.body.likesCount === 1)).toBe(true);
    });

    it("unlikes and updates the total", async () => {
        await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth(OTHER));
        await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth());
        const res = await request(app).delete(`/public-trip/${POST}/like`).set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ liked: false, likesCount: 1 });
        expect(likes.has(`${OTHER}>${POST}`)).toBe(true);
    });

    it("unlike twice is idempotent and never errors", async () => {
        await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth());
        await request(app).delete(`/public-trip/${POST}/like`).set("Authorization", auth());
        const res = await request(app).delete(`/public-trip/${POST}/like`).set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ liked: false, likesCount: 0 });
    });

    it("never removes another account's like, whatever the client sends", async () => {
        likes.add(`${OTHER}>${POST}`);
        await request(app).delete(`/public-trip/${POST}/like`).set("Authorization", auth()).send({ userId: OTHER });

        expect(postLikeRepository.remove).toHaveBeenCalledWith(USER, POST);
        expect(likes.has(`${OTHER}>${POST}`)).toBe(true);
    });

    it("answers 404 for a deleted / private / unknown post and stores nothing", async () => {
        const res = await request(app).post("/public-trip/64b0000000000000000000ff/like").set("Authorization", auth());

        expect(res.status).toBe(404);
        expect(postLikeRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 for a malformed id", async () => {
        expect((await request(app).post("/public-trip/abc/like").set("Authorization", auth())).status).toBe(404);
        expect((await request(app).delete("/public-trip/abc/like").set("Authorization", auth())).status).toBe(404);
    });

    it("a post that was deleted after the like can still be unliked (cleanup), with a 404", async () => {
        likes.add(`${USER}>${POST}`);
        delete posts[POST];

        const res = await request(app).delete(`/public-trip/${POST}/like`).set("Authorization", auth());

        expect(res.status).toBe(404);
        expect(likes.has(`${USER}>${POST}`)).toBe(false);
    });

    it("refuses a suspended account", async () => {
        accounts[USER].isActive = "suspended";

        expect((await request(app).post(`/public-trip/${POST}/like`).set("Authorization", auth())).status).toBe(401);
        expect(postLikeRepository.add).not.toHaveBeenCalled();
    });
});

describe("like state in the public list and detail", () => {
    it("a visitor who is not signed in sees the total and never a liked post", async () => {
        likes.add(`${OTHER}>${POST}`);

        const list = await request(app).get("/public-trip");
        const detail = await request(app).get(`/public-trip/${POST}`);

        expect(list.status).toBe(200);
        expect(list.body.items.find((i) => i._id === POST)).toMatchObject({ likesCount: 1, liked: false });
        expect(detail.body).toMatchObject({ likesCount: 1, liked: false });
        expect(postLikeRepository.likedTripIds).not.toHaveBeenCalled();
    });

    it("a signed-in visitor sees which posts they liked", async () => {
        likes.add(`${USER}>${POST}`);
        likes.add(`${OTHER}>${POST}`);

        const list = await request(app).get("/public-trip").set("Authorization", auth());
        const detail = await request(app).get(`/public-trip/${POST}`).set("Authorization", auth());

        expect(list.body.items.find((i) => i._id === POST)).toMatchObject({ likesCount: 2, liked: true });
        expect(list.body.items.find((i) => i._id === POST_2)).toMatchObject({ likesCount: 0, liked: false });
        expect(detail.body).toMatchObject({ likesCount: 2, liked: true });
    });

    it("a bad token never breaks reading a public post", async () => {
        const res = await request(app).get(`/public-trip/${POST}`).set("Authorization", "Bearer nope");

        expect(res.status).toBe(200);
        expect(res.body.liked).toBe(false);
    });
});
