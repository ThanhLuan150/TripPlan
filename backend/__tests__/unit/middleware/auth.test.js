import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authenticate from "../../../src/middleware/auth.js";
import userRepository from "../../../src/repositories/userRepository.js";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../../../src/utils/jwt.js";
import { mockReq, mockRes, runMiddleware } from "../../helpers/http.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn() } }));

const userId = "64b000000000000000000001";
const activeUser = (extra = {}) => ({
    _id: userId,
    isActive: "active",
    refreshToken: generateRefreshToken({ _id: userId }),
    ...extra,
});
const bearer = (token) => mockReq({ headers: { authorization: `Bearer ${token}` } });
const expiredAccessToken = () =>
    jwt.sign({ userId, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.ACCESS_TOKEN_SECRET);

describe("authenticate", () => {
    beforeEach(() => {
        userRepository.findById.mockReset();
    });

    it("rejects a request without Authorization header", async () => {
        const err = await runMiddleware(authenticate, mockReq());

        expect(err).toMatchObject({ status: 401, message: "Your token not found" });
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it("rejects an invalid token", async () => {
        const err = await runMiddleware(authenticate, bearer("nope"));
        expect(err).toMatchObject({ status: 401, message: "Invalid token" });
    });

    it.each([
        ["unknown", null],
        ["not activated", { isActive: "notActive" }],
        ["deleted", { isActive: "delete" }],
    ])("rejects a %s user", async (label, user) => {
        userRepository.findById.mockResolvedValue(user && activeUser(user));

        const err = await runMiddleware(authenticate, bearer(generateAccessToken({ _id: userId })));
        expect(err).toMatchObject({ status: 401, message: "User not found" });
    });

    it("loads the user onto req for a valid token", async () => {
        const user = activeUser();
        userRepository.findById.mockResolvedValue(user);
        const req = bearer(generateAccessToken(user));
        const res = mockRes();

        const err = await runMiddleware(authenticate, req, res);

        expect(err).toBeUndefined();
        expect(userRepository.findById).toHaveBeenCalledWith(userId);
        expect(req.user).toBe(user);
        expect(req.userData).toBe(user);
        expect(res.setHeader).not.toHaveBeenCalled();
    });

    it("sends a fresh access token when it expired but the refresh token is valid", async () => {
        userRepository.findById.mockResolvedValue(activeUser());
        const res = mockRes();

        const err = await runMiddleware(authenticate, bearer(expiredAccessToken()), res);

        expect(err).toBeUndefined();
        const [name, value] = res.setHeader.mock.calls[0];
        expect(name).toBe("Authorization");
        expect(verifyAccessToken(value.replace("Bearer ", ""))).toMatchObject({ userId, exp: false });
    });

    it.each([
        ["no refresh token", undefined],
        ["an expired refresh token", jwt.sign({ userId, exp: 1 }, process.env.REFRESH_TOKEN_SECRET)],
    ])("asks to log in again with %s", async (label, refreshToken) => {
        userRepository.findById.mockResolvedValue(activeUser({ refreshToken }));

        const err = await runMiddleware(authenticate, bearer(expiredAccessToken()));
        expect(err).toMatchObject({ status: 401, message: "Your session has expired, please log in again" });
    });
});
