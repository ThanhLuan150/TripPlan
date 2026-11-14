import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import contentRepository from "../../../src/repositories/contentRepository.js";
import activityLogService from "../../../src/services/activityLogService.js";

vi.mock("../../../src/repositories/contentRepository.js", () => ({ default: { createLog: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("activityLogService.record", () => {
    it("writes an entry named after the actor", async () => {
        await activityLogService.record({
            actor: { _id: "u1", fullname: "Lan" },
            action: "login",
            target: "x".repeat(300),
            ip: "1.2.3.4",
        });

        expect(contentRepository.createLog).toHaveBeenCalledWith({
            actorId: "u1",
            actorName: "Lan",
            action: "login",
            target: "x".repeat(200),
            ip: "1.2.3.4",
            level: "info",
        });
    });

    it("falls back to the username, then to an explicit name, then to nothing", async () => {
        await activityLogService.record({ actor: { _id: "u1", username: "lan" }, action: "login" });
        await activityLogService.record({ actorName: "typed", action: "login" });
        await activityLogService.record({ action: "login", target: null });

        const names = contentRepository.createLog.mock.calls.map(([entry]) => entry.actorName);
        expect(names).toEqual(["lan", "typed", ""]);
        expect(contentRepository.createLog.mock.calls[2][0].target).toBe("");
    });

    it("never throws: logging must not break the request it describes", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        contentRepository.createLog.mockRejectedValue(new Error("db down"));

        await expect(activityLogService.record({ action: "login" })).resolves.toBeUndefined();

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("db down"));
    });
});
