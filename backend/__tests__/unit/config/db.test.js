import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import connectDatabase, {
    connectDatabaseWithRetry,
    describeDbError,
    isDatabaseConnected,
    isDatabaseDown,
} from "../../../src/config/db.js";

// readyState is a non-configurable accessor (no spy possible): use its setter
// (0 disconnected, 1 connected, 2 connecting) and reset it after each test.
const setReadyState = (state) => {
    mongoose.connection.readyState = state;
};

afterEach(() => {
    setReadyState(0);
});

describe("describeDbError", () => {
    it.each([
        ["Could not connect: IP that isn't whitelisted", /add this machine's public IP/],
        ["SSL routines: tlsv1 alert internal error", /add this machine's public IP/],
        ["querySrv ENOTFOUND _mongodb._tcp.cluster0.xxx.mongodb.net", /host not found/],
        ["bad auth : Authentication failed.", /authentication failed/],
    ])("explains %j", (message, expected) => {
        expect(describeDbError(new Error(message))).toMatch(expected);
    });

    it("also looks at the errors of each server of a selection error", () => {
        const err = new Error("Server selection timed out");
        err.reason = {
            servers: new Map([
                ["host-a:27017", {}], // no error recorded for this one
                ["host-b:27017", { error: { message: "SSL alert number 80" } }],
            ]),
        };

        expect(describeDbError(err)).toMatch(/Network Access/);
    });

    it("falls back to the raw message", () => {
        expect(describeDbError(new Error("connection reset"))).toBe("connection reset");
        expect(describeDbError("plain string")).toBe("plain string");
    });
});

describe("connection state", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("is connected only when readyState is 1", () => {
        setReadyState(1);
        expect(isDatabaseConnected()).toBe(true);
        expect(isDatabaseDown()).toBe(false);

        setReadyState(0);
        expect(isDatabaseConnected()).toBe(false);
        expect(isDatabaseDown()).toBe(true);
    });
});

describe("connectDatabase / connectDatabaseWithRetry", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("refuses to connect without MONGODB_URI", async () => {
        vi.resetModules();
        vi.doMock("../../../src/config/env.js", () => ({ default: { mongodbUri: undefined } }));
        const { default: connect } = await import("../../../src/config/db.js");

        await expect(connect()).rejects.toThrow("Missing MONGODB_URI in .env");
        vi.doUnmock("../../../src/config/env.js");
    });

    it("uses MONGODB_DB_NAME when set", async () => {
        vi.resetModules();
        vi.doMock("../../../src/config/env.js", () => ({ default: { mongodbUri: "mongodb://db", mongodbDbName: "aloca" } }));
        const { default: freshMongoose } = await import("mongoose");
        const spy = vi.spyOn(freshMongoose, "connect").mockResolvedValue(freshMongoose);
        const { default: connect } = await import("../../../src/config/db.js");

        await connect();

        expect(spy).toHaveBeenCalledWith("mongodb://db", expect.objectContaining({ dbName: "aloca" }));
        vi.doUnmock("../../../src/config/env.js");
    });

    it("connects with MONGODB_URI", async () => {
        const connect = vi.spyOn(mongoose, "connect").mockResolvedValue(mongoose);

        await connectDatabase();

        expect(connect).toHaveBeenCalledWith(
            "mongodb://127.0.0.1:27017/aloca-test",
            expect.objectContaining({ retryWrites: true, w: "majority" }),
        );
    });

    it("retries every 10s until the database answers", async () => {
        const connect = vi
            .spyOn(mongoose, "connect")
            .mockRejectedValueOnce(new Error("querySrv ENOTFOUND cluster"))
            .mockResolvedValueOnce(mongoose);
        setReadyState(2); // "connecting": only the last error tells it is down

        await connectDatabaseWithRetry();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("host not found"));
        expect(isDatabaseDown()).toBe(true);

        await vi.advanceTimersByTimeAsync(10000);
        expect(connect).toHaveBeenCalledTimes(2);
        expect(isDatabaseDown()).toBe(false);
    });
});
