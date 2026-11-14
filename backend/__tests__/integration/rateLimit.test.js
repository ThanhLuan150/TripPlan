// The real routers with the limits switched on (they are off in the other
// tests): every route is limited, the sign-in routes more strictly, and the
// routes share one count.
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(() => true),
    isDatabaseDown: vi.fn(() => false),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/services/contentService.js", () => ({
    default: {
        getPublicHome: vi.fn().mockResolvedValue({ banners: [], suggestions: [] }),
        listPublicVideos: vi.fn().mockResolvedValue([]),
        getSettings: vi.fn().mockResolvedValue({}),
    },
}));
vi.mock("../../src/services/authService.js", () => ({
    default: { login: vi.fn().mockResolvedValue({ message: "ok" }) },
}));
vi.mock("../../src/config/env.js", async (importOriginal) => {
    const original = (await importOriginal()).default;
    return { default: { ...original, nodeEnv: "production", rateLimitMax: 3, rateLimitAuthMax: 1 } };
});

let app;
beforeAll(async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    app = (await import("../../src/app.js")).default;
});

describe("rate limits on the real routes", () => {
    it("the sign-in routes have their own, stricter limit", async () => {
        await request(app).post("/auth/login").send({ username: "a", password: "b" }).expect(200);
        const blocked = await request(app).post("/auth/login").send({ username: "a", password: "b" });

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ message: "Too many requests, please try again later" });
    });

    it("the other routes share one limit, and /health is never limited", async () => {
        await request(app).get("/home").expect(200);
        await request(app).get("/videos").expect(200);
        await request(app).get("/settings").expect(200);
        // the fourth request, to any of them
        await request(app).get("/videos").expect(429);
        await request(app).get("/home").expect(429);

        for (let i = 0; i < 5; i++) {
            expect((await request(app).get("/health")).status).not.toBe(429);
        }
    });

    it("an admin route is limited before it asks who you are", async () => {
        // the limit of the previous test is used up: 429 and not 401 (no token)
        expect((await request(app).get("/admin/users")).status).toBe(429);
    });
});
