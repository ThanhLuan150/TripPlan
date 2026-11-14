// src/seed/index.js runs on import: `node src/seed/index.js <admin|sample|content|all>`
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    connectDatabase: vi.fn(),
    seedAdmin: vi.fn(),
    seedSampleData: vi.fn(),
    seedContent: vi.fn(),
    disconnect: vi.fn(),
}));

vi.mock("../../../src/config/db.js", () => ({ default: mocks.connectDatabase }));
vi.mock("../../../src/seed/seedAdmin.js", () => ({ default: mocks.seedAdmin }));
vi.mock("../../../src/seed/seedSampleData.js", () => ({ default: mocks.seedSampleData }));
vi.mock("../../../src/seed/seedContent.js", () => ({ default: mocks.seedContent }));
vi.mock("mongoose", () => ({ default: { disconnect: mocks.disconnect } }));

const argv = process.argv;

const run = async (target) => {
    process.argv = [argv[0], "src/seed/index.js", ...(target ? [target] : [])];
    vi.resetModules();
    await import("../../../src/seed/index.js");
    await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());
};

beforeEach(() => {
    vi.resetAllMocks();
    mocks.connectDatabase.mockResolvedValue();
    mocks.disconnect.mockResolvedValue();
});

afterEach(() => {
    process.argv = argv;
    process.exitCode = undefined;
    vi.restoreAllMocks();
});

describe("seed runner", () => {
    it("seeds the admin account by default", async () => {
        await run();

        expect(mocks.connectDatabase).toHaveBeenCalled();
        expect(mocks.seedAdmin).toHaveBeenCalledOnce();
        expect(mocks.seedSampleData).not.toHaveBeenCalled();
    });

    it("'sample' seeds the demo data only", async () => {
        await run("sample");

        expect(mocks.seedSampleData).toHaveBeenCalledOnce();
        expect(mocks.seedAdmin).not.toHaveBeenCalled();
    });

    it("'content' seeds the videos, pictures and announcements only", async () => {
        await run("content");

        expect(mocks.seedContent).toHaveBeenCalledOnce();
        expect(mocks.seedSampleData).not.toHaveBeenCalled();
        expect(mocks.seedAdmin).not.toHaveBeenCalled();
    });

    it("'content --reset' asks the content seed to replace what is there", async () => {
        process.argv = [argv[0], "src/seed/index.js", "content", "--reset"];
        vi.resetModules();
        await import("../../../src/seed/index.js");
        await vi.waitFor(() => expect(mocks.disconnect).toHaveBeenCalled());

        expect(mocks.seedContent).toHaveBeenCalledWith({ reset: true });
    });

    it("'all' runs both, admin first", async () => {
        const order = [];
        mocks.seedAdmin.mockImplementation(async () => order.push("admin"));
        mocks.seedSampleData.mockImplementation(async () => order.push("sample"));

        await run("all");

        expect(order).toEqual(["admin", "sample"]);
    });

    it("fails (exit code 1) on an unknown target, without touching the database", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        await run("everything");

        expect(mocks.connectDatabase).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Unknown seed "everything"') }));
        expect(process.exitCode).toBe(1);
    });

    it("fails and still disconnects when a seed throws", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.seedAdmin.mockRejectedValue(new Error("duplicate key"));

        await run("admin");

        expect(process.exitCode).toBe(1);
        expect(mocks.disconnect).toHaveBeenCalled();
    });
});
