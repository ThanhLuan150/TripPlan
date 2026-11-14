// Dashboard, trips, challenges, AI overview, reports, activity log and
// moderation of the admin panel. (Users: adminUsers.test.js.)
import { beforeEach, describe, expect, it, vi } from "vitest";
import adminService from "../../../src/services/adminService.js";
import adminRepository from "../../../src/repositories/adminRepository.js";
import contentRepository from "../../../src/repositories/contentRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import activityLogService from "../../../src/services/activityLogService.js";

vi.mock("../../../src/repositories/adminRepository.js", () => ({
    default: Object.fromEntries(
        [
            "countUsers", "countUsersBetween", "countTrips", "countTripsBetween", "countCompleted", "countCompletedBetween",
            "countChats", "countChatsBetween", "signupsByMonth", "topDestinations", "listTrips", "findUsersByIds",
            "challengesPerTrip", "listChallenges", "provinceOfChallenges", "progressOfChallenges", "updateChallenge",
            "countMessages", "distinctChatUsers", "messagesPerDay", "listChats", "messagesPerChat", "progressInPeriod",
            "averageTripCost", "tripsPerDay", "provincesInPeriod",
        ].map((name) => [name, vi.fn()]),
    ),
}));
vi.mock("../../../src/repositories/contentRepository.js", () => ({
    default: { countPendingReports: vi.fn(), listLogs: vi.fn(), listReports: vi.fn(), decideReport: vi.fn() },
}));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { softDelete: vi.fn() } }));
vi.mock("../../../src/repositories/userRepository.js", () => ({ default: {} }));
vi.mock("../../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const admin = { _id: "a1", fullname: "Admin" };
const ID = "64b000000000000000000001";
const DAY = 86_400_000;

beforeEach(() => vi.resetAllMocks());

describe("dashboard", () => {
    it("shows the totals with their growth against the previous 30 days, 12 months of sign-ups and the top places", async () => {
        const now = new Date();
        adminRepository.countUsers.mockResolvedValue(100);
        adminRepository.countUsersBetween.mockResolvedValueOnce(30).mockResolvedValueOnce(20);
        adminRepository.countTrips.mockResolvedValue(50);
        adminRepository.countTripsBetween.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
        adminRepository.countCompleted.mockResolvedValue(8);
        adminRepository.countCompletedBetween.mockResolvedValue(2);
        adminRepository.countChats.mockResolvedValue(9);
        adminRepository.countChatsBetween.mockResolvedValue(1);
        adminRepository.signupsByMonth.mockResolvedValue([{ _id: { y: now.getFullYear(), m: now.getMonth() + 1 }, value: 7 }]);
        adminRepository.topDestinations.mockResolvedValue([{ _id: "Huế", trips: 4 }, { _id: null, trips: 1 }]);

        const result = await adminService.dashboard();

        expect(result.stats.users).toEqual({ value: 100, delta: 0.5 });
        // no trips in the previous period: no growth to speak of
        expect(result.stats.trips).toEqual({ value: 50, delta: 0 });
        expect(result.stats.challengesCompleted.value).toBe(8);
        expect(result.newUsers).toHaveLength(12);
        expect(result.newUsers[11].value).toBe(7);
        expect(result.newUsers[0].value).toBe(0);
        expect(result.topDestinations).toEqual([{ name: "Huế", trips: 4 }, { name: "", trips: 1 }]);
    });
});

describe("alerts", () => {
    it("reports only what has something to report", async () => {
        adminRepository.countUsersBetween.mockResolvedValue(3);
        contentRepository.countPendingReports.mockResolvedValue(0);

        await expect(adminService.alerts()).resolves.toEqual([expect.objectContaining({ id: "newUsers", count: 3 })]);

        adminRepository.countUsersBetween.mockResolvedValue(0);
        contentRepository.countPendingReports.mockResolvedValue(2);
        await expect(adminService.alerts()).resolves.toEqual([expect.objectContaining({ id: "pendingModeration", count: 2 })]);
    });
});

describe("trips", () => {
    it("lists the trips with owner, days, cost, challenges and phase", async () => {
        const start = new Date(Date.now() + 3 * DAY);
        adminRepository.listTrips.mockResolvedValue([
            { _id: { toString: () => ID, getTimestamp: () => new Date("2026-01-01") }, userId: "u1", nameTrip: "Đà Lạt", location: "Lâm Đồng", startDate: start, endDate: new Date(start.getTime() + 2 * DAY) },
            { _id: "t2", userId: "ghost", startDate: new Date(Date.now() - DAY), endDate: new Date(Date.now() + DAY) },
            { _id: "t3" },
        ]);
        adminRepository.findUsersByIds.mockResolvedValue([{ _id: "u1", fullname: "An" }]);
        adminRepository.challengesPerTrip.mockResolvedValue(new Map([[ID, 4]]));

        const [first, second, third] = await adminService.listTrips();

        expect(first).toMatchObject({ nameTrip: "Đà Lạt", owner: "An", days: 3, phase: "upcoming", challenges: 4, status: "active", createdAt: "2026-01-01T00:00:00.000Z" });
        expect(second).toMatchObject({ owner: "", phase: "ongoing", challenges: 0, createdAt: null });
        expect(third).toMatchObject({ days: 0, phase: "upcoming", transportCostTotal: 0 });
    });

    it("marks a trip whose last day passed as completed", async () => {
        adminRepository.listTrips.mockResolvedValue([{ _id: "t1", startDate: new Date(Date.now() - 5 * DAY), endDate: new Date(Date.now() - 3 * DAY) }]);
        adminRepository.findUsersByIds.mockResolvedValue([]);
        adminRepository.challengesPerTrip.mockResolvedValue(new Map());

        await expect(adminService.listTrips()).resolves.toEqual([expect.objectContaining({ phase: "completed" })]);
    });

    it("soft deletes a trip and logs it", async () => {
        tripPlanRepository.softDelete.mockResolvedValue({ nameTrip: "Huế" });

        await expect(adminService.deleteTrip(admin, ID)).resolves.toEqual({ message: "Delete trip successfully" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "deleteTrip", target: "Huế" }));

        tripPlanRepository.softDelete.mockResolvedValue(null);
        await expect(adminService.deleteTrip(admin, ID)).rejects.toMatchObject({ status: 404 });
        await expect(adminService.deleteTrip(admin, "bad")).rejects.toMatchObject({ status: 404 });
    });
});

describe("challenges", () => {
    const challenge = { _id: ID, nameLocation: "Hồ Gươm", location: "Hà Nội", points: 50, tripDayId: "d1" };

    it("lists them with province, participants and completions", async () => {
        adminRepository.listChallenges.mockResolvedValue([challenge, { _id: "c2" }]);
        adminRepository.provinceOfChallenges.mockResolvedValue(new Map([[ID, "Hà Nội"]]));
        adminRepository.progressOfChallenges.mockResolvedValue(new Map([[ID, { participants: 4, completed: 1 }]]));

        const [first, second] = await adminService.listChallenges();

        expect(first).toMatchObject({ nameLocation: "Hồ Gươm", province: "Hà Nội", participants: 4, completed: 1, points: 50 });
        expect(second).toMatchObject({ nameLocation: "", province: "", participants: 0, points: 0, challengeSummary: "" });
    });

    it("edits the name, the description and the points", async () => {
        adminRepository.updateChallenge.mockResolvedValue({ ...challenge, points: 80 });
        adminRepository.provinceOfChallenges.mockResolvedValue(new Map());
        adminRepository.progressOfChallenges.mockResolvedValue(new Map());

        const result = await adminService.updateChallenge(admin, ID, { nameLocation: " Hồ Gươm ", challengeSummary: " Check-in ", points: 80 });

        expect(adminRepository.updateChallenge).toHaveBeenCalledWith(ID, { nameLocation: "Hồ Gươm", challengeSummary: "Check-in", points: 80 });
        expect(result.points).toBe(80);
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "updateChallenge" }));
    });

    it.each([
        [{}, 400],
        [{ nameLocation: " " }, 400],
        [{ nameLocation: 5 }, 400],
        [{ challengeSummary: 5 }, 400],
        [{ points: -1 }, 400],
        [{ points: 1001 }, 400],
        [{ points: 1.5 }, 400],
    ])("rejects %j", async (body, status) => {
        await expect(adminService.updateChallenge(admin, ID, body)).rejects.toMatchObject({ status });
        await expect(adminService.updateChallenge(admin, ID)).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an unknown challenge", async () => {
        await expect(adminService.updateChallenge(admin, "bad", { points: 1 })).rejects.toMatchObject({ status: 404 });
        adminRepository.updateChallenge.mockResolvedValue(null);
        await expect(adminService.updateChallenge(admin, ID, { points: 1 })).rejects.toMatchObject({ status: 404 });
    });
});

describe("aiOverview", () => {
    it("summarises the usage, a 14 day chart and the conversations", async () => {
        const today = new Date().toISOString().slice(0, 10);
        adminRepository.countChats.mockResolvedValue(10);
        adminRepository.countChatsBetween.mockResolvedValueOnce(6).mockResolvedValueOnce(3);
        adminRepository.countMessages.mockResolvedValue(35);
        adminRepository.distinctChatUsers.mockResolvedValue(["u1", "u2"]);
        adminRepository.messagesPerDay.mockResolvedValue([{ _id: today, value: 9 }]);
        adminRepository.listChats.mockResolvedValue([{ _id: "c1", userId: "u1", title: "Đà Lạt", updatedAt: new Date() }, { _id: "c2", userId: "ghost", createdAt: new Date("2026-01-01") }]);
        adminRepository.findUsersByIds.mockResolvedValue([{ _id: "u1", username: "an" }]);
        adminRepository.messagesPerChat.mockResolvedValue(new Map([["c1", 5]]));

        const result = await adminService.aiOverview();

        expect(result.stats).toEqual({
            conversations: { value: 10, delta: 1 },
            messages: { value: 35 },
            activeUsers: { value: 2 },
            avgMessages: { value: 3.5 },
        });
        expect(result.dailyMessages).toHaveLength(14);
        expect(result.dailyMessages[13].value).toBe(9);
        expect(result.chats[0]).toMatchObject({ title: "Đà Lạt", user: "an", messages: 5 });
        expect(result.chats[1]).toMatchObject({ title: "", user: "", messages: 0, updatedAt: new Date("2026-01-01") });
    });

    it("has no average without conversations", async () => {
        adminRepository.countChats.mockResolvedValue(0);
        adminRepository.countChatsBetween.mockResolvedValue(0);
        adminRepository.countMessages.mockResolvedValue(0);
        adminRepository.distinctChatUsers.mockResolvedValue([]);
        adminRepository.messagesPerDay.mockResolvedValue([]);
        adminRepository.listChats.mockResolvedValue([]);
        adminRepository.findUsersByIds.mockResolvedValue([]);
        adminRepository.messagesPerChat.mockResolvedValue(new Map());

        const result = await adminService.aiOverview();

        expect(result.stats.avgMessages.value).toBe(0);
        expect(result.stats.conversations.delta).toBe(0);
    });
});

describe("reports", () => {
    const stub = () => {
        adminRepository.countUsersBetween.mockResolvedValueOnce(6).mockResolvedValueOnce(3);
        adminRepository.countTripsBetween.mockResolvedValueOnce(10).mockResolvedValueOnce(5);
        adminRepository.progressInPeriod.mockResolvedValueOnce({ started: 10, completed: 5 }).mockResolvedValueOnce({ started: 0, completed: 0 });
        adminRepository.averageTripCost.mockResolvedValueOnce([{ avgCost: 1000.4 }]).mockResolvedValueOnce([]);
        adminRepository.tripsPerDay.mockResolvedValue([{ _id: new Date().toISOString().slice(0, 10), value: 3 }]);
        adminRepository.provincesInPeriod.mockResolvedValue([{ _id: "Huế", trips: 4, avgCost: 1500.6 }, { _id: null, trips: 1 }]);
    };

    it.each([["7d", 7], ["30d", 30], ["90d", 13]])("%s: stats, change against the previous period, chart (%i points)", async (period, points) => {
        stub();

        const report = await adminService.reports(period);

        expect(report.stats.newUsers).toEqual({ value: 6, delta: 1 });
        expect(report.stats.tripsCreated).toEqual({ value: 10, delta: 1 });
        expect(report.stats.completionRate).toEqual({ value: 0.5, delta: 0 });
        expect(report.stats.avgTripCost).toEqual({ value: 1000, delta: 0 });
        expect(report.tripsCreated).toHaveLength(points);
        expect(report.provinces).toEqual([{ name: "Huế", trips: 4, avgCost: 1501 }, { name: "", trips: 1, avgCost: 0 }]);
    });

    it("rejects an unknown period", async () => {
        await expect(adminService.reports("1y")).rejects.toMatchObject({ status: 400 });
    });
});

describe("activity log and moderation", () => {
    it("lists the log entries", async () => {
        contentRepository.listLogs.mockResolvedValue([{ _id: ID, createdAt: new Date("2026-01-01"), actorName: "An", action: "login", target: "", ip: "1.1.1.1", level: "info" }]);

        await expect(adminService.listLogs()).resolves.toEqual([{ id: ID, at: new Date("2026-01-01"), actor: "An", action: "login", target: "", ip: "1.1.1.1", level: "info" }]);
    });

    it("lists the reported content", async () => {
        contentRepository.listReports.mockResolvedValue([{ _id: ID, type: "video", reason: "spam", content: "c", authorName: "Bình", createdAt: new Date("2026-01-01"), status: "pending" }]);

        await expect(adminService.listReports()).resolves.toEqual([{ id: ID, type: "video", reason: "spam", content: "c", author: "Bình", reportedAt: new Date("2026-01-01"), status: "pending" }]);
    });

    it("approves or rejects a report and logs the decision", async () => {
        contentRepository.decideReport.mockResolvedValue({ _id: ID, content: "Ảnh lạ", status: "rejected" });

        const result = await adminService.decideReport(admin, ID, "rejected");

        expect(contentRepository.decideReport).toHaveBeenCalledWith(ID, "rejected", "a1");
        expect(result.status).toBe("rejected");
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "moderate", target: "rejected: Ảnh lạ" }));
    });

    it("rejects a bad decision and an unknown report", async () => {
        await expect(adminService.decideReport(admin, ID, "maybe")).rejects.toMatchObject({ status: 400 });
        await expect(adminService.decideReport(admin, "bad", "approved")).rejects.toMatchObject({ status: 404 });
        contentRepository.decideReport.mockResolvedValue(null);
        await expect(adminService.decideReport(admin, ID, "approved")).rejects.toMatchObject({ status: 404 });
    });
});
