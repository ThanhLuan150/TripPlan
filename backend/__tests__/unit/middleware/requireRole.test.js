import { describe, expect, it } from "vitest";
import requireRole from "../../../src/middleware/requireRole.js";
import HttpError from "../../../src/utils/HttpError.js";
import { mockReq, runMiddleware } from "../../helpers/http.js";

describe("requireRole", () => {
    it("lets an allowed role through", async () => {
        const err = await runMiddleware(requireRole("admin"), mockReq({ user: { role: "admin" } }));
        expect(err).toBeUndefined();
    });

    it("treats a user without role as 'user'", async () => {
        const err = await runMiddleware(requireRole("user", "admin"), mockReq({ user: {} }));
        expect(err).toBeUndefined();
    });

    it("answers 403 for any other role", async () => {
        const err = await runMiddleware(requireRole("admin"), mockReq({ user: { role: "user" } }));

        expect(err).toBeInstanceOf(HttpError);
        expect(err.status).toBe(403);
        expect(err.message).toBe("Permission denied");
    });

    it("answers 403 when there is no user at all and 'user' is not allowed", async () => {
        const err = await runMiddleware(requireRole("admin"), mockReq());
        expect(err.status).toBe(403);
    });
});
