import { beforeEach, describe, expect, it, vi } from "vitest";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/services/followService.js", () => ({ default: { getProfile: vi.fn(), follow: vi.fn(), unfollow: vi.fn() } }));

const { default: followService } = await import("../../../src/services/followService.js");
const { default: followController } = await import("../../../src/controllers/followController.js");

const user = { _id: "me" };
beforeEach(() => vi.resetAllMocks());

describe.each([["getProfile"], ["follow"], ["unfollow"]])("followController.%s", (name) => {
    it("passes the signed-in user and the :id param, and answers 200", async () => {
        followService[name].mockResolvedValue({ ok: true });

        const { res } = await callController(followController[name], mockReq({ user, params: { id: "other" }, body: { followerId: "evil" } }));

        expect(followService[name]).toHaveBeenCalledWith(user, "other");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("hands service errors to next()", async () => {
        const error = new Error("boom");
        followService[name].mockRejectedValue(error);

        const { err } = await callController(followController[name], mockReq({ user, params: { id: "x" } }));

        expect(err).toBe(error);
    });
});
