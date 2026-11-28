// HTTP-level tests of saving posts (public trips): authorization, save / unsave, duplicates, the private
// "saved posts" list, deleted / private posts, and the saved state shown in the public list and detail.
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
    default: { findPublicById: vi.fn(), listPublic: vi.fn(), countPublic: vi.fn(), findPublicIdsIn: vi.fn(), listPublicByIds: vi.fn() },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
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
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: postLikeRepository } = await import("../../src/repositories/postLikeRepository.js");
const { default: savedPostRepository } = await import("../../src/repositories/savedPostRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const POST = "64b0000000000000000000a1";
const POST_2 = "64b0000000000000000000a2";
const auth = (id = USER) => `Bearer ${generateAccessToken({ _id: id })}`;
let accounts;
let saves; // ordered list of "userId>tripId" standing in for the collection (newest last)
let posts; // public posts by id

const savedBy = (userId) => saves.filter((s) => s.startsWith(`${userId}>`)).map((s) => s.split(">")[1]).reverse();

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
        [POST_2]: { _id: POST_2, nameTrip: "Hue", location: "Hue" },
    };
    saves = [];
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    tripPlanRepository.findPublicById.mockImplementation(async (id) => posts[id] ?? null);
    tripPlanRepository.listPublic.mockImplementation(async () => Object.values(posts));
    tripPlanRepository.countPublic.mockImplementation(async () => Object.keys(posts).length);
    tripPlanRepository.findPublicIdsIn.mockImplementation(async (ids) => ids.filter((id) => posts[id]));
    tripPlanRepository.listPublicByIds.mockImplementation(async (ids) => ids.filter((id) => posts[id]).map((id) => posts[id]));
    tripDayRepository.findByTripId.mockResolvedValue([]);
    postLikeRepository.exists.mockResolvedValue(false);
    postLikeRepository.countByTrip.mockResolvedValue(0);
    postLikeRepository.countByTrips.mockResolvedValue({});
    postLikeRepository.likedTripIds.mockResolvedValue([]);
    savedPostRepository.add.mockImplementation(async (u, t) => {
        if (!saves.includes(`${u}>${t}`)) saves.push(`${u}>${t}`);
    });
    savedPostRepository.remove.mockImplementation(async (u, t) => {
        saves = saves.filter((s) => s !== `${u}>${t}`);
    });
    savedPostRepository.exists.mockImplementation(async (u, t) => saves.includes(`${u}>${t}`));
    savedPostRepository.tripIdsByUser.mockImplementation(async (u) => savedBy(u));
    savedPostRepository.savedTripIds.mockImplementation(async (u, ids) => ids.filter((t) => saves.includes(`${u}>${t}`)).map(String));
});

describe("save endpoints", () => {
    it("require sign-in", async () => {
        expect((await request(app).post(`/public-trip/${POST}/save`)).status).toBe(401);
        expect((await request(app).delete(`/public-trip/${POST}/save`)).status).toBe(401);
        expect((await request(app).get("/user/saved-posts")).status).toBe(401);
        expect(savedPostRepository.add).not.toHaveBeenCalled();
        expect(savedPostRepository.remove).not.toHaveBeenCalled();
        expect(savedPostRepository.tripIdsByUser).not.toHaveBeenCalled();
    });

    it("an invalid token is refused, not treated as anonymous", async () => {
        expect((await request(app).post(`/public-trip/${POST}/save`).set("Authorization", "Bearer nope")).status).toBe(401);
        expect((await request(app).get("/user/saved-posts").set("Authorization", "Bearer nope")).status).toBe(401);
        expect(savedPostRepository.add).not.toHaveBeenCalled();
    });

    it("saves a post for the caller", async () => {
        const res = await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ saved: true });
        expect(savedPostRepository.add).toHaveBeenCalledWith(USER, POST);
    });

    it("never stores a duplicate save", async () => {
        await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());
        const again = await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());

        expect(again.status).toBe(200);
        expect(again.body).toMatchObject({ saved: true });
        expect(saves).toHaveLength(1);
    });

    it("saves for the token's user, whatever the client sends", async () => {
        await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth()).send({ userId: OTHER });

        expect(savedPostRepository.add).toHaveBeenCalledWith(USER, POST);
        expect(saves).toEqual([`${USER}>${POST}`]);
    });

    it("unsaves and keeps the saves of other accounts", async () => {
        saves.push(`${OTHER}>${POST}`);
        await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());
        const res = await request(app).delete(`/public-trip/${POST}/save`).set("Authorization", auth()).send({ userId: OTHER });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ saved: false });
        expect(savedPostRepository.remove).toHaveBeenCalledWith(USER, POST);
        expect(saves).toEqual([`${OTHER}>${POST}`]);
    });

    it("unsave twice is idempotent and never errors", async () => {
        await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());
        await request(app).delete(`/public-trip/${POST}/save`).set("Authorization", auth());
        const res = await request(app).delete(`/public-trip/${POST}/save`).set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ saved: false });
    });

    it("handles many requests at the same moment with a single save", async () => {
        const results = await Promise.all(
            Array.from({ length: 8 }, () => request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth())),
        );

        expect(results.every((r) => r.status === 200)).toBe(true);
        expect(saves).toHaveLength(1);
    });

    it("answers 404 for a deleted / private / unknown post and stores nothing", async () => {
        const res = await request(app).post("/public-trip/64b0000000000000000000ff/save").set("Authorization", auth());

        expect(res.status).toBe(404);
        expect(savedPostRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 for a malformed id", async () => {
        expect((await request(app).post("/public-trip/abc/save").set("Authorization", auth())).status).toBe(404);
        expect((await request(app).delete("/public-trip/abc/save").set("Authorization", auth())).status).toBe(404);
    });

    it("a post that was deleted after the save can still be unsaved (cleanup), with a 404", async () => {
        saves.push(`${USER}>${POST}`);
        delete posts[POST];

        const res = await request(app).delete(`/public-trip/${POST}/save`).set("Authorization", auth());

        expect(res.status).toBe(404);
        expect(saves).toEqual([]);
    });

    it("refuses a suspended account", async () => {
        accounts[USER].isActive = "suspended";

        expect((await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth())).status).toBe(401);
        expect(savedPostRepository.add).not.toHaveBeenCalled();
    });
});

describe("GET /user/saved-posts (private list)", () => {
    it("answers an empty list when nothing is saved", async () => {
        const res = await request(app).get("/user/saved-posts").set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ total: 0, items: [] });
        expect(res.headers["cache-control"]).toBe("no-store");
    });

    it("lists the caller's saved posts, newest save first", async () => {
        await request(app).post(`/public-trip/${POST}/save`).set("Authorization", auth());
        await request(app).post(`/public-trip/${POST_2}/save`).set("Authorization", auth());

        const res = await request(app).get("/user/saved-posts").set("Authorization", auth());

        expect(res.status).toBe(200);
        expect(res.body.items.map((i) => i._id)).toEqual([POST_2, POST]);
        expect(res.body.items.every((i) => i.saved === true)).toBe(true);
        expect(res.body.total).toBe(2);
    });

    it("never shows another account's saves, even when a user id is asked for", async () => {
        saves.push(`${OTHER}>${POST}`);

        const res = await request(app).get(`/user/saved-posts?userId=${OTHER}`).set("Authorization", auth());

        expect(res.body.items).toEqual([]);
        expect(savedPostRepository.tripIdsByUser).toHaveBeenCalledWith(USER);
        expect(savedPostRepository.tripIdsByUser).not.toHaveBeenCalledWith(OTHER);
    });

    it("another account has its own list", async () => {
        saves.push(`${USER}>${POST}`);

        const mine = await request(app).get("/user/saved-posts").set("Authorization", auth(USER));
        const theirs = await request(app).get("/user/saved-posts").set("Authorization", auth(OTHER));

        expect(mine.body.items).toHaveLength(1);
        expect(theirs.body.items).toEqual([]);
    });

    it("another account's profile route is not a way to read the list", async () => {
        saves.push(`${USER}>${POST}`);

        const res = await request(app).get(`/user/${USER}/saved-posts`).set("Authorization", auth(OTHER));

        expect(res.status).toBe(404);
    });

    it("leaves out posts deleted or made private since", async () => {
        saves.push(`${USER}>${POST}`, `${USER}>${POST_2}`);
        delete posts[POST_2];

        const res = await request(app).get("/user/saved-posts").set("Authorization", auth());

        expect(res.body.items.map((i) => i._id)).toEqual([POST]);
        expect(res.body.total).toBe(1);
    });

    it("comes back when a post turns public again", async () => {
        saves.push(`${USER}>${POST}`);
        const gone = posts[POST];
        delete posts[POST];
        expect((await request(app).get("/user/saved-posts").set("Authorization", auth())).body.items).toEqual([]);

        posts[POST] = gone;

        expect((await request(app).get("/user/saved-posts").set("Authorization", auth())).body.items).toHaveLength(1);
    });

    it("pages the list", async () => {
        saves.push(`${USER}>${POST}`, `${USER}>${POST_2}`);

        const res = await request(app).get("/user/saved-posts?page=2&limit=1").set("Authorization", auth());

        expect(res.body).toMatchObject({ page: 2, limit: 1, total: 2 });
        expect(res.body.items.map((i) => i._id)).toEqual([POST]);
    });
});

describe("saved state in the public list and detail", () => {
    it("a visitor who is not signed in never sees a saved post", async () => {
        saves.push(`${OTHER}>${POST}`);

        const list = await request(app).get("/public-trip");
        const detail = await request(app).get(`/public-trip/${POST}`);

        expect(list.body.items.every((i) => i.saved === false)).toBe(true);
        expect(detail.body.saved).toBe(false);
        expect(savedPostRepository.savedTripIds).not.toHaveBeenCalled();
    });

    it("a signed-in visitor sees which posts they saved, and only their own", async () => {
        saves.push(`${USER}>${POST}`, `${OTHER}>${POST_2}`);

        const list = await request(app).get("/public-trip").set("Authorization", auth());
        const detail = await request(app).get(`/public-trip/${POST}`).set("Authorization", auth());

        expect(list.body.items.find((i) => i._id === POST).saved).toBe(true);
        expect(list.body.items.find((i) => i._id === POST_2).saved).toBe(false);
        expect(detail.body.saved).toBe(true);
    });
});
