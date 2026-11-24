import { beforeEach, describe, expect, it, vi } from "vitest";
import tripPlanController from "../../../src/controllers/tripPlanController.js";
import tripService from "../../../src/services/tripService.js";
import { validTripId } from "../../../src/middleware/ownership.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../src/services/tripService.js", () => ({
    default: { listFavoriteTrips: vi.fn(), addFavoriteTrip: vi.fn(), removeFavoriteTrip: vi.fn() },
}));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: {} }));
vi.mock("../../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));

const user = { _id: "u1" };
const run = async (handler, req) => {
    const res = mockRes();
    await new Promise((resolve) => {
        res.json.mockImplementation(() => {
            resolve();
            return res;
        });
        handler(req, res, resolve);
    });
    return res;
};

beforeEach(() => vi.resetAllMocks());

describe("favorite trip controller", () => {
    it("lists the favorites of req.user", async () => {
        tripService.listFavoriteTrips.mockResolvedValue({ dataTrip: [] });

        const res = await run(tripPlanController.listFavoriteTrips, mockReq({ user }));

        expect(tripService.listFavoriteTrips).toHaveBeenCalledWith("u1");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("adds the trip loaded by ownTrip for req.user", async () => {
        tripService.addFavoriteTrip.mockResolvedValue({ isFavorite: true });
        const trip = { _id: "t1" };

        const res = await run(tripPlanController.addFavoriteTrip, mockReq({ user, trip }));

        expect(tripService.addFavoriteTrip).toHaveBeenCalledWith(trip, "u1");
        expect(res.json).toHaveBeenCalledWith({ isFavorite: true });
    });

    it("removes by the id in the url for req.user only", async () => {
        tripService.removeFavoriteTrip.mockResolvedValue({ isFavorite: false });

        await run(tripPlanController.removeFavoriteTrip, mockReq({ user, params: { id: "t1" } }));

        expect(tripService.removeFavoriteTrip).toHaveBeenCalledWith("t1", "u1");
    });
});

describe("validTripId", () => {
    it("rejects an invalid id with 404", () => {
        expect(() => validTripId(mockReq({ params: { id: "nope" } }), mockRes(), vi.fn())).toThrow("Data Trip not found!");
    });

    it("lets a valid id through", () => {
        const next = vi.fn();
        validTripId(mockReq({ params: { id: "64b0000000000000000000aa" } }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
