// src/server.js: starts listening and connects to MongoDB (with retries).
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    listen: vi.fn((port, callback) => callback()),
    connectDatabaseWithRetry: vi.fn(),
}));

vi.mock("../../src/app.js", () => ({ default: { listen: mocks.listen } }));
vi.mock("../../src/config/db.js", () => ({ connectDatabaseWithRetry: mocks.connectDatabaseWithRetry }));

describe("server", () => {
    it("listens on PORT and connects to the database", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});

        await import("../../src/server.js");

        // PORT=0 in the test settings -> default 8080
        expect(mocks.listen).toHaveBeenCalledWith(8080, expect.any(Function));
        expect(log).toHaveBeenCalledWith("Listening at 8080");
        expect(mocks.connectDatabaseWithRetry).toHaveBeenCalledOnce();
    });
});
