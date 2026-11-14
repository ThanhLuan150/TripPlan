import { configDotenv } from "dotenv";

// Load .env once, here. Everything else imports values from this module
// instead of reading process.env directly.
configDotenv();

const env = {
    port: Number(process.env.PORT) || 8080,
    nodeEnv: process.env.NODE_ENV || "development",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    // public address of this backend, used in uploaded image URLs
    // (default: taken from the request, e.g. http://localhost:8080)
    publicUrl: (process.env.PUBLIC_URL || "").replace(/\/+$/, ""),
    maxImageMb: Number(process.env.MAX_IMAGE_MB) || 5,
    // requests per client IP and 15 minutes: all routes / the /auth routes
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 600,
    rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX) || 40,
    // number of reverse proxies in front of the API (nginx, a load balancer...),
    // so the limits see the real client IP; leave empty when there is none
    trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : 0,

    mongodbUri: process.env.MONGODB_URI,
    mongodbDbName: process.env.MONGODB_DB_NAME,

    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,

    geminiApiKey: process.env.API_KEY_CHAT,
    geminiModel: process.env.MODEL_NAME,
    // tried in order when MODEL_NAME is overloaded / unavailable
    geminiFallbacks: (process.env.MODEL_FALLBACKS ?? "").split(",").map((m) => m.trim()).filter(Boolean),

    hereApiKey: process.env.HERE_API_KEY,

    mailUser: process.env.USERNAME_MAIL,
    mailPassword: process.env.PASSWORD_MAIL,

    admin: {
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    },
};

const required = ["mongodbUri", "accessTokenSecret", "refreshTokenSecret"];
const missing = required.filter((key) => !env[key]);
if (missing.length > 0) {
    console.warn(`[env] Missing required settings in .env: ${missing.join(", ")}`);
}

export default env;
