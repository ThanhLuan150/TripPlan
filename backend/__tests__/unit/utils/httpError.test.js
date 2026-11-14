import { describe, expect, it } from "vitest";
import HttpError from "../../../src/utils/HttpError.js";

describe("HttpError", () => {
    it("carries the status, message and extra body", () => {
        const err = new HttpError(404, "Not here", { code: "MISSING" });

        expect(err).toBeInstanceOf(Error);
        expect(err.status).toBe(404);
        expect(err.message).toBe("Not here");
        expect(err.body).toEqual({ code: "MISSING" });
    });

    it("defaults the extra body to an empty object", () => {
        expect(new HttpError(400, "Bad").body).toEqual({});
    });
});
