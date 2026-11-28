import { beforeEach, describe, expect, it, vi } from "vitest";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/services/postLikeService.js", () => ({ default: { like: vi.fn(), unlike: vi.fn() } }));

const { default: postLikeService } = await import("../../../src/services/postLikeService.js");
const { default: postLikeController } = await import("../../../src/controllers/postLikeController.js");

const user = { _id: "me" };
beforeEach(() => vi.resetAllMocks());

describe.each([["like"], ["unlike"]])("postLikeController.%s", (name) => {
    it("passes the signed-in user and the :id param, and answers 200", async () => {
        postLikeService[name].mockResolvedValue({ ok: true });

        const { res } = await callController(postLikeController[name], mockReq({ user, params: { id: "post" }, body: { userId: "evil" } }));

        expect(postLikeService[name]).toHaveBeenCalledWith(user, "post");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("hands service errors to next()", async () => {
        const error = new Error("boom");
        postLikeService[name].mockRejectedValue(error);

        const { err } = await callController(postLikeController[name], mockReq({ user, params: { id: "x" } }));

        expect(err).toBe(error);
    });
});
