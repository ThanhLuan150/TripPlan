import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/repositories/tripRouteProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByDay: vi.fn() },
}));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../../src/utils/routing.js", () => ({ getRouteMatrix: vi.fn() }));

const { default: service } = await import("../../../src/services/tripRouteService.js");
const { default: proposalRepo } = await import("../../../src/repositories/tripRouteProposalRepository.js");
const { default: dayRepo } = await import("../../../src/repositories/tripDayRepository.js");
const { default: challengeRepo } = await import("../../../src/repositories/challengeRepository.js");
const { getRouteMatrix } = await import("../../../src/utils/routing.js");

const TRIP = { _id: "64b0000000000000000000a1" };
const USER = "64b000000000000000000001";
const DAY = "64b0000000000000000000d1";
const PROPOSAL = "64b0000000000000000000c1";
const id = (n) => `64b00000000000000000010${n}`;

// places A, B, C on a line: A at 0, B at 30, C at 10 (current order A, B, C is not the shortest)
const place = (n, name, lat, lng = "108") => ({ _id: id(n), nameLocation: name, location: `${name}, VN`, latitude: lat, longitude: lng });
const A = place(1, "A", "10.0");
const B = place(2, "B", "10.3");
const C = place(3, "C", "10.1");
const matrixOf = (m) => ({ distances: m, durations: m.map((row) => row.map((v) => v * 2)) });

beforeEach(() => {
    vi.resetAllMocks();
    dayRepo.findByTripId.mockResolvedValue([{ _id: DAY, day: 1 }]);
    challengeRepo.findByTripDayId.mockResolvedValue([A, B, C]);
    proposalRepo.create.mockImplementation(async (data) => ({ _id: PROPOSAL, ...data }));
    getRouteMatrix.mockResolvedValue(matrixOf([[0, 30, 10], [30, 0, 20], [10, 20, 0]]));
});

describe("proposeRoute", () => {
    it("proposes a shorter order from the routing service and saves only the proposal", async () => {
        const res = await service.proposeRoute(TRIP, USER, DAY);

        expect(res.proposedOrder.map((p) => p.name)).toEqual(["A", "C", "B"]);
        expect(res.currentOrder.map((p) => p.name)).toEqual(["A", "B", "C"]);
        expect(res.source).toBe("road");
        expect(res.current.distance).toBe(50);
        expect(res.proposed.distance).toBe(30);
        expect(res.proposed.duration).toBe(60);
        expect(res.improved).toBe(true);
        expect(res.proposalId).toBe(PROPOSAL);
        expect(proposalRepo.create).toHaveBeenCalledWith({
            tripId: TRIP._id, userId: USER, dayId: DAY, baseOrder: [id(1), id(2), id(3)], order: [id(1), id(3), id(2)],
        });
        expect(challengeRepo.updateById).not.toHaveBeenCalled();
    });

    it("keeps every place of the day (nothing is dropped)", async () => {
        const res = await service.proposeRoute(TRIP, USER, DAY);
        expect(res.proposedOrder.map((p) => p.id).sort()).toEqual(res.currentOrder.map((p) => p.id).sort());
    });

    it("says so and stores nothing when the current order is already the shortest", async () => {
        getRouteMatrix.mockResolvedValue(matrixOf([[0, 10, 30], [10, 0, 20], [30, 20, 0]]));

        const res = await service.proposeRoute(TRIP, USER, DAY);

        expect(res.improved).toBe(false);
        expect(res.proposalId).toBeNull();
        expect(res.proposedOrder).toEqual(res.currentOrder);
        expect(proposalRepo.create).not.toHaveBeenCalled();
    });

    it("falls back to straight-line distances (no duration) when the routing service is down", async () => {
        getRouteMatrix.mockRejectedValue(new Error("timeout"));
        vi.spyOn(console, "log").mockImplementation(() => {});

        const res = await service.proposeRoute(TRIP, USER, DAY);

        expect(res.source).toBe("straight-line");
        expect(res.proposed.duration).toBeNull();
        expect(res.proposed.legs.every((leg) => leg.duration === null && leg.distance > 0)).toBe(true);
        expect(res.proposedOrder.map((p) => p.name)).toEqual(["A", "C", "B"]);
    });

    it("also falls back when the service finds no road between two places", async () => {
        getRouteMatrix.mockResolvedValue(undefined);
        expect((await service.proposeRoute(TRIP, USER, DAY)).source).toBe("straight-line");
    });

    it("leaves places without coordinates in their slot and lists them", async () => {
        const noPos = { _id: id(4), nameLocation: "X", latitude: undefined, longitude: "" };
        challengeRepo.findByTripDayId.mockResolvedValue([A, noPos, B, C]);

        const res = await service.proposeRoute(TRIP, USER, DAY);

        expect(res.missingCoordinates.map((p) => p.name)).toEqual(["X"]);
        expect(res.proposedOrder.map((p) => p.name)).toEqual(["A", "X", "C", "B"]);
        expect(getRouteMatrix.mock.calls[0][0]).toHaveLength(3);
    });

    it("refuses a day with fewer than 3 places that have a position, naming the missing ones", async () => {
        const noPos = { _id: id(4), nameLocation: "X" };
        challengeRepo.findByTripDayId.mockResolvedValue([A, noPos, B]);

        await expect(service.proposeRoute(TRIP, USER, DAY)).rejects.toMatchObject({
            status: 400,
            body: { code: "ROUTE_NOT_ENOUGH_COORDINATES", missingCoordinates: [{ name: "X" }] },
        });
        expect(getRouteMatrix).not.toHaveBeenCalled();
    });

    it("refuses a day that is not part of the trip", async () => {
        await expect(service.proposeRoute(TRIP, USER, "64b0000000000000000000ff")).rejects.toMatchObject({ status: 404 });
        await expect(service.proposeRoute(TRIP, USER, "nope")).rejects.toMatchObject({ status: 404 });
    });

    it("refuses an unreasonably big day", async () => {
        challengeRepo.findByTripDayId.mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ ...A, _id: `x${i}` })));
        await expect(service.proposeRoute(TRIP, USER, DAY)).rejects.toMatchObject({ status: 400, body: { code: "ROUTE_TOO_MANY_PLACES" } });
    });
});

describe("applyRoute", () => {
    const stored = { dayId: DAY, baseOrder: [id(1), id(2), id(3)], order: [id(1), id(3), id(2)] };

    it("saves the position of every place of the stored proposal and nothing else", async () => {
        proposalRepo.findOwned.mockResolvedValue(stored);

        const res = await service.applyRoute(TRIP, USER, PROPOSAL);

        expect(res.message).toBe("Route updated successfully");
        expect(challengeRepo.updateById.mock.calls).toEqual([[id(1), { order: 0 }], [id(3), { order: 1 }], [id(2), { order: 2 }]]);
        expect(proposalRepo.removeByDay).toHaveBeenCalledWith(DAY);
    });

    it("refuses an unknown, foreign or malformed proposal", async () => {
        proposalRepo.findOwned.mockResolvedValue(null);
        await expect(service.applyRoute(TRIP, USER, PROPOSAL)).rejects.toMatchObject({ status: 404, body: { code: "ROUTE_PROPOSAL_NOT_FOUND" } });
        await expect(service.applyRoute(TRIP, USER, "bad")).rejects.toMatchObject({ status: 404 });
        expect(challengeRepo.updateById).not.toHaveBeenCalled();
    });

    it("refuses with 409 and changes nothing when the day gained or lost a place", async () => {
        proposalRepo.findOwned.mockResolvedValue(stored);
        challengeRepo.findByTripDayId.mockResolvedValue([A, B]);
        await expect(service.applyRoute(TRIP, USER, PROPOSAL)).rejects.toMatchObject({ status: 409, body: { code: "ROUTE_DAY_CHANGED" } });

        challengeRepo.findByTripDayId.mockResolvedValue([A, B, { _id: id(9) }]);
        await expect(service.applyRoute(TRIP, USER, PROPOSAL)).rejects.toMatchObject({ status: 409 });
        expect(challengeRepo.updateById).not.toHaveBeenCalled();
    });

    it("refuses a stored order that is not a permutation of the day", async () => {
        proposalRepo.findOwned.mockResolvedValue({ ...stored, order: [id(1), id(1), id(2)] });
        await expect(service.applyRoute(TRIP, USER, PROPOSAL)).rejects.toMatchObject({ status: 409 });
        expect(challengeRepo.updateById).not.toHaveBeenCalled();
    });
});

describe("discardRoute", () => {
    it("forgets the proposal and touches no place", async () => {
        await service.discardRoute(TRIP, USER, PROPOSAL);
        expect(proposalRepo.remove).toHaveBeenCalledWith(PROPOSAL, TRIP._id, USER);
        expect(challengeRepo.updateById).not.toHaveBeenCalled();
    });

    it("ignores a malformed id", async () => {
        expect((await service.discardRoute(TRIP, USER, "bad")).message).toBe("Proposal discarded");
        expect(proposalRepo.remove).not.toHaveBeenCalled();
    });
});
