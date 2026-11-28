// HTTP-level tests of searching posts (public trips): the keyword, paging, the empty result, the
// limits on the request, and that nothing but the public list is ever queried.
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
    default: { listPublic: vi.fn(), countPublic: vi.fn(), findPublicById: vi.fn() },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/postLikeRepository.js", () => ({
    default: { exists: vi.fn(), countByTrip: vi.fn(), countByTrips: vi.fn(), likedTripIds: vi.fn() },
}));
vi.mock("../../src/repositories/savedPostRepository.js", () => ({
    default: { exists: vi.fn(), savedTripIds: vi.fn() },
}));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: postLikeRepository } = await import("../../src/repositories/postLikeRepository.js");
const { default: savedPostRepository } = await import("../../src/repositories/savedPostRepository.js");

const card = (n, extra = {}) => ({ _id: `64b0000000000000000000${String(n).padStart(2, "0")}`, nameTrip: `Da Lat ${n}`, location: "Đà Lạt", ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    postLikeRepository.countByTrips.mockResolvedValue({});
    postLikeRepository.likedTripIds.mockResolvedValue([]);
    savedPostRepository.savedTripIds.mockResolvedValue([]);
    tripPlanRepository.listPublic.mockResolvedValue([card(1), card(2)]);
    tripPlanRepository.countPublic.mockResolvedValue(2);
});

describe("GET /public-trip?q=", () => {
    it("searches without signing in and answers the matching cards, the keyword and the total", async () => {
        const res = await request(app).get("/public-trip").query({ q: "đà lạt" }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(0, 12, "đà lạt");
        expect(tripPlanRepository.countPublic).toHaveBeenCalledWith("đà lạt");
        expect(res.body).toMatchObject({ q: "đà lạt", page: 1, limit: 12, total: 2 });
        expect(res.body.items.map((item) => item.nameTrip)).toEqual(["Da Lat 1", "Da Lat 2"]);
    });

    it("trims the keyword and collapses the spaces", async () => {
        await request(app).get("/public-trip").query({ q: "  da   lat  " }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(0, 12, "da lat");
    });

    it("a blank keyword is the plain list", async () => {
        const res = await request(app).get("/public-trip").query({ q: "   " }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(0, 12, "");
        expect(res.body.q).toBe("");
    });

    it("pages the results: the skip, the page size and the page count follow the request", async () => {
        tripPlanRepository.countPublic.mockResolvedValue(25);

        const res = await request(app).get("/public-trip").query({ q: "lat", page: 3, limit: 5 }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(10, 5, "lat");
        expect(res.body).toMatchObject({ page: 3, limit: 5, total: 25 });
    });

    it("never answers more than 50 per page whatever is asked", async () => {
        const res = await request(app).get("/public-trip").query({ q: "lat", limit: 100000 }).expect(200);

        expect(res.body.limit).toBe(50);
        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(0, 50, "lat");
    });

    it("answers an empty page (not an error) when nothing matches", async () => {
        tripPlanRepository.listPublic.mockResolvedValue([]);
        tripPlanRepository.countPublic.mockResolvedValue(0);

        const res = await request(app).get("/public-trip").query({ q: "zzzz" }).expect(200);

        expect(res.body).toMatchObject({ q: "zzzz", total: 0, items: [] });
    });

    it("answers an empty page for a page after the last one", async () => {
        tripPlanRepository.listPublic.mockResolvedValue([]);
        tripPlanRepository.countPublic.mockResolvedValue(2);

        const res = await request(app).get("/public-trip").query({ q: "lat", page: 9 }).expect(200);

        expect(res.body).toMatchObject({ page: 9, total: 2, items: [] });
    });

    it("rejects a keyword longer than 100 characters with 400 and queries nothing", async () => {
        await request(app).get("/public-trip").query({ q: "a".repeat(101) }).expect(400);
        await request(app).get("/public-trip").query({ q: "a".repeat(100) }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledTimes(1);
    });

    it("rejects a keyword that is not text (repeated or object query parameters) with 400", async () => {
        await request(app).get("/public-trip?q=a&q=b").expect(400);
        await request(app).get("/public-trip?q[$ne]=x").expect(400);

        expect(tripPlanRepository.listPublic).not.toHaveBeenCalled();
    });

    it("keeps the like and save state on the found cards", async () => {
        postLikeRepository.countByTrips.mockResolvedValue({ [card(1)._id]: 3 });

        const res = await request(app).get("/public-trip").query({ q: "lat" }).expect(200);

        expect(res.body.items[0]).toMatchObject({ likesCount: 3, liked: false, saved: false });
    });

    it("treats regular expression characters as text (the repository escapes them)", async () => {
        await request(app).get("/public-trip").query({ q: ".*(" }).expect(200);

        expect(tripPlanRepository.listPublic).toHaveBeenCalledWith(0, 12, ".*(");
    });
});
