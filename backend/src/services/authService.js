import bcrypt from "bcrypt";
import userRepository from "../repositories/userRepository.js";
import activityLogService from "./activityLogService.js";
import HttpError from "../utils/HttpError.js";
import { sendVerificationCodeEmail } from "../utils/mailer.js";
import { generateVerificationCode } from "../utils/verificationCode.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
} from "../utils/jwt.js";

const RESET_WINDOW_MS = 15 * 60 * 1000;

// Fields never sent to the client
const toPublicUser = (user) => {
    const data = user.toObject();
    for (const key of ["refreshToken", "_id", "password", "code", "resetPasswordExpires", "isActive", "suspendReason", "suspendedAt", "lastLoginAt", "lastActiveAt", "createdAt", "updatedAt", "__v"]) {
        delete data[key];
    }
    return data;
};

const EXISTS = "Username or email already exist";

const register = async ({ username, email, password, confirmPassword }) => {
    if (!username || !password || !email) {
        throw new HttpError(401, "Username, email or password not found");
    }
    if (password !== confirmPassword) {
        throw new HttpError(401, "Pasword and Confirm Password do not match");
    }
    const [byEmail, byUsername] = await Promise.all([
        userRepository.findByEmail(email),
        userRepository.findByUsername(username),
    ]);
    // An account whose email was never confirmed can register again: it gets
    // the new username/password and a new code (only the email owner can use it).
    const pending = byEmail?.isActive === "notActive" ? byEmail : null;
    if (byEmail && !pending) {
        throw new HttpError(401, EXISTS, { field: "email" });
    }
    if (byUsername && String(byUsername._id) !== String(pending?._id)) {
        throw new HttpError(401, EXISTS, { field: "username" });
    }

    const code = generateVerificationCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    if (pending) {
        await userRepository.updateById(pending._id, { username: username.toLowerCase(), password: hashedPassword, code });
    } else {
        await userRepository.create({ username, email, password: hashedPassword, code });
    }
    sendVerificationCodeEmail(email, code);
    return { message: "Registration successful. Check your email to verify your account", email };
};

const confirmAccount = async ({ email, code }) => {
    const user = code ? await userRepository.findByCode(code, email) : null;
    if (!user) {
        throw new HttpError(401, "Your code is not correct");
    }
    await userRepository.updateById(user._id, { isActive: "active", code: "" });
    activityLogService.record({ actor: user, action: "register" });
    return { message: "Verification successful. Your account is now active" };
};

const refreshVerificationCode = async ({ email }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new HttpError(401, "Your account not exist");
    }
    const code = generateVerificationCode();
    await userRepository.updateById(user._id, { code });
    sendVerificationCodeEmail(user.email, code);
    return { message: "The new code was successfully generated" };
};

const login = async ({ username, password, fcmToken }) => {
    const user = await userRepository.findByUsername(username);
    if (!user) {
        throw new HttpError(404, "The account is not registered");
    }
    if (user.isActive === "delete") {
        throw new HttpError(400, "The account has been deleted");
    }
    if (user.isActive === "suspended") {
        throw new HttpError(403, "The account has been suspended", { reason: user.suspendReason || "" });
    }
    if (user.isActive === "notActive") {
        throw new HttpError(404, "Unverified account");
    }
    if (!password) {
        throw new HttpError(404, "Password not found");
    }
    if (!(await bcrypt.compare(password, user.password))) {
        throw new HttpError(401, "Incorrect password");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const now = new Date();
    const update = { refreshToken, lastLoginAt: now, lastActiveAt: now };
    if (fcmToken !== undefined && fcmToken !== null) {
        update.fcmToken = fcmToken;
    }
    const saved = await userRepository.updateById(user._id, update);
    activityLogService.record({ actor: user, action: "login" });

    return { message: "Login successfully", accessToken, data: toPublicUser(saved) };
};

const forgotPassword = async ({ email }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new HttpError(401, "The email is not exist");
    }
    if (user.isActive === "notActive") {
        throw new HttpError(401, "Your account not active");
    }
    if (user.isActive === "delete") {
        throw new HttpError(401, "Your account not exist");
    }
    if (user.isActive === "suspended") {
        throw new HttpError(403, "The account has been suspended");
    }
    const code = generateVerificationCode();
    await userRepository.updateById(user._id, { code, resetPasswordExpires: null });
    sendVerificationCodeEmail(user.email, code);
    return { message: "The new code was successfully generated" };
};

// Step 2 of "forgot password": the code is correct, so the user may set a new
// password during the next 15 minutes.
const verifyResetCode = async ({ email, code }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new HttpError(401, "The account is not exist");
    }
    if (!code || code !== user.code) {
        throw new HttpError(401, "Your code is incorect");
    }
    await userRepository.updateById(user._id, {
        code: "",
        resetPasswordExpires: new Date(Date.now() + RESET_WINDOW_MS),
    });
    return { message: "Code verification successful", userId: user._id };
};

const resetPassword = async ({ email, password, confirmPassword }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new HttpError(401, "The account is not exist");
    }
    if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
        throw new HttpError(401, "Please verify the code sent to your email first");
    }
    if (!password || password !== confirmPassword) {
        throw new HttpError(401, "Password and Confirm Password do not match");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await userRepository.updateById(user._id, { password: hashedPassword, resetPasswordExpires: null });
    return { message: "Update password successfully" };
};

// New access token from an (expired) access token, while the refresh token is valid.
const refreshAccessToken = async (accessToken) => {
    const decoded = verifyAccessToken(accessToken);
    if (!decoded?.userId) {
        throw new HttpError(400, "Missing token parameter");
    }
    const user = await userRepository.findById(decoded.userId);
    if (!user || user.isActive !== "active") {
        throw new HttpError(401, "User not found");
    }
    const refresh = verifyRefreshToken(user.refreshToken);
    if (!refresh || refresh.exp) {
        throw new HttpError(401, "Your session has expired, please log in again");
    }
    return { message: "Refresh token successfully", accessToken: generateAccessToken(user) };
};

export default {
    register,
    confirmAccount,
    refreshVerificationCode,
    login,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    refreshAccessToken,
};
