import bcrypt from "bcrypt";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const models = vi.hoisted(() => ({
    User: { findOneAndUpdate: vi.fn() },
    TripPlan: { exists: vi.fn(), create: vi.fn() },
    TripDay: { create: vi.fn() },
    Challenge: { create: vi.fn() },
    UserChallengeProgress: { create: vi.fn() },
    Video: { countDocuments: vi.fn(), insertMany: vi.fn(), deleteMany: vi.fn() },
    Showcase: { countDocuments: vi.fn(), insertMany: vi.fn(), deleteMany: vi.fn() },
    Announcement: { countDocuments: vi.fn(), insertMany: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock("../../../src/models/User.js", () => ({ default: models.User }));
vi.mock("../../../src/models/TripPlan.js", () => ({ default: models.TripPlan }));
vi.mock("../../../src/models/TripDay.js", () => ({ default: models.TripDay }));
vi.mock("../../../src/models/Challenge.js", () => ({ default: models.Challenge }));
vi.mock("../../../src/models/UserChallengeProgress.js", () => ({ default: models.UserChallengeProgress }));
vi.mock("../../../src/models/Video.js", () => ({ default: models.Video }));
vi.mock("../../../src/models/Showcase.js", () => ({ default: models.Showcase }));
vi.mock("../../../src/models/Announcement.js", () => ({ default: models.Announcement }));

// env.js is read on import: each test loads the seed with its own settings
const loadWithEnv = async (env, file) => {
    vi.resetModules();
    vi.doMock("../../../src/config/env.js", () => ({ default: env }));
    return (await import(`../../../src/seed/${file}`)).default;
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
    vi.doUnmock("../../../src/config/env.js");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("seedAdmin", () => {
    it("skips without ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD", async () => {
        const seedAdmin = await loadWithEnv({ admin: { username: "admin", email: "", password: "x" } }, "seedAdmin.js");

        await seedAdmin();

        expect(models.User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("skipped"));
    });

    it("creates or updates the admin account with a hashed password", async () => {
        const seedAdmin = await loadWithEnv(
            { admin: { username: "Admin", email: "Admin@Aloca.vn", password: "s3cret!" } },
            "seedAdmin.js",
        );
        models.User.findOneAndUpdate.mockResolvedValue({ username: "admin" });

        await seedAdmin();

        const [filter, update, options] = models.User.findOneAndUpdate.mock.calls[0];
        expect(filter).toEqual({ username: "admin" });
        expect(update.$set).toMatchObject({ email: "admin@aloca.vn", role: "admin", isActive: "active", code: "" });
        expect(await bcrypt.compare("s3cret!", update.$set.password)).toBe(true);
        expect(update.$setOnInsert).toEqual({ fullname: "Aloca Admin" });
        expect(options).toEqual({ upsert: true, new: true });
        expect(console.log).toHaveBeenCalledWith("[seed:admin] admin account ready: admin");
    });
});

describe("seedContent", () => {
    beforeEach(() => {
        for (const model of [models.Video, models.Showcase, models.Announcement]) {
            model.countDocuments.mockResolvedValue(0);
        }
    });

    it("fills the empty collections: videos, home page pictures and published announcements", async () => {
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedContent.js");

        await seed();

        const [announcements] = models.Announcement.insertMany.mock.calls[0];
        expect(announcements.every((item) => item.status === "published" && item.publishAt <= new Date())).toBe(true);
        expect(models.Video.insertMany.mock.calls[0][0].some((video) => video.showOnHome)).toBe(true);
        expect(new Set(models.Showcase.insertMany.mock.calls[0][0].map((item) => item.kind))).toEqual(new Set(["banner", "suggestion"]));
    });

    it("is made of real YouTube videos and Commons photos, each used with its own details", async () => {
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedContent.js");

        await seed();

        const videos = models.Video.insertMany.mock.calls[0][0];
        expect(new Set(videos.map((video) => video.youtubeLink)).size).toBe(videos.length);
        expect(videos.every((video) => /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(video.youtubeLink) && video.durationSec > 0 && video.location)).toBe(true);
        const pictures = models.Showcase.insertMany.mock.calls[0][0];
        expect(pictures.every((item) => item.imageUrl.startsWith("https://upload.wikimedia.org/wikipedia/commons/thumb/"))).toBe(true);
        expect(pictures.filter((item) => item.kind === "suggestion").every((item) => item.location && item.title)).toBe(true);
    });

    it("with reset, empties the collections first and replaces them", async () => {
        models.Video.countDocuments.mockResolvedValue(5);
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedContent.js");

        await seed({ reset: true });

        for (const model of [models.Video, models.Showcase, models.Announcement]) {
            expect(model.deleteMany).toHaveBeenCalledWith({});
            expect(model.insertMany).toHaveBeenCalledOnce();
        }
    });

    it("never touches a collection that already has content", async () => {
        models.Video.countDocuments.mockResolvedValue(1);
        models.Showcase.countDocuments.mockResolvedValue(1);
        models.Announcement.countDocuments.mockResolvedValue(1);
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedContent.js");

        await seed();

        expect(models.Video.insertMany).not.toHaveBeenCalled();
        expect(models.Showcase.insertMany).not.toHaveBeenCalled();
        expect(models.Announcement.insertMany).not.toHaveBeenCalled();
    });
});

describe("seedSampleData", () => {
    beforeEach(() => {
        models.User.findOneAndUpdate.mockImplementation(async (filter) => ({ _id: `id-${filter.username}`, ...filter }));
        models.Video.countDocuments.mockResolvedValue(0);
        models.Showcase.countDocuments.mockResolvedValue(0);
        models.Announcement.countDocuments.mockResolvedValue(0);
        models.TripPlan.exists.mockResolvedValue(null);
        models.TripPlan.create.mockResolvedValue({ _id: "trip1" });
        models.TripDay.create.mockImplementation(async (d) => ({ _id: `day${d.day}` }));
        models.Challenge.create.mockImplementation(async (c) => ({ _id: `cha-${c.nameLocation}` }));
    });

    it("refuses to run in production without SEED_DEMO_PASSWORD", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedSampleData.js");

        await seed();

        expect(models.User.findOneAndUpdate).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("skipped"));
    });

    it("creates the travellers and the demo account (password demo123 outside production)", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        const seed = await loadWithEnv({ nodeEnv: "development" }, "seedSampleData.js");

        await seed();

        const usernames = models.User.findOneAndUpdate.mock.calls.map(([filter]) => filter.username);
        expect(usernames).toEqual(["minhbao", "thucuc", "duypham", "hoangyen", "demouser"]);
        const [, demoUpdate, options] = models.User.findOneAndUpdate.mock.calls[4];
        expect(demoUpdate.$set).toEqual({ fullname: "Tài khoản Demo", experience: 30, isActive: "active" });
        expect(demoUpdate.$setOnInsert).toMatchObject({ email: "demouser@aloca.local", role: "user" });
        expect(await bcrypt.compare("demo123", demoUpdate.$setOnInsert.password)).toBe(true);
        expect(options).toEqual({ upsert: true, new: true });
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("password: demo123"));
    });

    it("adds the sample videos only when there is none", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        const seed = await loadWithEnv({ nodeEnv: "development" }, "seedSampleData.js");

        await seed();
        expect(models.Video.insertMany).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ showOnHome: true })]));

        models.Video.insertMany.mockClear();
        models.Video.countDocuments.mockResolvedValue(3);
        await seed();
        expect(models.Video.insertMany).not.toHaveBeenCalled();
    });

    it("adds the home page pictures only when there is none", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        const seed = await loadWithEnv({ nodeEnv: "development" }, "seedSampleData.js");

        await seed();
        const [items] = models.Showcase.insertMany.mock.calls[0];
        expect(new Set(items.map((item) => item.kind))).toEqual(new Set(["banner", "suggestion"]));

        models.Showcase.insertMany.mockClear();
        models.Showcase.countDocuments.mockResolvedValue(2);
        await seed();
        expect(models.Showcase.insertMany).not.toHaveBeenCalled();
    });

    it("uses SEED_DEMO_PASSWORD without printing it", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "top-secret");
        const seed = await loadWithEnv({ nodeEnv: "production" }, "seedSampleData.js");

        await seed();

        const [, update] = models.User.findOneAndUpdate.mock.calls[0];
        expect(await bcrypt.compare("top-secret", update.$setOnInsert.password)).toBe(true);
        expect(console.log.mock.calls.flat().join(" ")).not.toContain("top-secret");
    });

    it("creates the sample trip with its days, challenges and progress", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        const seed = await loadWithEnv({ nodeEnv: "development" }, "seedSampleData.js");

        await seed();

        const [trip] = models.TripPlan.create.mock.calls[0];
        expect(trip).toMatchObject({
            userId: "id-demouser",
            nameTrip: "Đà Nẵng 2 ngày (mẫu)",
            location: "Đà Nẵng",
            transportCostTotal: 300000,
            foodCostTotal: 400000,
            otherCostTotal: 900000,
        });
        // starts in a week, lasts 2 days
        expect(Math.round((trip.startDate - Date.now()) / 86400000)).toBe(7);
        expect(trip.endDate.getDate()).toBe(new Date(trip.startDate.getTime() + 86400000).getDate());

        expect(models.TripDay.create.mock.calls.map(([d]) => [d.day, d.title])).toEqual([
            [0, "Khám phá bán đảo Sơn Trà"],
            [1, "Bà Nà Hills"],
        ]);
        expect(models.Challenge.create).toHaveBeenCalledTimes(3);
        // the challenge that has a photo is the completed one
        expect(models.UserChallengeProgress.create.mock.calls.map(([p]) => [p.chaId, p.completed])).toEqual([
            ["cha-Chùa Linh Ứng", false],
            ["cha-Bãi biển Mỹ Khê", true],
            ["cha-Cầu Vàng", false],
        ]);
    });

    it("does not create the sample trip twice", async () => {
        vi.stubEnv("SEED_DEMO_PASSWORD", "");
        models.TripPlan.exists.mockResolvedValue({ _id: "existing" });
        const seed = await loadWithEnv({ nodeEnv: "development" }, "seedSampleData.js");

        await seed();

        expect(models.TripPlan.exists).toHaveBeenCalledWith({
            userId: "id-demouser",
            nameTrip: "Đà Nẵng 2 ngày (mẫu)",
            status: { $ne: "delete" },
        });
        expect(models.TripPlan.create).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith("[seed:sample] sample trip already exists");
    });
});
