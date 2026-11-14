import { beforeEach, describe, expect, it, vi } from "vitest";
import adminService from "../../../src/services/adminService.js";
import adminRepository from "../../../src/repositories/adminRepository.js";
import contentRepository from "../../../src/repositories/contentRepository.js";
import userRepository from "../../../src/repositories/userRepository.js";
import activityLogService from "../../../src/services/activityLogService.js";
import { doc } from "../../helpers/http.js";

vi.mock("../../../src/repositories/adminRepository.js", () => ({
    default: {
        listUsers: vi.fn(),
        findUserById: vi.fn(),
        tripStatsByUser: vi.fn(),
        challengeStatsByUser: vi.fn(),
        listUserTrips: vi.fn(),
        listUserProgress: vi.fn(),
        findChallengesByIds: vi.fn(),
        challengesPerTrip: vi.fn(),
        countUserChats: vi.fn(),
        findTripById: vi.fn(),
        deleteChallenge: vi.fn(),
        countUsersByRole: vi.fn(),
        listTripDays: vi.fn(),
        findUsersByIds: vi.fn(),
    },
}));
vi.mock("../../../src/repositories/contentRepository.js", () => ({ default: { listLogsByActor: vi.fn() } }));
vi.mock("../../../src/repositories/userRepository.js", () => ({
    default: { findById: vi.fn(), findByEmail: vi.fn(), findByUsername: vi.fn(), create: vi.fn(), updateById: vi.fn() },
}));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: {} }));
vi.mock("../../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const ADMIN = { _id: "64b000000000000000000001", username: "boss", role: "admin" };
const ID = "64b000000000000000000002";
const OTHER = "64b000000000000000000003";

const account = (extra = {}) => ({
    _id: ID,
    username: "traveler",
    fullname: "Traveler",
    email: "traveler@example.com",
    role: "user",
    isActive: "active",
    createdAt: new Date("2026-01-01"),
    ...extra,
});

beforeEach(() => {
    vi.resetAllMocks();
    adminRepository.tripStatsByUser.mockResolvedValue([]);
    adminRepository.challengeStatsByUser.mockResolvedValue([]);
});

describe("listUsers", () => {
    it("adds the trip and challenge counters of each account", async () => {
        adminRepository.listUsers.mockResolvedValue([account(), account({ _id: OTHER, username: "idle" })]);
        adminRepository.tripStatsByUser.mockResolvedValue([{ _id: ID, trips: 4, completed: 3 }]);
        adminRepository.challengeStatsByUser.mockResolvedValue([{ _id: ID, joined: 2, completed: 1 }]);

        const [first, second] = await adminService.listUsers();

        expect(first).toMatchObject({ id: ID, totalTrips: 4, completedTrips: 3, challengesJoined: 2, challengesCompleted: 1, lastActiveAt: null });
        expect(second).toMatchObject({ totalTrips: 0, challengesJoined: 0 });
    });
});

describe("getUser", () => {
    it("rejects an unknown id", async () => {
        await expect(adminService.getUser("nope")).rejects.toMatchObject({ status: 404 });
        adminRepository.findUserById.mockResolvedValue(null);
        await expect(adminService.getUser(ID)).rejects.toMatchObject({ status: 404 });
    });

    it("returns the account with trips, challenges, chats and activity", async () => {
        adminRepository.findUserById.mockResolvedValue(account());
        adminRepository.listUserTrips.mockResolvedValue([{ _id: OTHER, nameTrip: "Đà Lạt", userId: ID }]);
        adminRepository.listUserProgress.mockResolvedValue([{ _id: OTHER, chaId: ID, completed: true, endAt: new Date("2026-02-01") }]);
        adminRepository.findChallengesByIds.mockResolvedValue([{ _id: ID, nameLocation: "Hồ Xuân Hương", points: 50 }]);
        adminRepository.challengesPerTrip.mockResolvedValue(new Map([[OTHER, 2]]));
        adminRepository.countUserChats.mockResolvedValue(7);
        contentRepository.listLogsByActor.mockResolvedValue([{ _id: OTHER, action: "login", createdAt: new Date() }]);

        const result = await adminService.getUser(ID);

        expect(result.user.id).toBe(ID);
        expect(result.aiConversations).toBe(7);
        expect(result.trips[0]).toMatchObject({ nameTrip: "Đà Lạt", challenges: 2, owner: "Traveler" });
        expect(result.challenges[0]).toMatchObject({ name: "Hồ Xuân Hương", points: 50, completed: true });
        expect(result.activity[0]).toMatchObject({ action: "login" });
    });
});

describe("updateUser", () => {
    beforeEach(() => {
        userRepository.findById.mockResolvedValue(account());
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.updateById.mockImplementation(async (id, update) => doc({ ...account(), ...update }));
    });

    it("never lets an admin change their own account", async () => {
        await expect(adminService.updateUser(ADMIN, ADMIN._id, { role: "user" })).rejects.toMatchObject({ status: 400 });
    });

    it.each([
        [{}, 400],
        [{ fullname: "  " }, 400],
        [{ email: "not-an-email" }, 400],
        [{ phone: "abc" }, 400],
        [{ role: "owner" }, 400],
        [{ status: "banned" }, 400],
        [{ status: "suspended" }, 400],
        [{ status: "suspended", suspendReason: "ab" }, 400],
        [{ status: "active" }, 409],
    ])("rejects %j", async (body, status) => {
        await expect(adminService.updateUser(ADMIN, ID, body)).rejects.toMatchObject({ status });
    });

    it("rejects an email used by another account", async () => {
        userRepository.findByEmail.mockResolvedValue(account({ _id: OTHER }));
        await expect(adminService.updateUser(ADMIN, ID, { email: "taken@example.com" })).rejects.toMatchObject({ status: 409 });
    });

    it("saves the profile and logs it", async () => {
        const saved = await adminService.updateUser(ADMIN, ID, { fullname: " New Name ", email: "NEW@example.com", phone: "0901 234 567" });

        expect(userRepository.updateById).toHaveBeenCalledWith(ID, expect.objectContaining({ fullname: "New Name", email: "new@example.com", phone: "0901 234 567" }));
        expect(saved).toMatchObject({ fullname: "New Name", email: "new@example.com" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "updateUser" }));
    });

    it("suspends with a reason and ends the sessions", async () => {
        await adminService.updateUser(ADMIN, ID, { status: "suspended", suspendReason: "Spam" });

        expect(userRepository.updateById).toHaveBeenCalledWith(
            ID,
            expect.objectContaining({ isActive: "suspended", suspendReason: "Spam", refreshToken: "" }),
        );
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "suspendUser" }));
    });

    it("reactivates a suspended account and clears the reason", async () => {
        userRepository.findById.mockResolvedValue(account({ isActive: "suspended", suspendReason: "Spam" }));

        await adminService.updateUser(ADMIN, ID, { status: "active" });

        expect(userRepository.updateById).toHaveBeenCalledWith(ID, expect.objectContaining({ isActive: "active", suspendReason: "" }));
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "restoreUser" }));
    });

    it("does not suspend or delete another admin", async () => {
        userRepository.findById.mockResolvedValue(account({ role: "admin" }));
        await expect(adminService.updateUser(ADMIN, ID, { status: "delete" })).rejects.toMatchObject({ status: 409 });
    });

    it("changes the role", async () => {
        await adminService.updateUser(ADMIN, ID, { role: "admin" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "changeRole" }));
    });
});

describe("bulkUpdateUsers", () => {
    it("validates the request", async () => {
        await expect(adminService.bulkUpdateUsers(ADMIN, { ids: [], status: "active" })).rejects.toMatchObject({ status: 400 });
        await expect(adminService.bulkUpdateUsers(ADMIN, { ids: [ID], status: "x" })).rejects.toMatchObject({ status: 400 });
        await expect(adminService.bulkUpdateUsers(ADMIN, { ids: [ID], status: "suspended" })).rejects.toMatchObject({ status: 400 });
    });

    it("updates what can change and skips the rest", async () => {
        userRepository.findById.mockImplementation(async (id) =>
            id === ID ? account() : id === OTHER ? account({ _id: OTHER, role: "admin" }) : null,
        );
        userRepository.updateById.mockResolvedValue(doc(account()));

        const result = await adminService.bulkUpdateUsers(ADMIN, {
            ids: [ID, OTHER, ADMIN._id, "bad-id"],
            status: "suspended",
            suspendReason: "Spam",
        });

        expect(result).toEqual({ updated: [ID], skipped: [OTHER, ADMIN._id, "bad-id"] });
        expect(userRepository.updateById).toHaveBeenCalledTimes(1);
    });
});

describe("updateUser image", () => {
    it("accepts an http(s) URL only", async () => {
        userRepository.findById.mockResolvedValue(account());
        userRepository.updateById.mockImplementation(async (id, update) => doc({ ...account(), ...update }));

        await expect(adminService.updateUser(ADMIN, ID, { image: "javascript:alert(1)" })).rejects.toMatchObject({ status: 400 });
        const saved = await adminService.updateUser(ADMIN, ID, { image: "https://cdn.example.com/a.jpg" });
        expect(saved.image).toBe("https://cdn.example.com/a.jpg");
    });
});

describe("createUser", () => {
    const body = { fullname: "New Person", username: "NewPerson", email: "New@Example.com", password: "password1" };
    beforeEach(() => {
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByUsername.mockResolvedValue(null);
        userRepository.create.mockImplementation(async (data) => doc({ _id: OTHER, ...data }));
    });

    it.each([
        [{ fullname: "" }],
        [{ username: "a b" }],
        [{ email: "nope" }],
        [{ phone: "abc" }],
        [{ role: "root" }],
        [{ password: "short" }],
    ])("rejects %j", async (change) => {
        await expect(adminService.createUser(ADMIN, { ...body, ...change })).rejects.toMatchObject({ status: 400 });
        expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("rejects a username or email already in use", async () => {
        userRepository.findByEmail.mockResolvedValue(account());
        await expect(adminService.createUser(ADMIN, body)).rejects.toMatchObject({ status: 409, body: { field: "email" } });
        userRepository.findByEmail.mockResolvedValue(null);
        userRepository.findByUsername.mockResolvedValue(account());
        await expect(adminService.createUser(ADMIN, body)).rejects.toMatchObject({ status: 409, body: { field: "username" } });
    });

    it("creates an active account with a hashed password", async () => {
        const created = await adminService.createUser(ADMIN, body);

        const data = userRepository.create.mock.calls[0][0];
        expect(data).toMatchObject({ username: "newperson", email: "new@example.com", isActive: "active", role: "user" });
        expect(data.password).not.toBe("password1");
        expect(created).toMatchObject({ username: "newperson", status: "active" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "createUser" }));
    });
});

describe("getTrip", () => {
    it("returns the trip with its days, creation date and phase", async () => {
        const start = new Date(Date.now() - 5 * 86_400_000);
        const end = new Date(Date.now() - 3 * 86_400_000);
        adminRepository.findTripById.mockResolvedValue({ _id: { toString: () => OTHER, getTimestamp: () => new Date("2026-01-01") }, userId: ID, nameTrip: "Đà Lạt", startDate: start, endDate: end });
        adminRepository.findUsersByIds.mockResolvedValue([{ _id: ID, fullname: "Traveler" }]);
        adminRepository.challengesPerTrip.mockResolvedValue(new Map());
        adminRepository.listTripDays.mockResolvedValue([{ _id: OTHER, day: 1, title: "Ngày 1", transportCost: 10, foodCost: 20 }]);

        const trip = await adminService.getTrip(OTHER);

        expect(trip).toMatchObject({ nameTrip: "Đà Lạt", owner: "Traveler", phase: "completed", ownerId: ID, createdAt: "2026-01-01T00:00:00.000Z" });
        expect(trip.plan).toEqual([expect.objectContaining({ day: 1, cost: 30 })]);
    });

    it("rejects an unknown trip", async () => {
        await expect(adminService.getTrip("bad")).rejects.toMatchObject({ status: 404 });
        adminRepository.findTripById.mockResolvedValue(null);
        await expect(adminService.getTrip(OTHER)).rejects.toMatchObject({ status: 404 });
    });
});

describe("deleteChallenge", () => {
    it("removes the challenge and logs it", async () => {
        adminRepository.deleteChallenge.mockResolvedValue({ _id: OTHER, nameLocation: "Hồ Gươm" });

        await expect(adminService.deleteChallenge(ADMIN, OTHER)).resolves.toEqual({ message: "Delete challenge successfully" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "updateChallenge", level: "warning" }));
    });

    it("rejects an unknown challenge", async () => {
        await expect(adminService.deleteChallenge(ADMIN, "bad")).rejects.toMatchObject({ status: 404 });
        adminRepository.deleteChallenge.mockResolvedValue(null);
        await expect(adminService.deleteChallenge(ADMIN, OTHER)).rejects.toMatchObject({ status: 404 });
    });
});

describe("roles", () => {
    it("counts the members of each role and lists the permissions", async () => {
        adminRepository.countUsersByRole.mockResolvedValue([{ _id: "admin", members: 2 }, { _id: null, members: 5 }]);

        const result = await adminService.roles();

        expect(result.members).toEqual({ user: 5, admin: 2 });
        expect(result.permissions.find((row) => row.permission === "moderate").roles).toEqual(["admin"]);
    });
});
