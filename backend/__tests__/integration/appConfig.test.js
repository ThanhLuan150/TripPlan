// app.js settings that depend on the environment (CORS allow-list, logging).
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    isDatabaseConnected: () => true,
    isDatabaseDown: () => false,
    describeDbError: (e) => e.message,
}));
// only the app-level middleware matters here (models must not be compiled twice)
vi.mock("../../src/routes/index.js", async () => {
    const { Router } = await import("express");
    return { default: Router() };
});

const loadApp = async (env) => {
    vi.resetModules();
    vi.doMock("../../src/config/env.js", () => ({ default: env }));
    return (await import("../../src/app.js")).default;
};

afterEach(() => {
    vi.doUnmock("../../src/config/env.js");
    vi.restoreAllMocks();
});

describe("CORS", () => {
    it("only allows the origins listed in CORS_ORIGIN", async () => {
        const app = await loadApp({ nodeEnv: "test", corsOrigin: "https://aloca.vn, https://admin.aloca.vn" });

        const allowed = await request(app).get("/health").set("Origin", "https://admin.aloca.vn");
        const other = await request(app).get("/health").set("Origin", "https://evil.example");

        expect(allowed.headers["access-control-allow-origin"]).toBe("https://admin.aloca.vn");
        expect(other.headers["access-control-allow-origin"]).toBeUndefined();
    });
});

describe("request logging", () => {
    it("logs requests in the Apache 'combined' format in production", async () => {
        const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const app = await loadApp({ nodeEnv: "production", corsOrigin: "*" });

        await request(app).get("/health").set("User-Agent", "vitest-agent");

        const lines = write.mock.calls.map(([chunk]) => String(chunk)).join("");
        expect(lines).toMatch(/"GET \/health HTTP\/1\.1" 200 .* "vitest-agent"/);
    });

    it("uses the short 'dev' format in development", async () => {
        const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
        const app = await loadApp({ nodeEnv: "development", corsOrigin: "*" });

        await request(app).get("/health");

        const lines = write.mock.calls.map(([chunk]) => String(chunk)).join("");
        expect(lines).toMatch(/GET \/health .*200/);
        expect(lines).not.toContain("HTTP/1.1");
    });
});
