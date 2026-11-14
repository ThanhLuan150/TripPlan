import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
} from "../../../src/utils/jwt.js";

const user = { _id: "64b000000000000000000001" };
const ACCESS = process.env.ACCESS_TOKEN_SECRET;
const REFRESH = process.env.REFRESH_TOKEN_SECRET;

// a token that expired one minute ago
const expired = (secret) =>
    jwt.sign({ userId: user._id, exp: Math.floor(Date.now() / 1000) - 60 }, secret);

describe("access tokens", () => {
    it("round-trips the user id", () => {
        const decoded = verifyAccessToken(generateAccessToken(user));
        expect(decoded).toMatchObject({ userId: user._id, exp: false });
    });

    it("expires after 3 hours", () => {
        const { iat, exp } = jwt.decode(generateAccessToken(user));
        expect(exp - iat).toBe(3 * 60 * 60);
    });

    it("reports an expired token with its user id (so it can be refreshed)", () => {
        expect(verifyAccessToken(expired(ACCESS))).toEqual({ exp: true, userId: user._id });
    });

    it("returns null for a missing, malformed or foreign token", () => {
        expect(verifyAccessToken(undefined)).toBeNull();
        expect(verifyAccessToken("not-a-jwt")).toBeNull();
        expect(verifyAccessToken(jwt.sign({ userId: user._id }, "another-secret"))).toBeNull();
        // a refresh token is not an access token
        expect(verifyAccessToken(generateRefreshToken(user))).toBeNull();
    });
});

describe("refresh tokens", () => {
    it("round-trips the user id and reports it as not expired", () => {
        // regression: the raw JWT payload has a numeric `exp`, which callers
        // (`if (refresh.exp)`) took for "expired"
        expect(verifyRefreshToken(generateRefreshToken(user))).toMatchObject({ userId: user._id, exp: false });
    });

    it("lasts 30 days", () => {
        const { iat, exp } = jwt.decode(generateRefreshToken(user));
        expect(exp - iat).toBe(30 * 24 * 60 * 60);
    });

    it("returns { exp: true } when expired", () => {
        expect(verifyRefreshToken(expired(REFRESH))).toEqual({ exp: true });
    });

    it("returns null for a missing or invalid token", () => {
        expect(verifyRefreshToken(null)).toBeNull();
        expect(verifyRefreshToken("garbage")).toBeNull();
    });
});
