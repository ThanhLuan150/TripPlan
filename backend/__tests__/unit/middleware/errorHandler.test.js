import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../../../src/middleware/errorHandler.js";
import HttpError from "../../../src/utils/HttpError.js";
import { mockReq, mockRes } from "../../helpers/http.js";

const handle = (err) => {
    const res = mockRes();
    errorHandler(err, mockReq({ method: "POST", originalUrl: "/trip-plan" }), res, vi.fn());
    return res;
};

describe("notFound", () => {
    it("forwards a 404 naming the route", () => {
        const next = vi.fn();
        notFound(mockReq({ method: "DELETE", originalUrl: "/nope?x=1" }), mockRes(), next);

        const [err] = next.mock.calls[0];
        expect(err).toBeInstanceOf(HttpError);
        expect(err.status).toBe(404);
        expect(err.message).toBe("Not found: DELETE /nope?x=1");
    });
});

describe("errorHandler", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("sends an HttpError with its status and extra fields", () => {
        const res = handle(new HttpError(409, "Taken", { field: "email" }));

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: "Taken", field: "email" });
    });

    it("turns an invalid ObjectId into 400", () => {
        const res = handle(new mongoose.Error.CastError("ObjectId", "abc", "_id"));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid _id" });
    });

    it("turns a schema validation error into 400", () => {
        const res = handle(new mongoose.Error.ValidationError());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining("Validation failed") });
    });

    it("turns a malformed JSON body into 400", () => {
        const res = handle(Object.assign(new SyntaxError("Unexpected token"), { type: "entity.parse.failed" }));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid JSON body" });
    });

    it.each([
        Object.assign(new Error("Server selection timed out"), { name: "MongooseServerSelectionError" }),
        Object.assign(new Error("socket closed"), { name: "MongoNetworkError" }),
        new Error("Operation `users.findOne()` buffering timed out after 10000ms"),
    ])("answers 503 when MongoDB is unreachable (%s)", (err) => {
        const res = handle(err);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith({ message: "Database unavailable" });
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[db] POST /trip-plan"));
    });

    it("also handles a thrown value that is not an Error", () => {
        const res = handle("boom");

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
    });

    it("hides unexpected errors behind a generic 500", () => {
        const err = new TypeError("Cannot read properties of undefined");
        const res = handle(err);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal Server Error" });
        expect(console.log).toHaveBeenCalledWith(err);
    });
});
