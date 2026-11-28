import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/models/TripPlan.js", () => ({
    default: { find: vi.fn(), countDocuments: vi.fn(), findByIdAndUpdate: vi.fn() },
}));

const { default: TripPlan } = await import("../../../src/models/TripPlan.js");
const { default: repo } = await import("../../../src/repositories/tripPlanRepository.js");

const chain = () => {
    const lean = vi.fn().mockResolvedValue([]);
    const select = vi.fn(() => ({ lean }));
    const limit = vi.fn(() => ({ select }));
    const skip = vi.fn(() => ({ limit }));
    const sort = vi.fn(() => ({ skip }));
    TripPlan.find.mockReturnValue({ sort });
    return { sort, skip, limit, select };
};

beforeEach(() => vi.resetAllMocks());

describe("tripPlanRepository: search of public posts", () => {
    it("without a keyword it lists every public, not deleted post (no text filter)", async () => {
        const { sort, skip, limit, select } = chain();

        await repo.listPublic(10, 5);

        expect(TripPlan.find).toHaveBeenCalledWith({ visibility: "public", status: { $ne: "delete" } });
        expect(sort).toHaveBeenCalledWith({ _id: -1 });
        expect(skip).toHaveBeenCalledWith(10);
        expect(limit).toHaveBeenCalledWith(5);
        expect(select.mock.calls[0][0]).toContain("postContent");
    });

    it("with a keyword it keeps the public / not deleted filter and matches name, destination and introduction", async () => {
        chain();

        await repo.listPublic(0, 12, "Hà Giang");

        const filter = TripPlan.find.mock.calls[0][0];
        expect(filter).toMatchObject({ visibility: "public", status: { $ne: "delete" } });
        expect(filter.$or.map((condition) => Object.keys(condition)[0])).toEqual(["nameTrip", "location", "postContent"]);
        const regex = filter.$or[0].nameTrip;
        expect(regex).toBeInstanceOf(RegExp);
        expect(regex.test("Chuyến đi ha giang 3 ngày")).toBe(true);
        expect(regex.test("Sa Pa")).toBe(false);
    });

    it("never turns the keyword into an unescaped regular expression", async () => {
        chain();

        await repo.listPublic(0, 12, ".*");

        const regex = TripPlan.find.mock.calls[0][0].$or[0].nameTrip;
        expect(regex.test("anything")).toBe(false);
        expect(regex.test("a .* b")).toBe(true);
    });

    it("counts with the same filter, so the total matches the pages", () => {
        repo.countPublic("dalat");
        repo.countPublic();

        const withKeyword = TripPlan.countDocuments.mock.calls[0][0];
        expect(withKeyword).toMatchObject({ visibility: "public", status: { $ne: "delete" } });
        expect(withKeyword.$or).toHaveLength(3);
        expect(TripPlan.countDocuments).toHaveBeenLastCalledWith({ visibility: "public", status: { $ne: "delete" } });
    });
});

describe("tripPlanRepository: posts", () => {
    it("sharing a post makes the trip public with the introduction and the date", () => {
        const date = new Date();
        repo.setPost("t1", "Hello", date);

        expect(TripPlan.findByIdAndUpdate).toHaveBeenCalledWith(
            "t1",
            { $set: { visibility: "public", postContent: "Hello", postedAt: date } },
            { new: true },
        );
    });

    it("going private drops the introduction, going public keeps it and stamps the first day it became a post", () => {
        repo.setVisibility("t1", "private");
        repo.setVisibility("t1", "public");

        expect(TripPlan.findByIdAndUpdate.mock.calls[0][1]).toEqual({
            $set: { visibility: "private" },
            $unset: { postContent: "", postedAt: "" },
        });
        expect(TripPlan.findByIdAndUpdate.mock.calls[1][1]).toEqual({ $set: { visibility: "public" }, $min: { postedAt: expect.any(Date) } });
    });
});

describe("tripPlanRepository: counts of posts for the admin panel", () => {
    it("counts the public, not deleted trips, the ones shared in a period and one author's", () => {
        const from = new Date("2026-01-01");
        const to = new Date("2026-02-01");
        repo.countPosts();
        repo.countPostsBetween(from, to);
        repo.countPostsByUser("u1");

        expect(TripPlan.countDocuments.mock.calls).toEqual([
            [{ visibility: "public", status: { $ne: "delete" } }],
            [{ visibility: "public", status: { $ne: "delete" }, postedAt: { $gte: from, $lt: to } }],
            [{ userId: "u1", visibility: "public", status: { $ne: "delete" } }],
        ]);
    });
});
