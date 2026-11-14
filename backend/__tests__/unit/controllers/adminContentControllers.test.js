// The admin and content controllers pass the right request data to their
// service and answer 200 (201 for a report) with the result; errors go to next().
import { beforeEach, describe, expect, it, vi } from "vitest";
import adminController from "../../../src/controllers/adminController.js";
import contentController from "../../../src/controllers/contentController.js";
import adminService from "../../../src/services/adminService.js";
import contentService from "../../../src/services/contentService.js";
import { callController, mockReq } from "../../helpers/http.js";

const { fns } = vi.hoisted(() => ({ fns: (...names) => Object.fromEntries(names.map((name) => [name, vi.fn()])) }));

vi.mock("../../../src/services/adminService.js", () => ({
    default: fns(
        "dashboard", "alerts", "listUsers", "getUser", "createUser", "updateUser", "bulkUpdateUsers",
        "listTrips", "getTrip", "deleteTrip", "listChallenges", "updateChallenge", "deleteChallenge",
        "roles", "aiOverview", "reports", "listLogs", "listReports", "decideReport",
    ),
}));
vi.mock("../../../src/services/contentService.js", () => ({
    default: fns(
        "listVideos", "createVideo", "updateVideo", "deleteVideo", "listAnnouncements", "createAnnouncement",
        "updateAnnouncement", "deleteAnnouncement", "getSettings", "saveSettings", "listPublicVideos",
        "listPublicAnnouncements", "reportContent", "listShowcase", "createShowcase", "updateShowcase", "deleteShowcase", "getPublicHome",
    ),
}));

const admin = { _id: "a1", role: "admin" };

beforeEach(() => vi.resetAllMocks());

describe("adminController", () => {
    it.each([
        ["dashboard", "dashboard", {}, []],
        ["alerts", "alerts", {}, []],
        ["listUsers", "listUsers", {}, []],
        ["getUser", "getUser", { params: { id: "u1" } }, ["u1"]],
        ["createUser", "createUser", { body: { username: "x" } }, [admin, { username: "x" }]],
        ["updateUser", "updateUser", { params: { id: "u1" }, body: { role: "admin" } }, [admin, "u1", { role: "admin" }]],
        ["bulkUpdateUsers", "bulkUpdateUsers", { body: { ids: ["u1"] } }, [admin, { ids: ["u1"] }]],
        ["listTrips", "listTrips", {}, []],
        ["getTrip", "getTrip", { params: { id: "t1" } }, ["t1"]],
        ["deleteTrip", "deleteTrip", { params: { id: "t1" } }, [admin, "t1"]],
        ["listChallenges", "listChallenges", {}, []],
        ["updateChallenge", "updateChallenge", { params: { id: "c1" }, body: { points: 5 } }, [admin, "c1", { points: 5 }]],
        ["deleteChallenge", "deleteChallenge", { params: { id: "c1" } }, [admin, "c1"]],
        ["roles", "roles", {}, []],
        ["aiOverview", "aiOverview", {}, []],
        ["listLogs", "listLogs", {}, []],
        ["listModeration", "listReports", {}, []],
        ["decideModeration", "decideReport", { params: { id: "r1" }, body: { status: "approved" } }, [admin, "r1", "approved"]],
    ])("%s -> adminService.%s", async (action, method, request, args) => {
        adminService[method].mockResolvedValue({ ok: true });

        const { res } = await callController(adminController[action], mockReq({ user: admin, ...request }));

        expect(adminService[method]).toHaveBeenCalledWith(...args);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("deleteUser is a state change to \"delete\"", async () => {
        adminService.updateUser.mockResolvedValue({ id: "u1" });

        await callController(adminController.deleteUser, mockReq({ user: admin, params: { id: "u1" } }));

        expect(adminService.updateUser).toHaveBeenCalledWith(admin, "u1", { status: "delete" });
    });

    it("reports defaults to the last 30 days", async () => {
        adminService.reports.mockResolvedValue({});

        await callController(adminController.reports, mockReq({ user: admin, query: {} }));
        await callController(adminController.reports, mockReq({ user: admin, query: { period: "7d" } }));

        expect(adminService.reports).toHaveBeenNthCalledWith(1, "30d");
        expect(adminService.reports).toHaveBeenNthCalledWith(2, "7d");
    });

    it("passes the content actions to the content service", async () => {
        for (const method of ["listVideos", "createVideo", "updateVideo", "deleteVideo", "listAnnouncements", "createAnnouncement", "updateAnnouncement", "deleteAnnouncement", "getSettings", "saveSettings"]) {
            contentService[method].mockResolvedValue({ method });
        }
        const request = mockReq({ user: admin, params: { id: "x1" }, body: { title: "T" } });

        await callController(adminController.listVideos, request);
        await callController(adminController.createVideo, request);
        await callController(adminController.updateVideo, request);
        await callController(adminController.deleteVideo, request);
        await callController(adminController.listAnnouncements, request);
        await callController(adminController.createAnnouncement, request);
        await callController(adminController.updateAnnouncement, request);
        await callController(adminController.deleteAnnouncement, request);
        await callController(adminController.getSettings, request);
        await callController(adminController.saveSettings, request);

        expect(contentService.createVideo).toHaveBeenCalledWith(admin, { title: "T" });
        expect(contentService.updateVideo).toHaveBeenCalledWith(admin, "x1", { title: "T" });
        expect(contentService.deleteVideo).toHaveBeenCalledWith(admin, "x1");
        expect(contentService.createAnnouncement).toHaveBeenCalledWith(admin, { title: "T" });
        expect(contentService.updateAnnouncement).toHaveBeenCalledWith(admin, "x1", { title: "T" });
        expect(contentService.deleteAnnouncement).toHaveBeenCalledWith(admin, "x1");
        expect(contentService.saveSettings).toHaveBeenCalledWith(admin, { title: "T" });
        expect(contentService.listVideos).toHaveBeenCalledTimes(1);
    });

    it("passes the home page pictures to the content service", async () => {
        for (const method of ["listShowcase", "createShowcase", "updateShowcase", "deleteShowcase"]) {
            contentService[method].mockResolvedValue({ method });
        }
        const request = mockReq({ user: admin, params: { id: "s1" }, body: { kind: "banner" } });

        await callController(adminController.listShowcase, request);
        await callController(adminController.createShowcase, request);
        await callController(adminController.updateShowcase, request);
        await callController(adminController.deleteShowcase, request);

        expect(contentService.createShowcase).toHaveBeenCalledWith(admin, { kind: "banner" });
        expect(contentService.updateShowcase).toHaveBeenCalledWith(admin, "s1", { kind: "banner" });
        expect(contentService.deleteShowcase).toHaveBeenCalledWith(admin, "s1");
        expect(contentService.listShowcase).toHaveBeenCalledTimes(1);
    });

    it("passes service errors to next()", async () => {
        const error = new Error("boom");
        adminService.dashboard.mockRejectedValue(error);

        const { err } = await callController(adminController.dashboard, mockReq({ user: admin }));

        expect(err).toBe(error);
    });
});

describe("contentController", () => {
    it("videos: all published, or only those of the home page with ?home=1", async () => {
        contentService.listPublicVideos.mockResolvedValue([]);

        await callController(contentController.videos, mockReq({ query: {} }));
        await callController(contentController.videos, mockReq({ query: { home: "1" } }));

        expect(contentService.listPublicVideos).toHaveBeenNthCalledWith(1, { home: false });
        expect(contentService.listPublicVideos).toHaveBeenNthCalledWith(2, { home: true });
    });

    it("announcements and settings", async () => {
        contentService.listPublicAnnouncements.mockResolvedValue([{ id: "a" }]);
        contentService.getSettings.mockResolvedValue({ appName: "Aloca" });

        const a = await callController(contentController.announcements, mockReq());
        const s = await callController(contentController.settings, mockReq());

        expect(a.res.json).toHaveBeenCalledWith([{ id: "a" }]);
        expect(s.res.json).toHaveBeenCalledWith({ appName: "Aloca" });
    });

    it("home gives the slider and the suggestions", async () => {
        contentService.getPublicHome.mockResolvedValue({ banners: [], suggestions: [] });

        const { res } = await callController(contentController.home, mockReq());

        expect(res.json).toHaveBeenCalledWith({ banners: [], suggestions: [] });
    });

    it("report answers 201", async () => {
        contentService.reportContent.mockResolvedValue({ message: "sent" });

        const { res } = await callController(contentController.report, mockReq({ user: admin, body: { type: "video" } }));

        expect(contentService.reportContent).toHaveBeenCalledWith(admin, { type: "video" });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
