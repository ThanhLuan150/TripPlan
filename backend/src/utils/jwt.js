import jwt from "jsonwebtoken";
import env from "../config/env.js";

const { TokenExpiredError } = jwt;

const generateAccessToken = (user) =>
    jwt.sign({ userId: user._id }, env.accessTokenSecret, { expiresIn: "3h" });

const generateRefreshToken = (user) =>
    jwt.sign({ userId: user._id }, env.refreshTokenSecret, { expiresIn: "30d" });

// Returns { userId, exp: false } for a valid token, { userId, exp: true } for an
// expired one, and null when the token is missing or invalid.
const verifyAccessToken = (accessToken) => {
    if (!accessToken) {
        return null;
    }
    try {
        const decoded = jwt.verify(accessToken, env.accessTokenSecret);
        return { ...decoded, exp: false };
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            const decoded = jwt.decode(accessToken);
            return { exp: true, userId: decoded?.userId };
        }
        return null;
    }
};

// Returns { ...payload, exp: false } for a valid token, { exp: true } when
// expired, or null when invalid. (`exp` must not stay the JWT's numeric expiry
// time: callers test `refresh.exp` to know whether it has expired.)
const verifyRefreshToken = (refreshToken) => {
    if (!refreshToken) {
        return null;
    }
    try {
        const decoded = jwt.verify(refreshToken, env.refreshTokenSecret);
        return { ...decoded, exp: false };
    } catch (err) {
        if (err instanceof TokenExpiredError) {
            return { exp: true };
        }
        return null;
    }
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
