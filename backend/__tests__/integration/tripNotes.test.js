// HTTP-level tests of trip notes (CRUD + authorization). The repositories are replaced by a
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
    default: { findOwnedById: vi.fn(), findPublicById: vi.fn(), findSharedByToken: vi.fn() },
}));
vi.mock("../../src/repositories/tripNoteRepository.js", () => ({
    default: { findByTrip: vi.fn(), countByTrip: vi.fn(), findOwned: vi.fn(), create: vi.fn(), updateContent: vi.fn(), remove: vi.fn() },
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
const { default: tripNoteRepository } = await import("../../src/repositories/tripNoteRepository.js");
const { default: tripDayRepository } = await import("../../src/repositories/tripDayRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const OWNER = "64b000000000000000000001";
const STRANGER = "64b000000000000000000002";
const TRIP_ID = "64b0000000000000000000a1";
const OTHER_TRIP = "64b0000000000000000000a2"; // a second trip of the owner
const NOTE_ID = "64b0000000000000000000b1";

const user = (id) => ({ _id: id, username: "u", isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });
const auth = (id) => `Bearer ${generateAccessToken({ _id: id })}`;
const base = (tripId = TRIP_ID) => `/trip-plan/${tripId}/notes`;

let trips;
let notes;
let seq;

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockImplementation(async (id) => user(id));

    seq = 0;
    trips = {
        [TRIP_ID]: { _id: TRIP_ID, userId: OWNER, status: "active", visibility: "public", nameTrip: "Da Lat" },
        [OTHER_TRIP]: { _id: OTHER_TRIP, userId: OWNER, status: "active", nameTrip: "Hue" },
    };
    notes = [{ _id: NOTE_ID, tripId: TRIP_ID, userId: OWNER, content: "Pack a coat", createdAt: new Date(1), updatedAt: new Date(1) }];

    tripPlanRepository.findOwnedById.mockImplementation(async (id, userId) => {
        const t = trips[id];
        return t && String(t.userId) === String(userId) && t.status !== "delete" ? { ...t } : null;
    });
    tripNoteRepository.findByTrip.mockImplementation(async (tripId, userId) =>
        notes.filter((n) => n.tripId === String(tripId) && n.userId === String(userId)).reverse());
    tripNoteRepository.countByTrip.mockImplementation(async (tripId, userId) =>
        notes.filter((n) => n.tripId === String(tripId) && n.userId === String(userId)).length);
    tripNoteRepository.findOwned.mockImplementation(async (id, tripId, userId) =>
        notes.find((n) => n._id === id && n.tripId === String(tripId) && n.userId === String(userId)) ?? null);
    tripNoteRepository.create.mockImplementation(async (data) => {
        const note = { _id: `64b0000000000000000001${String(++seq).padStart(2, "0")}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        notes.push(note);
        return note;
    });
    tripNoteRepository.updateContent.mockImplementation(async (id, content) => {
        const note = notes.find((n) => n._id === id);
        note.content = content;
        note.updatedAt = new Date();
        return note;
    });
    tripNoteRepository.remove.mockImplementation(async (id) => {
        notes = notes.filter((n) => n._id !== id);
    });
});

describe("trip notes: CRUD by the owner", () => {
    it("lists the notes of the trip", async () => {
        const res = await request(app).get(base()).set("Authorization", auth(OWNER)).expect(200);
        expect(res.body.notes).toHaveLength(1);
        expect(res.body.notes[0]).toMatchObject({ _id: NOTE_ID, tripId: TRIP_ID, content: "Pack a coat" });
        expect(JSON.stringify(res.body)).not.toContain(OWNER);
    });

    it("creates a note (trimmed), then it shows up in the list", async () => {
        const created = await request(app).post(base()).set("Authorization", auth(OWNER)).send({ content: "  Rent a scooter  " }).expect(201);
        expect(created.body.note).toMatchObject({ tripId: TRIP_ID, content: "Rent a scooter" });
        expect(tripNoteRepository.create).toHaveBeenCalledWith({ tripId: TRIP_ID, userId: OWNER, content: "Rent a scooter" });

        const list = await request(app).get(base()).set("Authorization", auth(OWNER)).expect(200);
        expect(list.body.notes.map((n) => n.content)).toEqual(["Rent a scooter", "Pack a coat"]);
    });

    it("edits a note and the new text is read back", async () => {
        const res = await request(app).put(`${base()}/${NOTE_ID}`).set("Authorization", auth(OWNER)).send({ content: "Pack two coats" }).expect(200);
        expect(res.body.note).toMatchObject({ _id: NOTE_ID, content: "Pack two coats" });

        const list = await request(app).get(base()).set("Authorization", auth(OWNER)).expect(200);
        expect(list.body.notes[0].content).toBe("Pack two coats");
    });

    it("deletes a note", async () => {
        await request(app).delete(`${base()}/${NOTE_ID}`).set("Authorization", auth(OWNER)).expect(200);
        const list = await request(app).get(base()).set("Authorization", auth(OWNER)).expect(200);
        expect(list.body.notes).toEqual([]);
    });

    it("a note belongs to its own trip only", async () => {
        const other = await request(app).get(base(OTHER_TRIP)).set("Authorization", auth(OWNER)).expect(200);
        expect(other.body.notes).toEqual([]);
        await request(app).put(`${base(OTHER_TRIP)}/${NOTE_ID}`).set("Authorization", auth(OWNER)).send({ content: "x" }).expect(404);
        await request(app).delete(`${base(OTHER_TRIP)}/${NOTE_ID}`).set("Authorization", auth(OWNER)).expect(404);
        expect(notes[0].content).toBe("Pack a coat");
    });
});

describe("trip notes: validation", () => {
    it.each([[undefined], [null], [""], ["   "], [42], [{ $ne: "x" }], [["a"]]])("rejects invalid content (%j)", async (content) => {
        await request(app).post(base()).set("Authorization", auth(OWNER)).send({ content }).expect(400);
        await request(app).put(`${base()}/${NOTE_ID}`).set("Authorization", auth(OWNER)).send({ content }).expect(400);
        expect(tripNoteRepository.create).not.toHaveBeenCalled();
        expect(notes[0].content).toBe("Pack a coat");
    });

    it("rejects a body without content and one that is too long", async () => {
        await request(app).post(base()).set("Authorization", auth(OWNER)).send({}).expect(400);
        await request(app).post(base()).set("Authorization", auth(OWNER)).send({ content: "a".repeat(2001) }).expect(400);
        await request(app).post(base()).set("Authorization", auth(OWNER)).send({ content: "a".repeat(2000) }).expect(201);
    });

    it("stops at the maximum number of notes per trip", async () => {
        tripNoteRepository.countByTrip.mockResolvedValue(50);
        await request(app).post(base()).set("Authorization", auth(OWNER)).send({ content: "one more" }).expect(400);
        expect(tripNoteRepository.create).not.toHaveBeenCalled();
    });
});

describe("trip notes: authorization", () => {
    it("without signing in every endpoint answers 401", async () => {
        await request(app).get(base()).expect(401);
        await request(app).post(base()).send({ content: "x" }).expect(401);
        await request(app).put(`${base()}/${NOTE_ID}`).send({ content: "x" }).expect(401);
        await request(app).delete(`${base()}/${NOTE_ID}`).expect(401);
    });

    it("another user cannot read, add, edit or delete the notes of the trip (404, nothing written)", async () => {
        await request(app).get(base()).set("Authorization", auth(STRANGER)).expect(404);
        await request(app).post(base()).set("Authorization", auth(STRANGER)).send({ content: "hi" }).expect(404);
        await request(app).put(`${base()}/${NOTE_ID}`).set("Authorization", auth(STRANGER)).send({ content: "hacked" }).expect(404);
        await request(app).delete(`${base()}/${NOTE_ID}`).set("Authorization", auth(STRANGER)).expect(404);

        expect(tripNoteRepository.create).not.toHaveBeenCalled();
        expect(tripNoteRepository.updateContent).not.toHaveBeenCalled();
        expect(tripNoteRepository.remove).not.toHaveBeenCalled();
        expect(notes).toHaveLength(1);
        expect(notes[0].content).toBe("Pack a coat");
    });

    it("a public trip does not open its notes to others", async () => {
        expect(trips[TRIP_ID].visibility).toBe("public");
        await request(app).get(base()).set("Authorization", auth(STRANGER)).expect(404);
    });

    it("a user cannot touch a note through a trip of their own (the note must match the trip and the user)", async () => {
        trips[OTHER_TRIP].userId = STRANGER;
        await request(app).put(`${base(OTHER_TRIP)}/${NOTE_ID}`).set("Authorization", auth(STRANGER)).send({ content: "x" }).expect(404);
        await request(app).delete(`${base(OTHER_TRIP)}/${NOTE_ID}`).set("Authorization", auth(STRANGER)).expect(404);
        expect(notes).toHaveLength(1);
    });

    it("malformed ids never reach the database", async () => {
        await request(app).get(base("not-an-id")).set("Authorization", auth(OWNER)).expect(404);
        await request(app).put(`${base()}/not-an-id`).set("Authorization", auth(OWNER)).send({ content: "x" }).expect(404);
        await request(app).delete(`${base()}/%7B%22%24ne%22%3A1%7D`).set("Authorization", auth(OWNER)).expect(404);
        expect(tripNoteRepository.findOwned).not.toHaveBeenCalled();
    });

    it("a deleted trip no longer gives access to its notes", async () => {
        trips[TRIP_ID].status = "delete";
        await request(app).get(base()).set("Authorization", auth(OWNER)).expect(404);
    });

    it("notes never leak into the public view of a public trip", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue({ ...trips[TRIP_ID], toObject: () => ({ ...trips[TRIP_ID] }) });
        tripDayRepository.findByTripId.mockResolvedValue([]);
        const res = await request(app).get(`/public-trip/${TRIP_ID}`).expect(200);
        expect(JSON.stringify(res.body)).not.toContain("Pack a coat");
        expect(tripNoteRepository.findByTrip).not.toHaveBeenCalled();
    });
});
