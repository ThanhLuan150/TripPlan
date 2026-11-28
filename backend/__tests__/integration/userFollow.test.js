// HTTP-level tests of following users: authorization, follow / unfollow, duplicates, self follow, missing and blocked accounts.
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
vi.mock("../../src/repositories/followRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), countFollowers: vi.fn(), countFollowing: vi.fn() },
}));
vi.mock("../../src/repositories/contentRepository.js", () => ({ default: { listPublishedShowcase: vi.fn(), listPublishedVideos: vi.fn() } }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: followRepository } = await import("../../src/repositories/followRepository.js");
const { default: contentRepository } = await import("../../src/repositories/contentRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const auth = `Bearer ${generateAccessToken({ _id: USER })}`;
let accounts;
// in-memory relation set standing in for the collection
let relations;

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    contentRepository.listPublishedShowcase.mockResolvedValue([]);
    contentRepository.listPublishedVideos.mockResolvedValue([]);
    accounts = {
        [USER]: { _id: USER, username: "me", isActive: "active", role: "user", lastActiveAt: new Date(), refreshToken: generateRefreshToken({ _id: USER }) },
        [OTHER]: { _id: OTHER, username: "other", fullname: "Other", email: "o@x.com", isActive: "active", role: "user", experience: 10 },
    };
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    relations = new Set();
    followRepository.add.mockImplementation(async (a, b) => relations.add(`${a}>${b}`));
    followRepository.remove.mockImplementation(async (a, b) => relations.delete(`${a}>${b}`));
    followRepository.exists.mockImplementation(async (a, b) => relations.has(`${a}>${b}`));
    followRepository.countFollowers.mockImplementation(async (id) => [...relations].filter((r) => r.endsWith(`>${id}`)).length);
    followRepository.countFollowing.mockImplementation(async (id) => [...relations].filter((r) => r.startsWith(`${id}>`)).length);
});

describe("follow endpoints", () => {
    it("require sign-in", async () => {
        expect((await request(app).get(`/user/${OTHER}/profile`)).status).toBe(401);
        expect((await request(app).post(`/user/${OTHER}/follow`)).status).toBe(401);
        expect((await request(app).delete(`/user/${OTHER}/follow`)).status).toBe(401);
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("follows an account, shows Following and updates the followers count", async () => {
        const before = await request(app).get(`/user/${OTHER}/profile`).set("Authorization", auth);
        expect(before.body.user).toMatchObject({ following: false, followersCount: 0, isSelf: false });

        const res = await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ following: true, followersCount: 1 });
        expect(followRepository.add).toHaveBeenCalledWith(USER, OTHER);

        const after = await request(app).get(`/user/${OTHER}/profile`).set("Authorization", auth);
        expect(after.body.user).toMatchObject({ following: true, followersCount: 1 });
        expect(after.body.user).not.toHaveProperty("email");
    });

    it("never counts a duplicate follow twice", async () => {
        await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth);
        const again = await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(again.status).toBe(200);
        expect(again.body.followersCount).toBe(1);
        expect(relations.size).toBe(1);
    });

    it("unfollows and updates the count", async () => {
        await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth);
        const res = await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ following: false, followersCount: 0 });
    });

    it("unfollow twice is idempotent and never errors", async () => {
        await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth);
        await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);
        const res = await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ following: false, followersCount: 0 });
    });

    it("unfollowing someone you never followed changes nothing", async () => {
        relations.add(`${OTHER}>${USER}`);
        const res = await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ following: false, followersCount: 0, followingCount: 1 });
        expect(relations.has(`${OTHER}>${USER}`)).toBe(true);
    });

    it("unfollow keeps the other relations and updates both counts", async () => {
        const THIRD = "64b000000000000000000003";
        accounts[THIRD] = { _id: THIRD, username: "third", isActive: "active", role: "user" };
        relations.add(`${USER}>${OTHER}`);
        relations.add(`${USER}>${THIRD}`);
        relations.add(`${THIRD}>${OTHER}`);

        const res = await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(res.body).toMatchObject({ following: false, followersCount: 1 });
        expect([...relations].sort()).toEqual([`${THIRD}>${OTHER}`, `${USER}>${THIRD}`].sort());
        const mine = await request(app).get("/user/me/profile").set("Authorization", auth);
        expect(mine.body.user.followingCount).toBe(1);
    });

    it("never removes another account's relation, whatever the client sends", async () => {
        relations.add(`${OTHER}>${USER}`);
        await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth).send({ followerId: OTHER, userId: OTHER });

        expect(followRepository.remove).toHaveBeenCalledWith(USER, OTHER);
        expect(relations.has(`${OTHER}>${USER}`)).toBe(true);
    });

    it("answers 404 when unfollowing a missing account or a malformed id", async () => {
        expect((await request(app).delete("/user/64b0000000000000000000ff/follow").set("Authorization", auth)).status).toBe(404);
        expect((await request(app).delete("/user/abc/follow").set("Authorization", auth)).status).toBe(404);
    });

    it("can still unfollow a suspended account", async () => {
        relations.add(`${USER}>${OTHER}`);
        accounts[OTHER].isActive = "suspended";

        const res = await request(app).delete(`/user/${OTHER}/follow`).set("Authorization", auth);

        expect(res.status).toBe(200);
        expect(relations.size).toBe(0);
    });

    it("returns your own profile with your followers at /user/me/profile", async () => {
        relations.add(`${OTHER}>${USER}`);
        relations.add(`${USER}>${OTHER}`);

        const res = await request(app).get("/user/me/profile").set("Authorization", auth);

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({ id: USER, isSelf: true, followersCount: 1, followingCount: 1 });
    });

    it("refuses to follow yourself", async () => {
        const res = await request(app).post(`/user/${USER}/follow`).set("Authorization", auth);

        expect(res.status).toBe(400);
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 for an account that does not exist, is deleted or has a malformed id", async () => {
        accounts["64b000000000000000000003"] = { _id: "64b000000000000000000003", isActive: "delete" };
        for (const id of ["64b0000000000000000000ff", "64b000000000000000000003", "not-an-id"]) {
            expect((await request(app).post(`/user/${id}/follow`).set("Authorization", auth)).status).toBe(404);
            expect((await request(app).get(`/user/${id}/profile`).set("Authorization", auth)).status).toBe(404);
        }
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("answers 403 for a suspended account", async () => {
        accounts[OTHER].isActive = "suspended";

        expect((await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth)).status).toBe(403);
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("always follows as the caller, whatever the client sends", async () => {
        await request(app).post(`/user/${OTHER}/follow`).set("Authorization", auth).send({ followerId: OTHER, userId: OTHER });

        expect(followRepository.add).toHaveBeenCalledWith(USER, OTHER);
    });
});
