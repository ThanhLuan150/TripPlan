import { beforeEach, describe, expect, it, vi } from "vitest";
import authController from "../../../src/controllers/authController.js";
import authService from "../../../src/services/authService.js";
import HttpError from "../../../src/utils/HttpError.js";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/services/authService.js", () => ({
    default: {
        register: vi.fn(),
        confirmAccount: vi.fn(),
        refreshVerificationCode: vi.fn(),
        login: vi.fn(),
        forgotPassword: vi.fn(),
        verifyResetCode: vi.fn(),
        resetPassword: vi.fn(),
        refreshAccessToken: vi.fn(),
    },
}));

beforeEach(() => {
    vi.resetAllMocks();
});

describe("authController", () => {
    it.each([
        ["register", "register"],
        ["confirmAccount", "confirmAccount"],
        ["refreshVerificationCode", "refreshVerificationCode"],
        ["login", "login"],
        ["forgotPassword", "forgotPassword"],
        ["resetPassword", "resetPassword"],
    ])("%s passes the body to authService.%s and answers 200", async (handler, method) => {
        const body = { email: "a@b.vn", password: "x" };
        authService[method].mockResolvedValue({ message: "ok" });

        const { res, err } = await callController(authController[handler], mockReq({ body }));

        expect(err).toBeUndefined();
        expect(authService[method]).toHaveBeenCalledWith(body);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: "ok" });
    });

    it("verifyCodeResetPassword takes the code from the URL", async () => {
        authService.verifyResetCode.mockResolvedValue({ message: "ok" });

        await callController(
            authController.verifyCodeResetPassword,
            mockReq({ params: { token: "123456" }, body: { email: "a@b.vn" } }),
        );

        expect(authService.verifyResetCode).toHaveBeenCalledWith({ email: "a@b.vn", code: "123456" });
    });

    it("refreshToken prefers the token in the URL", async () => {
        authService.refreshAccessToken.mockResolvedValue({ accessToken: "new" });

        await callController(
            authController.refreshToken,
            mockReq({ params: { token: "from-url" }, headers: { authorization: "Bearer from-header" } }),
        );

        expect(authService.refreshAccessToken).toHaveBeenCalledWith("from-url");
    });

    it("refreshToken falls back to the Authorization header", async () => {
        authService.refreshAccessToken.mockResolvedValue({ accessToken: "new" });

        await callController(authController.refreshToken, mockReq({ headers: { authorization: "Bearer from-header" } }));
        expect(authService.refreshAccessToken).toHaveBeenLastCalledWith("from-header");

        await callController(authController.refreshToken, mockReq());
        expect(authService.refreshAccessToken).toHaveBeenLastCalledWith(undefined);
    });

    it("forwards service errors to the error handler", async () => {
        const failure = new HttpError(401, "Incorrect password");
        authService.login.mockRejectedValue(failure);

        const { res, err } = await callController(authController.login, mockReq({ body: {} }));

        expect(err).toBe(failure);
        expect(res.json).not.toHaveBeenCalled();
    });
});
