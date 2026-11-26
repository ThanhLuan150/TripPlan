// HTTP-level tests of adding a place to a day of an existing trip: authorization, valid request, errors.
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
vi.mock("../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn(), create: vi.fn() } }));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({ default: { create: vi.fn() } }));
vi.mock("../../src/repositories/tripNoteRepository.js", () => ({ default: {} }));
vi.mock("../../src/repositories/chatRepository.js", () => ({ default: {} }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { default: challengeRepository } = await import("../../src/repositories/challengeRepository.js");
const { default: challengeProgressRepository } = await import("../../src/repositories/challengeProgressRepository.js");
const { getLocationFromNameLocation } = await import("../../src/utils/geocode.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const DAY_ID = "64b0000000000000000000d1";
const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const url = `/trip-plan/${TRIP_ID}/places`;
const place = { name: "Thác Datanla", dayId: DAY_ID, province: "Lâm Đồng", summary: "Thác nước" };

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));
    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) =>
        id === TRIP_ID && userId === OWNER ? { _id: TRIP_ID, userId: OWNER, nameTrip: "Đà Lạt" } : null);
    tripDayRepository.findByTripId.mockResolvedValue([{ _id: DAY_ID, title: "Ngày 1" }]);
    challengeRepository.findByTripDayId.mockResolvedValue([{ nameLocation: "Hồ Xuân Hương" }]);
    challengeRepository.create.mockResolvedValue({ _id: "c9" });
    getLocationFromNameLocation.mockResolvedValue({ location: "Thác Datanla", latitude: 1, longitude: 2 });
});

describe("POST /trip-plan/:id/places", () => {
    it("requires sign-in and ownership", async () => {
        expect((await request(app).post(url).send(place)).status).toBe(401);
        expect((await request(app).post(url).set("Authorization", auth(STRANGER)).send(place)).status).toBe(404);
        expect(challengeRepository.create).not.toHaveBeenCalled();
    });

    it("adds the place to the day with its own progress", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send(place);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ challengeId: "c9", located: true, day: { title: "Ngày 1" } });
        expect(challengeRepository.create).toHaveBeenCalledWith(expect.objectContaining({ tripDayId: DAY_ID, nameLocation: "Thác Datanla" }));
        expect(challengeProgressRepository.create).toHaveBeenCalledWith(OWNER, "c9");
    });

    it.each([[{}], [{ name: "x" }], [{ name: "x", dayId: "nope" }]])("answers 400 for %j", async (body) => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send(body);
        expect(res.status).toBe(400);
        expect(challengeRepository.create).not.toHaveBeenCalled();
    });

    it("answers 404 for a day that is not in the trip", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ ...place, dayId: "64b0000000000000000000ff" });
        expect(res.status).toBe(404);
    });

    it("answers 409 for a place the trip already has", async () => {
        const res = await request(app).post(url).set("Authorization", auth(OWNER)).send({ ...place, name: "Hồ Xuân Hương" });
        expect(res.status).toBe(409);
        expect(res.body.code).toBe("PLACE_ALREADY_IN_TRIP");
        expect(challengeRepository.create).not.toHaveBeenCalled();
    });
});
