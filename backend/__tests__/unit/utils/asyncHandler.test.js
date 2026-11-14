import { describe, expect, it, vi } from "vitest";
import asyncHandler from "../../../src/utils/asyncHandler.js";
import { mockReq, mockRes, runMiddleware } from "../../helpers/http.js";

describe("asyncHandler", () => {
    it("passes req, res and next to the wrapped function", async () => {
        const fn = vi.fn(async (req, res, next) => next());
        const req = mockReq();
        const res = mockRes();

        await expect(runMiddleware(asyncHandler(fn), req, res)).resolves.toBeUndefined();
        expect(fn).toHaveBeenCalledWith(req, res, expect.any(Function));
    });

    it("forwards a rejected promise to next()", async () => {
        const boom = new Error("boom");
        const handler = asyncHandler(async () => {
            throw boom;
        });

        await expect(runMiddleware(handler, mockReq())).resolves.toBe(boom);
    });

    it("also handles synchronous functions", async () => {
        const handler = asyncHandler((req, res) => res.json({ ok: true }));
        const res = mockRes();
        handler(mockReq(), res, vi.fn());

        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
});
