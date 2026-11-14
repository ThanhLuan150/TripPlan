import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authService from "../../../src/services/authService.js";
import userRepository from "../../../src/repositories/userRepository.js";
import { sendVerificationCodeEmail } from "../../../src/utils/mailer.js";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../../../src/utils/jwt.js";
import { doc } from "../../helpers/http.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({
    default: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        findByUsername: vi.fn(),
        findByCode: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
    },
}));
vi.mock("../../../src/utils/mailer.js", () => ({ sendVerificationCodeEmail: vi.fn() }));

const USER_ID = "64b000000000000000000001";
let passwordHash;

beforeAll(async () => {
    passwordHash = await bcrypt.hash("secret123", 4);
});

beforeEach(() => {
    vi.resetAllMocks();
});

const user = (extra = {}) =>
    doc({
        _id: USER_ID,
        username: "traveler",
        email: "traveler@example.com",
        password: passwordHash,
        isActive: "active",
        code: "123456",
        role: "user",
        experience: 40,
        ...extra,
    });

describe("register", () => {
    const input = { username: "Traveler", email: "traveler@example.com", password: "secret123", confirmPassword: "secret123" };

    it.each([
        [{ ...input, username: "" }, "Username, email or password not found"],
        [{ ...input, email: undefined }, "Username, email or password not found"],
        [{ ...input, confirmPassword: "other" }, "Pasword and Confirm Password do not match"],
    ])("rejects incomplete or mismatching input", async (body, message) => {
        await expect(authService.register(body)).rejects.toMatchObject({ status: 401, message });
        expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an email that already has an account", async () => {
        userRepository.findByEmail.mockResolvedValue(user());

        await expect(authService.register(input)).rejects.toMatchObject({ status: 401, body: { field: "email" } });
    });

    it("rejects a username used by another account", async () => {
        userRepository.findByUsername.mockResolvedValue(user({ _id: "someone-else" }));

        await expect(authService.register(input)).rejects.toMatchObject({ status: 401, body: { field: "username" } });
    });

    it("creates the account with a hashed password and emails a code", async () => {
        const result = await authService.register(input);

        const [created] = userRepository.create.mock.calls[0];
        expect(created).toMatchObject({ username: "Traveler", email: input.email, code: expect.stringMatching(/^\d{6}$/) });
        expect(created.password).not.toBe("secret123");
        expect(await bcrypt.compare("secret123", created.password)).toBe(true);
        expect(sendVerificationCodeEmail).toHaveBeenCalledWith(input.email, created.code);
        expect(result).toEqual({ message: expect.stringContaining("Registration successful"), email: input.email });
    });

    it("re-registers an account whose email was never confirmed", async () => {
        const pending = user({ isActive: "notActive" });
        userRepository.findByEmail.mockResolvedValue(pending);
        userRepository.findByUsername.mockResolvedValue(pending); // same account: allowed

        await authService.register(input);

        expect(userRepository.create).not.toHaveBeenCalled();
        expect(userRepository.updateById).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ username: "traveler" }));
        expect(sendVerificationCodeEmail).toHaveBeenCalledOnce();
    });
});

describe("confirmAccount", () => {
    it("rejects a missing code without querying", async () => {
        await expect(authService.confirmAccount({ email: "a@b.c" })).rejects.toMatchObject({ status: 401 });
        expect(userRepository.findByCode).not.toHaveBeenCalled();
    });

    it("rejects a wrong code", async () => {
        userRepository.findByCode.mockResolvedValue(null);
        await expect(authService.confirmAccount({ email: "a@b.c", code: "000000" })).rejects.toMatchObject({
            status: 401,
            message: "Your code is not correct",
        });
    });

    it("activates the account and clears the code", async () => {
        userRepository.findByCode.mockResolvedValue(user({ isActive: "notActive" }));

        await authService.confirmAccount({ email: "traveler@example.com", code: "123456" });

        expect(userRepository.findByCode).toHaveBeenCalledWith("123456", "traveler@example.com");
        expect(userRepository.updateById).toHaveBeenCalledWith(USER_ID, { isActive: "active", code: "" });
    });
});

describe("refreshVerificationCode", () => {
    it("rejects an unknown email", async () => {
        await expect(authService.refreshVerificationCode({ email: "x@y.z" })).rejects.toMatchObject({ status: 401 });
    });

    it("stores and emails a new code to that same user", async () => {
        userRepository.findByEmail.mockResolvedValue(user());

        await authService.refreshVerificationCode({ email: "traveler@example.com" });

        const [id, { code }] = userRepository.updateById.mock.calls[0];
        expect(id).toBe(USER_ID);
        expect(sendVerificationCodeEmail).toHaveBeenCalledWith("traveler@example.com", code);
    });
});

describe("login", () => {
    it.each([
        [null, 404, "The account is not registered"],
        [{ isActive: "delete" }, 400, "The account has been deleted"],
        [{ isActive: "notActive" }, 404, "Unverified account"],
    ])("rejects account state %j", async (state, status, message) => {
        userRepository.findByUsername.mockResolvedValue(state && user(state));

        await expect(authService.login({ username: "traveler", password: "secret123" })).rejects.toMatchObject({ status, message });
    });

    it("rejects a missing or wrong password", async () => {
        userRepository.findByUsername.mockResolvedValue(user());

        await expect(authService.login({ username: "traveler" })).rejects.toMatchObject({ status: 404 });
        await expect(authService.login({ username: "traveler", password: "wrong" })).rejects.toMatchObject({
            status: 401,
            message: "Incorrect password",
        });
    });

    it("returns an access token and the public profile only", async () => {
        userRepository.findByUsername.mockResolvedValue(user());
        userRepository.updateById.mockImplementation(async (id, update) => user(update));

        const result = await authService.login({ username: "traveler", password: "secret123", fcmToken: "device-1" });

        expect(verifyAccessToken(result.accessToken)).toMatchObject({ userId: USER_ID, exp: false });
        const [, update] = userRepository.updateById.mock.calls[0];
        expect(update).toEqual({ refreshToken: expect.any(String), fcmToken: "device-1" });
        expect(result.data).toEqual({ username: "traveler", email: "traveler@example.com", role: "user", experience: 40, fcmToken: "device-1" });
    });

    it("keeps the stored fcmToken when none is sent", async () => {
        userRepository.findByUsername.mockResolvedValue(user());
        userRepository.updateById.mockResolvedValue(user());

        await authService.login({ username: "traveler", password: "secret123" });

        expect(userRepository.updateById.mock.calls[0][1]).not.toHaveProperty("fcmToken");
    });
});

describe("forgot / reset password", () => {
    it.each([
        [null, "The email is not exist"],
        [{ isActive: "notActive" }, "Your account not active"],
        [{ isActive: "delete" }, "Your account not exist"],
    ])("forgotPassword rejects account state %j", async (state, message) => {
        userRepository.findByEmail.mockResolvedValue(state && user(state));
        await expect(authService.forgotPassword({ email: "traveler@example.com" })).rejects.toMatchObject({ status: 401, message });
    });

    it("forgotPassword emails a code and closes any open reset window", async () => {
        userRepository.findByEmail.mockResolvedValue(user());

        await authService.forgotPassword({ email: "traveler@example.com" });

        expect(userRepository.updateById).toHaveBeenCalledWith(USER_ID, { code: expect.stringMatching(/^\d{6}$/), resetPasswordExpires: null });
        expect(sendVerificationCodeEmail).toHaveBeenCalledOnce();
    });

    it("verifyResetCode rejects an unknown email or a wrong code", async () => {
        await expect(authService.verifyResetCode({ email: "x@y.z", code: "123456" })).rejects.toMatchObject({ status: 401 });

        userRepository.findByEmail.mockResolvedValue(user());
        await expect(authService.verifyResetCode({ email: "traveler@example.com", code: "999999" })).rejects.toMatchObject({
            message: "Your code is incorect",
        });
        await expect(authService.verifyResetCode({ email: "traveler@example.com", code: "" })).rejects.toMatchObject({ status: 401 });
    });

    it("verifyResetCode opens a 15 minute window and burns the code", async () => {
        userRepository.findByEmail.mockResolvedValue(user());
        const before = Date.now();

        const result = await authService.verifyResetCode({ email: "traveler@example.com", code: "123456" });

        const [, update] = userRepository.updateById.mock.calls[0];
        expect(update.code).toBe("");
        expect(update.resetPasswordExpires.getTime() - before).toBeGreaterThanOrEqual(15 * 60 * 1000);
        expect(update.resetPasswordExpires.getTime() - before).toBeLessThan(15 * 60 * 1000 + 5000);
        expect(result.userId).toBe(USER_ID);
    });

    it("resetPassword requires a verified code inside the window", async () => {
        await expect(authService.resetPassword({ email: "x@y.z" })).rejects.toMatchObject({ message: "The account is not exist" });

        userRepository.findByEmail.mockResolvedValue(user({ resetPasswordExpires: null }));
        await expect(authService.resetPassword({ email: "traveler@example.com", password: "a", confirmPassword: "a" })).rejects.toMatchObject({
            message: "Please verify the code sent to your email first",
        });

        userRepository.findByEmail.mockResolvedValue(user({ resetPasswordExpires: new Date(Date.now() - 1000) }));
        await expect(authService.resetPassword({ email: "traveler@example.com", password: "a", confirmPassword: "a" })).rejects.toMatchObject({
            status: 401,
        });
        expect(userRepository.updateById).not.toHaveBeenCalled();
    });

    it("resetPassword checks the confirmation, then stores the new hash", async () => {
        userRepository.findByEmail.mockResolvedValue(user({ resetPasswordExpires: new Date(Date.now() + 60000) }));

        await expect(
            authService.resetPassword({ email: "traveler@example.com", password: "newpass1", confirmPassword: "other" }),
        ).rejects.toMatchObject({ message: "Password and Confirm Password do not match" });

        await authService.resetPassword({ email: "traveler@example.com", password: "newpass1", confirmPassword: "newpass1" });
        const [, update] = userRepository.updateById.mock.calls[0];
        expect(await bcrypt.compare("newpass1", update.password)).toBe(true);
        expect(update.resetPasswordExpires).toBeNull();
    });
});

describe("refreshAccessToken", () => {
    const expiredToken = () => jwt.sign({ userId: USER_ID, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.ACCESS_TOKEN_SECRET);

    it("rejects a missing or invalid token", async () => {
        await expect(authService.refreshAccessToken(undefined)).rejects.toMatchObject({ status: 400 });
        await expect(authService.refreshAccessToken("garbage")).rejects.toMatchObject({ status: 400 });
    });

    it("rejects an inactive user", async () => {
        userRepository.findById.mockResolvedValue(user({ isActive: "delete" }));
        await expect(authService.refreshAccessToken(expiredToken())).rejects.toMatchObject({ status: 401, message: "User not found" });
    });

    it("rejects when the refresh token is gone (logged out)", async () => {
        userRepository.findById.mockResolvedValue(user({ refreshToken: undefined }));
        await expect(authService.refreshAccessToken(expiredToken())).rejects.toMatchObject({ status: 401 });
    });

    it("issues a new access token while the refresh token is valid", async () => {
        userRepository.findById.mockResolvedValue(user({ refreshToken: generateRefreshToken({ _id: USER_ID }) }));

        const result = await authService.refreshAccessToken(expiredToken());

        expect(result.message).toBe("Refresh token successfully");
        expect(verifyAccessToken(result.accessToken)).toMatchObject({ userId: USER_ID, exp: false });
    });

    it("also accepts a still valid access token", async () => {
        userRepository.findById.mockResolvedValue(user({ refreshToken: generateRefreshToken({ _id: USER_ID }) }));
        await expect(authService.refreshAccessToken(generateAccessToken({ _id: USER_ID }))).resolves.toHaveProperty("accessToken");
    });
});
