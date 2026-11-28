import { beforeEach, describe, expect, it, vi } from "vitest";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/services/savedPostService.js", () => ({ default: { save: vi.fn(), unsave: vi.fn(), listSaved: vi.fn() } }));

const { default: savedPostService } = await import("../../../src/services/savedPostService.js");
const { default: savedPostController } = await import("../../../src/controllers/savedPostController.js");

const user = { _id: "me" };
beforeEach(() => vi.resetAllMocks());

describe.each([["save"], ["unsave"]])("savedPostController.%s", (name) => {
    it("passes the signed-in user and the :id param, and answers 200", async () => {
        savedPostService[name].mockResolvedValue({ ok: true });

        const { res } = await callController(savedPostController[name], mockReq({ user, params: { id: "post" }, body: { userId: "evil" } }));

        expect(savedPostService[name]).toHaveBeenCalledWith(user, "post");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("hands service errors to next()", async () => {
        const error = new Error("boom");
        savedPostService[name].mockRejectedValue(error);

        const { err } = await callController(savedPostController[name], mockReq({ user, params: { id: "x" } }));

        expect(err).toBe(error);
    });
});

describe("savedPostController.listSaved", () => {
    it("lists the signed-in user's posts only (the caller is never read from the request), never cached", async () => {
        savedPostService.listSaved.mockResolvedValue({ items: [] });

        const { res } = await callController(
            savedPostController.listSaved,
            mockReq({ user, query: { page: "2" }, params: { userId: "evil" }, body: { userId: "evil" } }),
        );

        expect(savedPostService.listSaved).toHaveBeenCalledWith(user, { page: "2" });
        expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("hands service errors to next()", async () => {
        const error = new Error("boom");
        savedPostService.listSaved.mockRejectedValue(error);

        const { err } = await callController(savedPostController.listSaved, mockReq({ user }));

        expect(err).toBe(error);
    });
});
