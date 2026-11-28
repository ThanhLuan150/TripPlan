import { beforeEach, describe, expect, it, vi } from "vitest";
import tripPostService from "../../../src/services/tripPostService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import tripVisibilityService from "../../../src/services/tripVisibilityService.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { setPost: vi.fn() } }));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../../src/services/tripVisibilityService.js", () => ({
    default: { setVisibility: vi.fn() },
    visibilityOf: (trip) => (trip?.visibility === "public" ? "public" : "private"),
    publicUrlOf: (id, visibility) => (visibility === "public" ? `https://web/trip/${id}` : null),
}));

const TRIP = "64b0000000000000000000a1";
const trip = (extra = {}) => ({ _id: TRIP, nameTrip: "Da Lat", ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: "d1" }]);
    tripPlanRepository.setPost.mockImplementation(async (id, postContent, postedAt) => trip({ visibility: "public", postContent, postedAt }));
    tripVisibilityService.setVisibility.mockResolvedValue({});
});

describe("getPost", () => {
    it("a private trip is not a post", async () => {
        expect(await tripPostService.getPost(trip())).toMatchObject({ isPosted: false, visibility: "private", content: "", postedAt: null, publicUrl: null });
    });

    it("a public trip is a post with its introduction", async () => {
        const postedAt = new Date();
        const result = await tripPostService.getPost(trip({ visibility: "public", postContent: "Hi", postedAt }));

        expect(result).toMatchObject({ isPosted: true, content: "Hi", postedAt, publicUrl: `https://web/trip/${TRIP}` });
    });
});

describe("sharePost", () => {
    it("publishes the trip with the trimmed introduction and the date", async () => {
        const result = await tripPostService.sharePost(trip(), { content: "  Chuyến đi tuyệt vời  " });

        const [id, content, date] = tripPlanRepository.setPost.mock.calls[0];
        expect(id).toBe(TRIP);
        expect(content).toBe("Chuyến đi tuyệt vời");
        expect(date).toBeInstanceOf(Date);
        expect(result).toMatchObject({ message: "Trip shared as a post", isPosted: true, visibility: "public", content: "Chuyến đi tuyệt vời" });
    });

    it("the introduction is optional", async () => {
        await tripPostService.sharePost(trip(), {});
        await tripPostService.sharePost(trip(), undefined);
        await tripPostService.sharePost(trip(), { content: null });

        expect(tripPlanRepository.setPost.mock.calls.map((call) => call[1])).toEqual(["", "", ""]);
    });

    it("sharing again changes the introduction and keeps the date of the first share", async () => {
        const first = new Date("2026-01-01");
        const result = await tripPostService.sharePost(trip({ visibility: "public", postedAt: first, postContent: "old" }), { content: "new" });

        expect(tripPlanRepository.setPost).toHaveBeenCalledWith(TRIP, "new", first);
        expect(result.message).toBe("Post updated");
    });

    it.each([[5], [{}], [["a"]], [true]])("rejects an introduction that is not text (%j)", async (content) => {
        await expect(tripPostService.sharePost(trip(), { content })).rejects.toMatchObject({ status: 400 });
        expect(tripPlanRepository.setPost).not.toHaveBeenCalled();
    });

    it("accepts the longest introduction and rejects one more character", async () => {
        await expect(tripPostService.sharePost(trip(), { content: "a".repeat(1000) })).resolves.toBeDefined();
        await expect(tripPostService.sharePost(trip(), { content: "a".repeat(1001) })).rejects.toMatchObject({ status: 400 });
    });

    it("refuses a trip without any day: there is nothing to show", async () => {
        tripDayRepository.findByTripId.mockResolvedValue([]);

        await expect(tripPostService.sharePost(trip(), { content: "x" })).rejects.toMatchObject({ status: 400 });
        expect(tripPlanRepository.setPost).not.toHaveBeenCalled();
    });

    it("does not copy the plan: only the id of the trip and the text are written", async () => {
        await tripPostService.sharePost(trip({ nameTrip: "secret" }), { content: "x" });

        expect(tripPlanRepository.setPost.mock.calls[0]).toHaveLength(3);
    });
});

describe("removePost", () => {
    it("takes the trip back to private through the visibility rule (also revokes the share link)", async () => {
        const current = trip({ visibility: "public", postContent: "x" });

        const result = await tripPostService.removePost(current);

        expect(tripVisibilityService.setVisibility).toHaveBeenCalledWith(current, "private");
        expect(result).toMatchObject({ message: "Post removed", isPosted: false, visibility: "private", content: "", publicUrl: null });
    });

    it("is idempotent for a trip that is not a post", async () => {
        await expect(tripPostService.removePost(trip())).resolves.toMatchObject({ isPosted: false });
    });
});
