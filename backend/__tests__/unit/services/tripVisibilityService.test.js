import { beforeEach, describe, expect, it, vi } from "vitest";
import tripVisibilityService, { visibilityOf } from "../../../src/services/tripVisibilityService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";

vi.mock("../../../src/config/env.js", () => ({ default: { webUrl: "https://aloca.test" } }));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({
    default: { setVisibility: vi.fn(), disableShare: vi.fn(), findPublicById: vi.fn(), listPublic: vi.fn(), countPublic: vi.fn() },
}));
vi.mock("../../../src/services/tripService.js", () => ({ default: { duplicateTrip: vi.fn() } }));
vi.mock("../../../src/repositories/postLikeRepository.js", () => ({
    default: {
        exists: vi.fn().mockResolvedValue(false), countByTrip: vi.fn().mockResolvedValue(0),
        countByTrips: vi.fn().mockResolvedValue({}), likedTripIds: vi.fn().mockResolvedValue([]),
    },
}));
vi.mock("../../../src/repositories/savedPostRepository.js", () => ({
    default: { exists: vi.fn().mockResolvedValue(false), savedTripIds: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));

const ID = "64b0000000000000000000a1";

beforeEach(() => vi.clearAllMocks());

describe("trip visibility service", () => {
    it("a trip without a value (saved before the field existed) is private", () => {
        expect(visibilityOf({})).toBe("private");
        expect(visibilityOf({ visibility: "weird" })).toBe("private");
        expect(visibilityOf({ visibility: "public" })).toBe("public");
    });

    it("a public trip gets the web link, a private one gets none", async () => {
        expect(await tripVisibilityService.getVisibility({ _id: ID, visibility: "public" })).toMatchObject({
            visibility: "public",
            publicUrl: `https://aloca.test/trip/${ID}`,
        });
        expect(await tripVisibilityService.getVisibility({ _id: ID })).toMatchObject({ visibility: "private", publicUrl: null });
    });

    it("making a trip public writes once and returns the link", async () => {
        const res = await tripVisibilityService.setVisibility({ _id: ID }, "public");
        expect(tripPlanRepository.setVisibility).toHaveBeenCalledWith(ID, "public");
        expect(res.publicUrl).toBe(`https://aloca.test/trip/${ID}`);
        expect(tripPlanRepository.disableShare).not.toHaveBeenCalled();
    });

    it("making a shared trip private revokes the share link and drops the public link", async () => {
        const res = await tripVisibilityService.setVisibility({ _id: ID, visibility: "public", shareEnabled: true }, "private");
        expect(tripPlanRepository.disableShare).toHaveBeenCalledWith(ID);
        expect(res).toMatchObject({ visibility: "private", publicUrl: null });
    });

    it("rejects anything but public / private before touching the database", async () => {
        for (const bad of ["x", "", null, undefined, 1, { $ne: 1 }]) {
            await expect(tripVisibilityService.setVisibility({ _id: ID }, bad)).rejects.toMatchObject({ status: 400 });
        }
        expect(tripPlanRepository.setVisibility).not.toHaveBeenCalled();
    });

    it("an id that is not an ObjectId never reaches the database", async () => {
        await expect(tripVisibilityService.getPublicTrip({ $ne: "x" })).rejects.toMatchObject({ status: 404 });
        expect(tripPlanRepository.findPublicById).not.toHaveBeenCalled();
    });

    it("lists public trips with safe paging, whatever the query holds", async () => {
        tripPlanRepository.listPublic.mockResolvedValue([{ _id: ID }]);
        tripPlanRepository.countPublic.mockResolvedValue(30);
        expect(await tripVisibilityService.listPublicTrips({ page: "3", limit: "10" })).toMatchObject({ page: 3, limit: 10, total: 30, items: [{ _id: ID }] });
        expect(tripPlanRepository.listPublic).toHaveBeenLastCalledWith(20, 10, "");
        for (const query of [undefined, {}, { page: { $gt: 1 }, limit: ["x"] }, { page: "0", limit: "-5" }]) {
            const res = await tripVisibilityService.listPublicTrips(query);
            expect(res.page).toBeGreaterThanOrEqual(1);
            expect(res.limit).toBeGreaterThanOrEqual(1);
            expect(res.limit).toBeLessThanOrEqual(50);
        }
    });

    it("copying a trip that is not public never reaches the copy code", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);
        await expect(tripVisibilityService.copyPublicTrip(ID, "u1")).rejects.toMatchObject({ status: 404 });
        await expect(tripVisibilityService.copyPublicTrip("nope", "u1")).rejects.toMatchObject({ status: 404 });
    });
});

describe("search of public trips", () => {
    beforeEach(() => {
        tripPlanRepository.listPublic.mockResolvedValue([]);
        tripPlanRepository.countPublic.mockResolvedValue(0);
    });

    it("passes the cleaned keyword to the list AND to the count, and answers it back", async () => {
        const res = await tripVisibilityService.listPublicTrips({ q: "  Đà   Lạt ", page: "2", limit: "5" });

        expect(tripPlanRepository.listPublic).toHaveBeenLastCalledWith(5, 5, "Đà Lạt");
        expect(tripPlanRepository.countPublic).toHaveBeenLastCalledWith("Đà Lạt");
        expect(res).toMatchObject({ q: "Đà Lạt", page: 2, limit: 5, total: 0, items: [] });
    });

    it("a missing or blank keyword is a plain list", async () => {
        await tripVisibilityService.listPublicTrips({ q: "   " });
        expect(tripPlanRepository.listPublic).toHaveBeenLastCalledWith(0, 12, "");
        await tripVisibilityService.listPublicTrips({});
        expect(tripPlanRepository.countPublic).toHaveBeenLastCalledWith("");
    });

    it.each([[["a", "b"]], [{ $ne: "x" }], ["a".repeat(101)]])("rejects the keyword %j with 400 before any query", async (q) => {
        tripPlanRepository.listPublic.mockClear();

        await expect(tripVisibilityService.listPublicTrips({ q })).rejects.toMatchObject({ status: 400 });
        expect(tripPlanRepository.listPublic).not.toHaveBeenCalled();
        expect(tripPlanRepository.countPublic).not.toHaveBeenCalled();
    });
});
