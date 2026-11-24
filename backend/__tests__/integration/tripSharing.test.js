// HTTP-level tests of trip sharing: create the link, open it without signing in,
// revoke it. The repositories are replaced by a small in-memory store, so the
// real routes, auth, ownership middleware and service run.
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
    default: { findOwnedById: vi.fn(), findSharedByToken: vi.fn(), enableShare: vi.fn(), disableShare: vi.fn() },
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

// in-memory trip, behaving like the repository functions
let trip;
const wireStore = () => {
    trip = { _id: TRIP_ID, userId: OWNER, nameTrip: "Da Lat", location: "Da Lat", status: "active", shareEnabled: false };
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && String(userId) === OWNER && trip.status !== "delete" ? { ...trip } : null);
    tripPlanRepository.enableShare.mockImplementation(async (id, shareToken) => {
        trip = { ...trip, shareEnabled: true, shareToken, sharePermission: "view", sharedAt: new Date() };
        return { ...trip };
    });
    tripPlanRepository.disableShare.mockImplementation(async () => {
        const { shareToken, sharedAt, ...rest } = trip;
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
        {
            _id: "c1", tripDayId: "d1", challengeSummary: "Cafe", nameLocation: "Cafe A", location: "Da Lat",
            latitude: "1", longitude: "2", points: 50, imageUrl: "/files/private-photo",
        },
    ]);
    wireStore();
});

const share = (id = OWNER) => request(app).post(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(id));

describe("trip sharing", () => {
    it("the owner creates a link; asking again returns the same link", async () => {
        const first = await share().expect(200);
        expect(first.body).toMatchObject({ isShared: true, permission: "view" });
        expect(first.body.shareToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

        const second = await share().expect(200);
        expect(second.body.shareToken).toBe(first.body.shareToken);
        expect(tripPlanRepository.enableShare).toHaveBeenCalledTimes(1);

        const status = await request(app).get(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(OWNER)).expect(200);
        expect(status.body).toMatchObject({ isShared: true, shareToken: first.body.shareToken });
    });

    it("reports not shared before the first share", async () => {
        const res = await request(app).get(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(OWNER)).expect(200);
        expect(res.body).toMatchObject({ isShared: false, shareToken: null, permission: null });
    });

    it("anyone with the link reads the trip without signing in, and sees nothing private", async () => {
        const { body } = await share().expect(200);

        const res = await request(app).get(`/shared/${body.shareToken}`).expect(200);

        expect(res.headers["cache-control"]).toBe("no-store");
        expect(res.body.permission).toBe("view");
        expect(res.body.tripDatas.nameTrip).toBe("Da Lat");
        expect(res.body.tripDatas.dataTripDays[0].challenges[0]).toEqual({
            _id: "c1", challengeSummary: "Cafe", nameLocation: "Cafe A", location: "Da Lat", latitude: "1", longitude: "2", points: 50,
        });
        const text = JSON.stringify(res.body);
        expect(text).not.toContain(OWNER); // owner id
        expect(text).not.toContain("private-photo"); // check-in photo
        expect(text).not.toContain("shareToken");
        expect(text).not.toContain("completed");
    });

    it("a revoked link stops working, and sharing again makes a different link", async () => {
        const { body } = await share().expect(200);
        await request(app).get(`/shared/${body.shareToken}`).expect(200);

        const off = await request(app).delete(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(OWNER)).expect(200);
        expect(off.body).toMatchObject({ isShared: false, shareToken: null });

        await request(app).get(`/shared/${body.shareToken}`).expect(404);

        const again = await share().expect(200);
        expect(again.body.shareToken).not.toBe(body.shareToken);
        await request(app).get(`/shared/${body.shareToken}`).expect(404);
        await request(app).get(`/shared/${again.body.shareToken}`).expect(200);
    });

    it("unknown, malformed and deleted-trip links all get the same 404", async () => {
        const { body } = await share().expect(200);
        const unknown = "A".repeat(43);
        const a = await request(app).get(`/shared/${unknown}`).expect(404);
        const b = await request(app).get("/shared/not-a-token").expect(404);
        trip.status = "delete";
        const c = await request(app).get(`/shared/${body.shareToken}`).expect(404);

        expect(b.body).toEqual(a.body);
        expect(c.body).toEqual(a.body);
        expect(tripPlanRepository.findSharedByToken).toHaveBeenCalledTimes(2); // malformed one never reaches the database
    });

    it("only the owner manages sharing: strangers get 404, no token gets 401", async () => {
        await share(STRANGER).expect(404);
        await request(app).get(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).delete(`/trip-plan/${TRIP_ID}/share`).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).post(`/trip-plan/${TRIP_ID}/share`).expect(401);
        await request(app).delete(`/trip-plan/${TRIP_ID}/share`).expect(401);
        expect(tripPlanRepository.enableShare).not.toHaveBeenCalled();
        expect(tripPlanRepository.disableShare).not.toHaveBeenCalled();
    });

    it("a link gives read access only: every write verb on it is refused", async () => {
        const { body } = await share().expect(200);
        for (const method of ["post", "put", "patch", "delete"]) {
            await request(app)[method](`/shared/${body.shareToken}`).expect(404);
        }
        // and the link is not a credential for the owner's routes
        await request(app).delete(`/trip-plan/${TRIP_ID}`).set("Authorization", `Bearer ${body.shareToken}`).expect(401);
        expect(trip.status).toBe("active");
    });
});
