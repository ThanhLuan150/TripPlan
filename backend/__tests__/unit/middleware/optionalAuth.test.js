import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import optionalAuth from "../../../src/middleware/optionalAuth.js";
import userRepository from "../../../src/repositories/userRepository.js";
import { generateAccessToken } from "../../../src/utils/jwt.js";
import { mockReq, runMiddleware } from "../../helpers/http.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn() } }));

const userId = "64b000000000000000000001";
const bearer = (token) => mockReq({ headers: { authorization: `Bearer ${token}` } });

beforeEach(() => vi.resetAllMocks());

describe("optionalAuth", () => {
    it("lets a request without a token through as anonymous", async () => {
        const req = mockReq();

        expect(await runMiddleware(optionalAuth, req)).toBeUndefined();
        expect(req.user).toBeUndefined();
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it("sets req.user for a valid token of an active account", async () => {
        userRepository.findById.mockResolvedValue({ _id: userId, isActive: "active" });
        const req = bearer(generateAccessToken({ _id: userId }));

        expect(await runMiddleware(optionalAuth, req)).toBeUndefined();
        expect(req.user).toMatchObject({ _id: userId });
    });

    it.each([
        ["an invalid token", () => "nope"],
        ["an expired token", () => jwt.sign({ userId, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.ACCESS_TOKEN_SECRET)],
    ])("stays anonymous (never an error) for %s", async (_n, token) => {
        const req = bearer(token());

        expect(await runMiddleware(optionalAuth, req)).toBeUndefined();
        expect(req.user).toBeUndefined();
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it.each([["unknown", null], ["suspended", { isActive: "suspended" }]])("stays anonymous for a %s account", async (_n, account) => {
        userRepository.findById.mockResolvedValue(account);
        const req = bearer(generateAccessToken({ _id: userId }));

        expect(await runMiddleware(optionalAuth, req)).toBeUndefined();
        expect(req.user).toBeUndefined();
    });

    it("stays anonymous when the database fails", async () => {
        userRepository.findById.mockRejectedValue(new Error("down"));
        const req = bearer(generateAccessToken({ _id: userId }));

        expect(await runMiddleware(optionalAuth, req)).toBeUndefined();
        expect(req.user).toBeUndefined();
    });
});
