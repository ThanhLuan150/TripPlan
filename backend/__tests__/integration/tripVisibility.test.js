// HTTP-level tests of trip visibility (public / private). The repositories are replaced by a
// small in-memory store, so the real routes, auth, ownership middleware and services run.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({
    default: { findById: vi.fn(), updateById: vi.fn() },
}));
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({
    default: {
        findOwnedById: vi.fn(), findPublicById: vi.fn(), setVisibility: vi.fn(),
        findSharedByToken: vi.fn(), enableShare: vi.fn(), disableShare: vi.fn(), findActiveByUser: vi.fn(),
    },
}));
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;

let trip;
const wireStore = (initial = {}) => {
    trip = { _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Da Lat", status: "active", ...initial };
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && String(userId) === OWNER && trip.status !== "delete" ? { ...trip } : null);
    tripPlanRepository.findPublicById.mockImplementation(async (id) =>
        id === TRIP_ID && trip.visibility === "public" && trip.status !== "delete" ? { ...trip } : null);
    tripPlanRepository.setVisibility.mockImplementation(async (id, visibility) => {
        trip = { ...trip, visibility };
        return { ...trip };
    });
    tripPlanRepository.enableShare.mockImplementation(async (id, shareToken) => {
        trip = { ...trip, shareEnabled: true, shareToken, sharePermission: "view" };
        return { ...trip };
    });
    tripPlanRepository.disableShare.mockImplementation(async () => {
        const { shareToken, ...rest } = trip;
        trip = { ...rest, shareEnabled: false };
        return { ...trip };
    });
    tripPlanRepository.findSharedByToken.mockImplementation(async (token) =>
        trip.shareEnabled && trip.shareToken === token && trip.status !== "delete" ? { ...trip } : null);
};

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripDayRepository.findByTripId.mockResolvedValue([
        { _id: "d1", tripId: TRIP_ID, title: "Day 1", day: 0, dayOfWeek: "Mon", date: "2026-01-01", transportCost: 1, foodCost: 2, otherCost: 3 },
    ]);
    challengeRepository.findByTripDayId.mockResolvedValue([
        { _id: "c1", tripDayId: "d1", challengeSummary: "Cafe", nameLocation: "Cafe A", location: "Da Lat", latitude: "1", longitude: "2", points: 50, imageUrl: "/files/private-photo" },
    ]);
    wireStore();
});

const setVisibility = (visibility, id = OWNER) =>
    request(app).put(`/trip-plan/${TRIP_ID}/visibility`).set("Authorization", auth(id)).send({ visibility });
const getPublic = (id = TRIP_ID) => request(app).get(`/public-trip/${id}`);

describe("trip visibility: owner control", () => {
    it("a trip without a visibility value (old trip) is private", async () => {
        const res = await request(app).get(`/trip-plan/${TRIP_ID}/visibility`).set("Authorization", auth(OWNER)).expect(200);
        expect(res.body).toMatchObject({ tripId: TRIP_ID, visibility: "private" });
    });

    it("the owner switches public <-> private and the status follows", async () => {
        expect((await setVisibility("public").expect(200)).body).toMatchObject({ visibility: "public" });
        const status = await request(app).get(`/trip-plan/${TRIP_ID}/visibility`).set("Authorization", auth(OWNER)).expect(200);
        expect(status.body.visibility).toBe("public");

        expect((await setVisibility("private").expect(200)).body).toMatchObject({ visibility: "private" });
        expect(trip.visibility).toBe("private");
    });

    it("setting the same value again changes nothing", async () => {
        wireStore({ visibility: "public" });
        await setVisibility("public").expect(200);
        expect(tripPlanRepository.setVisibility).not.toHaveBeenCalled();
    });

    it.each([["secret"], [""], [null], [{ $ne: "x" }], [1]])("rejects an invalid value (%j)", async (value) => {
        await setVisibility(value).expect(400);
        expect(tripPlanRepository.setVisibility).not.toHaveBeenCalled();
    });

    it("someone who is not the owner cannot read or change the visibility (404, nothing written)", async () => {
        await setVisibility("public", STRANGER).expect(404);
        await request(app).get(`/trip-plan/${TRIP_ID}/visibility`).set("Authorization", auth(STRANGER)).expect(404);
        expect(tripPlanRepository.setVisibility).not.toHaveBeenCalled();
        expect(trip.visibility).toBeUndefined();
    });

    it("without signing in the owner endpoints answer 401", async () => {
        await request(app).put(`/trip-plan/${TRIP_ID}/visibility`).send({ visibility: "public" }).expect(401);
        await request(app).get(`/trip-plan/${TRIP_ID}/visibility`).expect(401);
    });

    it("a deleted trip cannot be changed", async () => {
        wireStore({ status: "delete" });
        await setVisibility("public").expect(404);
    });
});

describe("trip visibility: private mode", () => {
    it("is not readable through the public endpoint, with the same answer as a trip that does not exist", async () => {
        const priv = await getPublic().expect(404);
        const missing = await getPublic("64b0000000000000000000ff").expect(404);
        expect(priv.body).toEqual(missing.body);
    });

    it("stays readable by its owner and closed to others on the signed-in trip endpoints", async () => {
        tripPlanRepository.findActiveByUser.mockResolvedValue([]);
        for (const path of [`/trip-plan/get-trip/${TRIP_ID}`, `/trip-plan/${TRIP_ID}/export-pdf`, `/trip-plan/location/${TRIP_ID}`]) {
            await request(app).get(path).set("Authorization", auth(STRANGER)).expect(404);
            await request(app).get(path).expect(401);
        }
    });

    it("a malformed id never reaches the database", async () => {
        await getPublic("not-an-id").expect(404);
        await getPublic("%7B%22%24ne%22%3A1%7D").expect(404);
        expect(tripPlanRepository.findPublicById).not.toHaveBeenCalled();
    });
});

describe("trip visibility: public mode", () => {
    beforeEach(() => wireStore({ visibility: "public" }));

    it("anyone can read the plan without signing in, with no owner data, progress or photos", async () => {
        const res = await getPublic().expect(200);
        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.body.tripDatas).toMatchObject({ nameTrip: "Da Lat", location: "Da Lat" });
        expect(res.body.tripDatas.dataTripDays[0].challenges[0]).toMatchObject({ nameLocation: "Cafe A", points: 50 });
        const text = JSON.stringify(res.body);
        expect(text).not.toContain(OWNER);
        expect(text).not.toContain("private-photo");
        expect(text).not.toContain("shareToken");
    });

    it("being public gives a stranger no access to the owner-only endpoints", async () => {
        await request(app).get(`/trip-plan/get-trip/${TRIP_ID}`).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).delete(`/trip-plan/${TRIP_ID}`).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).post(`/trip-plan/${TRIP_ID}/duplicate`).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).put(`/trip-plan/${TRIP_ID}/visibility`).set("Authorization", auth(STRANGER)).send({ visibility: "private" }).expect(404);
        expect(trip.visibility).toBe("public");
    });

    it("there is no write route on the public endpoint", async () => {
        for (const method of ["post", "put", "patch", "delete"]) {
            const res = await request(app)[method](`/public-trip/${TRIP_ID}`).send({ nameTrip: "x" });
            expect([401, 404]).toContain(res.status);
        }
        expect(trip.nameTrip).toBe("Da Lat");
    });

    it("a deleted public trip is gone", async () => {
        wireStore({ visibility: "public", status: "delete" });
        await getPublic().expect(404);
    });
});

describe("trip visibility: changing the state", () => {
    it("public -> private: the public endpoint closes at once", async () => {
        await setVisibility("public").expect(200);
        await getPublic().expect(200);
        await setVisibility("private").expect(200);
        await getPublic().expect(404);
    });

    it("going private also revokes an active share link", async () => {
        await setVisibility("public").expect(200);
        const shared = await request(app).post(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(OWNER)).expect(200);
        await request(app).get(`/shared/${shared.body.shareToken}`).expect(200);

        await setVisibility("private").expect(200);

        await request(app).get(`/shared/${shared.body.shareToken}`).expect(404);
        await getPublic().expect(404);
    });

    it("going public keeps share links as they are", async () => {
        const shared = await request(app).post(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(OWNER)).expect(200);
        await setVisibility("public").expect(200);
        await request(app).get(`/shared/${shared.body.shareToken}`).expect(200);
    });
});
