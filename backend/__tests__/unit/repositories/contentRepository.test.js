import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../../helpers/mongoose.js";

const { modelDouble } = vi.hoisted(() => ({
    modelDouble: () => ({
        find: vi.fn(),
        create: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        findByIdAndDelete: vi.fn(),
        findOneAndUpdate: vi.fn(),
        countDocuments: vi.fn(),
    }),
}));

vi.mock("../../../src/models/Video.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Showcase.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Announcement.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/Setting.js", () => ({ default: modelDouble(), SETTINGS_KEY: "app" }));
vi.mock("../../../src/models/ActivityLog.js", () => ({ default: modelDouble() }));
vi.mock("../../../src/models/ContentReport.js", () => ({ default: modelDouble() }));

const { default: Video } = await import("../../../src/models/Video.js");
const { default: Showcase } = await import("../../../src/models/Showcase.js");
const { default: Announcement } = await import("../../../src/models/Announcement.js");
const { default: Setting } = await import("../../../src/models/Setting.js");
const { default: ActivityLog } = await import("../../../src/models/ActivityLog.js");
const { default: ContentReport } = await import("../../../src/models/ContentReport.js");
const { default: repo } = await import("../../../src/repositories/contentRepository.js");

const ID = "64b000000000000000000001";

beforeEach(() => vi.resetAllMocks());

describe("videos", () => {
    it("lists the newest first, and what the app shows: published, optionally the home ones", async () => {
        const all = query(["v"]);
        Video.find.mockReturnValueOnce(all).mockReturnValue(query(["p"]));

        await expect(repo.listVideos(10)).resolves.toEqual(["v"]);
        expect(all.limit).toHaveBeenCalledWith(10);

        await repo.listPublishedVideos();
        await repo.listPublishedVideos({ home: true });
        expect(Video.find).toHaveBeenNthCalledWith(2, { status: "published" });
        expect(Video.find).toHaveBeenNthCalledWith(3, { status: "published", showOnHome: true });
    });

    it("creates, edits (validating) and deletes", async () => {
        Video.create.mockResolvedValue({ _id: ID });
        Video.findByIdAndUpdate.mockReturnValue(query({ _id: ID }));
        Video.findByIdAndDelete.mockReturnValue(query({ _id: ID }));

        await repo.createVideo({ title: "A" });
        await repo.updateVideo(ID, { title: "B" });
        await repo.deleteVideo(ID);

        expect(Video.findByIdAndUpdate).toHaveBeenCalledWith(ID, { $set: { title: "B" } }, { new: true, runValidators: true });
        expect(Video.findByIdAndDelete).toHaveBeenCalledWith(ID);
    });
});

describe("home page pictures", () => {
    it("lists them in the admin order, and only the published ones for the app", async () => {
        const all = query(["s"]);
        Showcase.find.mockReturnValueOnce(all).mockReturnValue(query(["p"]));

        await expect(repo.listShowcase(10)).resolves.toEqual(["s"]);
        await repo.listPublishedShowcase();

        expect(all.sort).toHaveBeenCalledWith({ sortOrder: 1, createdAt: -1 });
        expect(all.limit).toHaveBeenCalledWith(10);
        expect(Showcase.find).toHaveBeenNthCalledWith(2, { status: "published" });
    });

    it("creates, edits, deletes and counts", async () => {
        Showcase.create.mockResolvedValue({});
        Showcase.findByIdAndUpdate.mockReturnValue(query({}));
        Showcase.findByIdAndDelete.mockReturnValue(query({}));
        Showcase.countDocuments.mockResolvedValue(3);

        await repo.createShowcase({ kind: "banner" });
        await repo.updateShowcase(ID, { title: "B" });
        await repo.deleteShowcase(ID);
        await expect(repo.countShowcase()).resolves.toBe(3);

        expect(Showcase.findByIdAndUpdate).toHaveBeenCalledWith(ID, { $set: { title: "B" } }, { new: true, runValidators: true });
    });
});

describe("announcements", () => {
    it("lists all of them, and only the published ones that are due for the app", async () => {
        Announcement.find.mockReturnValue(query(["a"]));
        const now = new Date();

        await repo.listAnnouncements(5);
        await repo.listVisibleAnnouncements(now);

        expect(Announcement.find).toHaveBeenNthCalledWith(2, { status: "published", publishAt: { $lte: now } });
    });

    it("creates, edits and deletes", async () => {
        Announcement.create.mockResolvedValue({});
        Announcement.findByIdAndUpdate.mockReturnValue(query({}));
        Announcement.findByIdAndDelete.mockReturnValue(query({}));

        await repo.createAnnouncement({ title: "A" });
        await repo.updateAnnouncement(ID, { title: "B" });
        await repo.deleteAnnouncement(ID);

        expect(Announcement.findByIdAndUpdate).toHaveBeenCalledWith(ID, { $set: { title: "B" } }, { new: true, runValidators: true });
    });
});

describe("settings", () => {
    it("creates the settings document the first time, and saves changes", async () => {
        Setting.findOneAndUpdate.mockReturnValue(query({ appName: "Aloca" }));

        await expect(repo.getSettings()).resolves.toEqual({ appName: "Aloca" });
        await repo.saveSettings({ hotline: "1900" });

        expect(Setting.findOneAndUpdate.mock.calls[0]).toEqual([{ key: "app" }, { $setOnInsert: { key: "app" } }, { upsert: true, new: true }]);
        const [filter, update, options] = Setting.findOneAndUpdate.mock.calls[1];
        expect(filter).toEqual({ key: "app" });
        expect(update.$set).toMatchObject({ hotline: "1900", updatedAt: expect.any(Date) });
        expect(options).toEqual({ upsert: true, new: true, runValidators: true });
    });
});

describe("activity log and reports", () => {
    it("lists the log newest first, of everybody or of one actor, and writes an entry", async () => {
        ActivityLog.find.mockReturnValue(query(["l"]));
        ActivityLog.create.mockResolvedValue({});

        await repo.listLogs(3);
        await repo.listLogsByActor(ID, 3);
        await repo.createLog({ action: "login" });

        expect(ActivityLog.find).toHaveBeenNthCalledWith(1, {});
        expect(ActivityLog.find).toHaveBeenNthCalledWith(2, { actorId: ID });
        expect(ActivityLog.create).toHaveBeenCalledWith({ action: "login" });
    });

    it("lists, counts, creates and decides reports", async () => {
        ContentReport.find.mockReturnValue(query(["r"]));
        ContentReport.countDocuments.mockResolvedValue(2);
        ContentReport.create.mockResolvedValue({});
        ContentReport.findByIdAndUpdate.mockReturnValue(query({ status: "approved" }));

        await repo.listReports(5);
        await expect(repo.countPendingReports()).resolves.toBe(2);
        await repo.createReport({ type: "video" });
        await repo.decideReport(ID, "approved", "admin1");

        expect(ContentReport.countDocuments).toHaveBeenCalledWith({ status: "pending" });
        const [id, update, options] = ContentReport.findByIdAndUpdate.mock.calls[0];
        expect(id).toBe(ID);
        expect(update.$set).toMatchObject({ status: "approved", decidedBy: "admin1", decidedAt: expect.any(Date) });
        expect(options).toEqual({ new: true });
    });
});
