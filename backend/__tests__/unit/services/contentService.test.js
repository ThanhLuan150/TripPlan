import { beforeEach, describe, expect, it, vi } from "vitest";
import contentRepository from "../../../src/repositories/contentRepository.js";
import activityLogService from "../../../src/services/activityLogService.js";
import contentService from "../../../src/services/contentService.js";
import { doc } from "../../helpers/http.js";

vi.mock("../../../src/repositories/contentRepository.js", () => ({
    default: Object.fromEntries(
        [
            "listVideos", "listPublishedVideos", "createVideo", "updateVideo", "deleteVideo",
            "listAnnouncements", "listVisibleAnnouncements", "createAnnouncement", "updateAnnouncement", "deleteAnnouncement",
            "getSettings", "saveSettings", "createReport",
            "listShowcase", "listPublishedShowcase", "createShowcase", "updateShowcase", "deleteShowcase",
        ].map((name) => [name, vi.fn()]),
    ),
}));
vi.mock("../../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));
vi.mock("../../../src/services/adminService.js", () => ({ LIST_LIMIT: 1000 }));

const admin = { _id: "a1" };
const ID = "64b000000000000000000001";
const video = (extra = {}) => ({ _id: ID, title: "Fansipan", location: "Lào Cai", youtubeLink: "https://youtu.be/abcdefghijk", status: "published", createdAt: new Date(), ...extra });

beforeEach(() => vi.resetAllMocks());

describe("videos", () => {
    it("lists them for the admin with defaults filled in", async () => {
        contentRepository.listVideos.mockResolvedValue([video({ location: undefined, durationSec: undefined, views: undefined })]);

        const [first] = await contentService.listVideos();

        expect(first).toMatchObject({ id: ID, location: "", durationSec: 0, views: 0, showOnHome: false, src: "" });
        expect(contentRepository.listVideos).toHaveBeenCalledWith(1000);
    });

    it("creates a video with a required title and valid links", async () => {
        contentRepository.createVideo.mockImplementation(async (data) => doc(video(data)));

        const created = await contentService.createVideo(admin, { title: " Hạ Long ", youtubeLink: "https://youtu.be/abcdefghijk", durationSec: 30, showOnHome: true, status: "hidden" });

        expect(contentRepository.createVideo).toHaveBeenCalledWith({ title: "Hạ Long", youtubeLink: "https://youtu.be/abcdefghijk", durationSec: 30, showOnHome: true, status: "hidden" });
        expect(created.title).toBe("Hạ Long");
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "manageVideo", target: "+ Hạ Long" }));
    });

    it.each([
        [{}, "title is required"],
        [{ title: 5 }, "Invalid title"],
        [{ title: "x".repeat(201) }, "Invalid title"],
        [{ title: "A", youtubeLink: "ftp://x" }, "Invalid youtubeLink"],
        [{ title: "A", durationSec: -1 }, "Invalid durationSec"],
        [{ title: "A", durationSec: 1.5 }, "Invalid durationSec"],
        [{ title: "A", showOnHome: "yes" }, "Invalid showOnHome"],
        [{ title: "A", status: "gone" }, "status must be one of: published, hidden"],
    ])("rejects %j", async (body, message) => {
        await expect(contentService.createVideo(admin, body)).rejects.toMatchObject({ status: 400, message });
    });

    it("edits only what was sent, and rejects an empty change or an unknown id", async () => {
        contentRepository.updateVideo.mockResolvedValue(video({ title: "New" }));

        await expect(contentService.updateVideo(admin, ID, { title: "New" })).resolves.toMatchObject({ title: "New" });
        expect(contentRepository.updateVideo).toHaveBeenCalledWith(ID, { title: "New" });

        await expect(contentService.updateVideo(admin, ID, {})).rejects.toMatchObject({ status: 400, message: "Nothing to update" });
        await expect(contentService.updateVideo(admin, "bad", { title: "x" })).rejects.toMatchObject({ status: 404 });
        contentRepository.updateVideo.mockResolvedValue(null);
        await expect(contentService.updateVideo(admin, ID, { title: "x" })).rejects.toMatchObject({ status: 404 });
    });

    it("deletes a video", async () => {
        contentRepository.deleteVideo.mockResolvedValue(video());

        await expect(contentService.deleteVideo(admin, ID)).resolves.toEqual({ message: "Delete video successfully" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ level: "warning" }));

        contentRepository.deleteVideo.mockResolvedValue(null);
        await expect(contentService.deleteVideo(admin, ID)).rejects.toMatchObject({ status: 404 });
        await expect(contentService.deleteVideo(admin, "bad")).rejects.toMatchObject({ status: 404 });
    });

    it("gives the app the published videos with a YouTube thumbnail", async () => {
        contentRepository.listPublishedVideos.mockResolvedValue([video(), video({ _id: "64b000000000000000000002", youtubeLink: "", src: "https://cdn/x.mp4" })]);

        const list = await contentService.listPublicVideos({ home: true });

        expect(contentRepository.listPublishedVideos).toHaveBeenCalledWith({ home: true });
        expect(list[0]).toEqual({ id: ID, title: "Fansipan", location: "Lào Cai", youtubeLink: "https://youtu.be/abcdefghijk", src: "", thumbnail: "https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg" });
        expect(list[1]).toMatchObject({ youtubeLink: "", src: "https://cdn/x.mp4", thumbnail: "" });
        await contentService.listPublicVideos();
        expect(contentRepository.listPublishedVideos).toHaveBeenLastCalledWith({ home: false });
    });
});

describe("home page pictures", () => {
    const picture = (extra = {}) => ({ _id: ID, kind: "suggestion", title: "Đà Lạt", location: "Lâm Đồng", imageUrl: "https://cdn/x.jpg", status: "published", sortOrder: 2, createdAt: new Date(), ...extra });

    it("lists them for the admin with defaults filled in", async () => {
        contentRepository.listShowcase.mockResolvedValue([picture({ title: undefined, location: undefined, sortOrder: undefined })]);

        await expect(contentService.listShowcase()).resolves.toEqual([expect.objectContaining({ title: "", location: "", sortOrder: 0, kind: "suggestion" })]);
    });

    it("creates one with a kind and an image URL, and logs it", async () => {
        contentRepository.createShowcase.mockImplementation(async (data) => doc(picture(data)));

        const created = await contentService.createShowcase(admin, { kind: "banner", imageUrl: " https://cdn/a.jpg ", title: "Hạ Long", status: "hidden", sortOrder: 4 });

        expect(contentRepository.createShowcase).toHaveBeenCalledWith({ kind: "banner", imageUrl: "https://cdn/a.jpg", title: "Hạ Long", status: "hidden", sortOrder: 4 });
        expect(created.kind).toBe("banner");
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "manageShowcase", target: "+ banner Hạ Long" }));
    });

    it.each([
        [{ imageUrl: "https://cdn/a.jpg" }, "kind must be one of"],
        [{ kind: "poster", imageUrl: "https://cdn/a.jpg" }, "kind must be one of"],
        [{ kind: "banner" }, "imageUrl is required"],
        [{ kind: "banner", imageUrl: "javascript:alert(1)" }, "Invalid imageUrl"],
        [{ kind: "banner", imageUrl: "https://cdn/a.jpg", status: "gone" }, "status must be one of"],
        [{ kind: "banner", imageUrl: "https://cdn/a.jpg", sortOrder: -1 }, "Invalid sortOrder"],
        [{ kind: "banner", imageUrl: "https://cdn/a.jpg", sortOrder: 1.5 }, "Invalid sortOrder"],
    ])("rejects %j", async (body, message) => {
        await expect(contentService.createShowcase(admin, body)).rejects.toMatchObject({ status: 400, message: expect.stringContaining(message) });
    });

    it("edits, and refuses an empty image, an empty change and unknown ids", async () => {
        contentRepository.updateShowcase.mockResolvedValue(picture({ title: "Mới" }));

        await expect(contentService.updateShowcase(admin, ID, { title: "Mới", kind: "suggestion" })).resolves.toMatchObject({ title: "Mới" });
        expect(contentRepository.updateShowcase).toHaveBeenCalledWith(ID, { title: "Mới", kind: "suggestion" });

        await expect(contentService.updateShowcase(admin, ID, { imageUrl: "" })).rejects.toMatchObject({ status: 400 });
        await expect(contentService.updateShowcase(admin, ID, {})).rejects.toMatchObject({ status: 400 });
        await expect(contentService.updateShowcase(admin, "bad", { title: "x" })).rejects.toMatchObject({ status: 404 });
        contentRepository.updateShowcase.mockResolvedValue(null);
        await expect(contentService.updateShowcase(admin, ID, { title: "x" })).rejects.toMatchObject({ status: 404 });
    });

    it("deletes one", async () => {
        contentRepository.deleteShowcase.mockResolvedValue(picture());

        await expect(contentService.deleteShowcase(admin, ID)).resolves.toEqual({ message: "Delete picture successfully" });
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ level: "warning", target: "- suggestion Đà Lạt" }));

        contentRepository.deleteShowcase.mockResolvedValue(null);
        await expect(contentService.deleteShowcase(admin, ID)).rejects.toMatchObject({ status: 404 });
        await expect(contentService.deleteShowcase(admin, "bad")).rejects.toMatchObject({ status: 404 });
    });

    it("gives the app the published slides and suggestions", async () => {
        contentRepository.listPublishedShowcase.mockResolvedValue([
            picture({ kind: "banner", title: undefined }),
            picture({ _id: "64b000000000000000000002", location: undefined }),
        ]);

        await expect(contentService.getPublicHome()).resolves.toEqual({
            banners: [{ id: ID, title: "", imageUrl: "https://cdn/x.jpg" }],
            suggestions: [{ id: "64b000000000000000000002", title: "Đà Lạt", location: "", imageUrl: "https://cdn/x.jpg" }],
        });
    });
});

describe("announcements", () => {
    const item = (extra = {}) => ({ _id: ID, title: "Bảo trì", message: "22h", status: "draft", publishAt: new Date("2026-01-01"), createdAt: new Date(), ...extra });

    it("lists, creates (title required, valid date and status), edits and deletes", async () => {
        contentRepository.listAnnouncements.mockResolvedValue([item({ message: undefined })]);
        contentRepository.createAnnouncement.mockImplementation(async (data) => doc(item(data)));
        contentRepository.updateAnnouncement.mockResolvedValue(item({ status: "published" }));
        contentRepository.deleteAnnouncement.mockResolvedValue(item());

        await expect(contentService.listAnnouncements()).resolves.toEqual([expect.objectContaining({ message: "" })]);
        const created = await contentService.createAnnouncement(admin, { title: "Bảo trì", message: "22h", status: "published", publishAt: "2026-05-01T10:00:00.000Z" });
        expect(contentRepository.createAnnouncement).toHaveBeenCalledWith({ title: "Bảo trì", message: "22h", status: "published", publishAt: new Date("2026-05-01T10:00:00.000Z") });
        expect(created.title).toBe("Bảo trì");
        await expect(contentService.updateAnnouncement(admin, ID, { status: "published" })).resolves.toMatchObject({ status: "published" });
        await expect(contentService.deleteAnnouncement(admin, ID)).resolves.toEqual({ message: "Delete announcement successfully" });
        expect(activityLogService.record).toHaveBeenCalledTimes(3);
    });

    it.each([
        [{}, "title is required"],
        [{ title: "A", status: "sent" }, "status must be one of: draft, published"],
        [{ title: "A", publishAt: "never" }, "Invalid publishAt"],
        [{ title: "A", publishAt: 5 }, "Invalid publishAt"],
    ])("rejects %j", async (body, message) => {
        await expect(contentService.createAnnouncement(admin, body)).rejects.toMatchObject({ status: 400, message });
    });

    it("rejects an empty edit and unknown ids", async () => {
        await expect(contentService.updateAnnouncement(admin, ID, {})).rejects.toMatchObject({ status: 400 });
        await expect(contentService.updateAnnouncement(admin, "bad", { title: "x" })).rejects.toMatchObject({ status: 404 });
        contentRepository.updateAnnouncement.mockResolvedValue(null);
        await expect(contentService.updateAnnouncement(admin, ID, { title: "x" })).rejects.toMatchObject({ status: 404 });
        contentRepository.deleteAnnouncement.mockResolvedValue(null);
        await expect(contentService.deleteAnnouncement(admin, ID)).rejects.toMatchObject({ status: 404 });
        await expect(contentService.deleteAnnouncement(admin, "bad")).rejects.toMatchObject({ status: 404 });
    });

    it("gives the app the published ones that are due", async () => {
        contentRepository.listVisibleAnnouncements.mockResolvedValue([item({ status: "published", message: undefined })]);

        const list = await contentService.listPublicAnnouncements();

        expect(list).toEqual([{ id: ID, title: "Bảo trì", message: "", publishAt: new Date("2026-01-01") }]);
        expect(contentRepository.listVisibleAnnouncements).toHaveBeenCalledWith(expect.any(Date));
    });
});

describe("settings", () => {
    it("reads and saves the app name, support email and hotline", async () => {
        contentRepository.getSettings.mockResolvedValue({ appName: "Aloca" });
        contentRepository.saveSettings.mockResolvedValue({ appName: "Aloca Travel", supportEmail: "a@b.vn", hotline: "1900" });

        await expect(contentService.getSettings()).resolves.toEqual({ appName: "Aloca", supportEmail: "", hotline: "" });
        const saved = await contentService.saveSettings(admin, { appName: " Aloca Travel ", supportEmail: "a@b.vn", hotline: "1900" });

        expect(contentRepository.saveSettings).toHaveBeenCalledWith({ appName: "Aloca Travel", supportEmail: "a@b.vn", hotline: "1900" });
        expect(saved.appName).toBe("Aloca Travel");
        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: "updateSettings", target: "appName, supportEmail, hotline" }));
    });

    it.each([
        [{ appName: " " }, "Invalid appName"],
        [{ supportEmail: "nope" }, "Invalid supportEmail"],
        [{ hotline: "abc" }, "Invalid hotline"],
        [{}, "Nothing to update"],
    ])("rejects %j", async (body, message) => {
        await expect(contentService.saveSettings(admin, body)).rejects.toMatchObject({ status: 400, message });
        await expect(contentService.saveSettings(admin)).rejects.toMatchObject({ status: 400 });
    });
});

describe("reportContent", () => {
    it("stores a report of a signed-in user", async () => {
        contentRepository.createReport.mockResolvedValue({});

        await expect(
            contentService.reportContent(admin, { type: "video", reason: "spam", content: " Quảng cáo ", authorName: "Bình" }),
        ).resolves.toEqual({ message: "Report sent successfully" });

        expect(contentRepository.createReport).toHaveBeenCalledWith({ type: "video", reason: "spam", content: "Quảng cáo", authorName: "Bình", reporterId: "a1" });
        await contentService.reportContent(admin, { type: "profile", reason: "spam", content: "x" });
        expect(contentRepository.createReport).toHaveBeenLastCalledWith(expect.objectContaining({ authorName: "" }));
    });

    it.each([
        [{ type: "x", reason: "spam", content: "c" }, "type must be one of"],
        [{ type: "video", reason: "x", content: "c" }, "reason must be one of"],
        [{ type: "video", reason: "spam" }, "content is required"],
    ])("rejects %j", async (body, message) => {
        await expect(contentService.reportContent(admin, body)).rejects.toMatchObject({ status: 400, message: expect.stringContaining(message) });
        await expect(contentService.reportContent(admin)).rejects.toMatchObject({ status: 400 });
    });
});
