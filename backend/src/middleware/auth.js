import userRepository from "../repositories/userRepository.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import { generateAccessToken, verifyAccessToken, verifyRefreshToken } from "../utils/jwt.js";

const authenticate = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        throw new HttpError(401, "Your token not found");
    }
    const decoded = verifyAccessToken(header.split(" ")[1]);
    if (!decoded?.userId) {
        throw new HttpError(401, "Invalid token");
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || user.isActive !== "active") {
        throw new HttpError(401, "User not found");
    }

    if (decoded.exp) {
        const refresh = verifyRefreshToken(user.refreshToken);
        if (!refresh || refresh.exp) {
            throw new HttpError(401, "Your session has expired, please log in again");
        }
        res.setHeader("Authorization", `Bearer ${generateAccessToken(user)}`);
    }

    // "last active": at most one write every 5 minutes per user
    if (!user.lastActiveAt || Date.now() - new Date(user.lastActiveAt).getTime() > 5 * 60_000) {
        Promise.resolve(userRepository.updateById(user._id, { lastActiveAt: new Date() })).catch(() => {});
    }

    req.user = user;
    req.userData = user;
    next();
});

export default authenticate;
