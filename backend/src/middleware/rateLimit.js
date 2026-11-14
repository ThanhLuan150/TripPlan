import rateLimit from "express-rate-limit";
import env from "../config/env.js";

// Request limits per client IP (see TRUST_PROXY when the API is behind a proxy).
// Too many requests -> 429 { message }, with RateLimit-* headers telling when to retry.

const WINDOW_MS = 15 * 60 * 1000;

export const createLimiter = ({ limit, windowMs = WINDOW_MS, skip = () => env.nodeEnv === "test" }) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip,
        handler: (req, res) => {
            res.status(429).json({ message: "Too many requests, please try again later" });
        },
    });

// every route (the web app makes a handful of calls per screen)
export const apiLimiter = createLimiter({ limit: env.rateLimitMax });

// sign-in, sign-up, verification and password-reset codes: much stricter against guessing
export const authLimiter = createLimiter({ limit: env.rateLimitAuthMax });
