// HTTP-level tests of AI route optimization: authorization, preview (nothing saved), Accept, Reject.
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
    default: { findOwnedById: vi.fn(), findPublicById: vi.fn(), findSharedByToken: vi.fn(), updateById: vi.fn() },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/tripRouteProposalRepository.js", () => ({
    default: { create: vi.fn(), findOwned: vi.fn(), remove: vi.fn(), removeByDay: vi.fn() },
}));
vi.mock("../../src/repositories/tripNoteRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/routing.js", () => ({ getRoute: vi.fn(), getRouteMatrix: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: proposalRepository } = await import("../../src/repositories/tripRouteProposalRepository.js");
const { getRouteMatrix } = await import("../../src/utils/routing.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const DAY = "64b0000000000000000000d1";
const PROPOSAL = "64b0000000000000000000c1";
const c = (n) => `64b00000000000000000010${n}`;

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const url = `/trip-plan/${TRIP_ID}/route-optimization`;
const place = (n, name, lat) => ({ _id: c(n), nameLocation: name, latitude: lat, longitude: "108" });

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && userId === OWNER ? { _id: TRIP_ID, userId: OWNER } : null);
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: DAY }]);
    challengeRepository.findByTripDayId.mockResolvedValue([place(1, "A", "10.0"), place(2, "B", "10.3"), place(3, "C", "10.1")]);
    getRouteMatrix.mockResolvedValue({ distances: [[0, 30, 10], [30, 0, 20], [10, 20, 0]], durations: [[0, 60, 20], [60, 0, 40], [20, 40, 0]] });
    proposalRepository.create.mockImplementation(async (data) => ({ _id: PROPOSAL, ...data }));
});

describe("POST /trip-plan/:id/route-optimization", () => {
    it("requires sign-in and ownership", async () => {
        expect((await request(app).post(url).send({ dayId: DAY })).status).toBe(401);
        expect((await request(app).post(url).set("Authorization", auth(STRANGER)).send({ dayId: DAY })).status).toBe(404);
        expect(getRouteMatrix).not.toHaveBeenCalled();
    });

    it("returns current and proposed order with real distances and saves nothing", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY });

        expect(res.status).toBe(200);
        expect(res.body.currentOrder.map((p) => p.name)).toEqual(["A", "B", "C"]);
        expect(res.body.proposedOrder.map((p) => p.name)).toEqual(["A", "C", "B"]);
        expect(res.body.current).toMatchObject({ distance: 50, duration: 100 });
        expect(res.body.proposed).toMatchObject({ distance: 30, duration: 60 });
        expect(res.body.proposalId).toBe(PROPOSAL);
        expect(challengeRepository.updateById).not.toHaveBeenCalled();
    });

    it("answers 400 when too few places have coordinates", async () => {
        challengeRepository.findByTripDayId.mockResolvedValue([place(1, "A", "10.0"), { _id: c(2), nameLocation: "B" }, place(3, "C", "10.1")]);

        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: DAY });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("ROUTE_NOT_ENOUGH_COORDINATES");
        expect(res.body.missingCoordinates).toEqual([expect.objectContaining({ name: "B" })]);
    });

    it("answers 404 for a day of another trip", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ dayId: "64b0000000000000000000ff" });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe("ROUTE_DAY_NOT_FOUND");
    });
});

describe("POST /trip-plan/:id/route-optimization/apply (Accept)", () => {
    const stored = () => proposalRepository.findOwned.mockResolvedValue({
        dayId: DAY, baseOrder: [c(1), c(2), c(3)], order: [c(1), c(3), c(2)],
    });

    it("requires ownership", async () => {
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(STRANGER)).send({ proposalId: PROPOSAL });
        expect(res.status).toBe(404);
        expect(proposalRepository.findOwned).not.toHaveBeenCalled();
    });

    it("saves the stored order, not what the client sends", async () => {
        stored();
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL, order: [c(3), c(2), c(1)] });

        expect(res.status).toBe(200);
        expect(proposalRepository.findOwned).toHaveBeenCalledWith(PROPOSAL, TRIP_ID, OWNER);
        expect(challengeRepository.updateById.mock.calls).toEqual([[c(1), { order: 0 }], [c(3), { order: 1 }], [c(2), { order: 2 }]]);
    });

    it("answers 404 for a missing or expired proposal and saves nothing", async () => {
        proposalRepository.findOwned.mockResolvedValue(null);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL });
        expect(res.status).toBe(404);
        expect(challengeRepository.updateById).not.toHaveBeenCalled();
    });

    it("answers 409 when the day changed and saves nothing", async () => {
        stored();
        challengeRepository.findByTripDayId.mockResolvedValue([place(1, "A", "10.0")]);
        const res = await request(app).post(`${url}/apply`).set("Authorization", auth(OWNER)).send({ proposalId: PROPOSAL });
        expect(res.status).toBe(409);
        expect(challengeRepository.updateById).not.toHaveBeenCalled();
    });
});

describe("DELETE /trip-plan/:id/route-optimization/:proposalId (Reject)", () => {
    it("forgets the proposal and leaves the itinerary as it was", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL}`).set("Authorization", auth(OWNER));

        expect(res.status).toBe(200);
        expect(proposalRepository.remove).toHaveBeenCalledWith(PROPOSAL, TRIP_ID, OWNER);
        expect(challengeRepository.updateById).not.toHaveBeenCalled();
        expect(tripDayRepository.updateById).not.toHaveBeenCalled();
    });

    it("requires ownership", async () => {
        const res = await request(app).delete(`${url}/${PROPOSAL}`).set("Authorization", auth(STRANGER));
        expect(res.status).toBe(404);
        expect(proposalRepository.remove).not.toHaveBeenCalled();
    });
});
