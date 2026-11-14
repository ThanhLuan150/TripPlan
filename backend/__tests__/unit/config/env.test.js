import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// no .env file in these tests: only what each test puts in process.env
vi.mock("dotenv", () => ({ configDotenv: vi.fn() }));

const KEYS = [
    "PORT", "NODE_ENV", "CORS_ORIGIN", "PUBLIC_URL", "MAX_IMAGE_MB", "MONGODB_URI", "MONGODB_DB_NAME",
    "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET", "API_KEY_CHAT", "MODEL_NAME", "MODEL_FALLBACKS",
    "HERE_API_KEY", "USERNAME_MAIL", "PASSWORD_MAIL", "ADMIN_USERNAME", "ADMIN_EMAIL", "ADMIN_PASSWORD",
];
let saved;

const load = async (vars = {}) => {
    for (const key of KEYS) {
        delete process.env[key];
    }
    Object.assign(process.env, vars);
    vi.resetModules();
    return (await import("../../../src/config/env.js")).default;
};

beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    vi.restoreAllMocks();
});

const required = { MONGODB_URI: "mongodb://db", ACCESS_TOKEN_SECRET: "a", REFRESH_TOKEN_SECRET: "r" };

describe("env", () => {
    it("loads the .env file once", async () => {
        const { configDotenv } = await import("dotenv");
        await load(required);
        expect(configDotenv).toHaveBeenCalled();
    });

    it("has sensible defaults", async () => {
        const env = await load(required);

        expect(env).toMatchObject({
            port: 8080,
            nodeEnv: "development",
            corsOrigin: "*",
            publicUrl: "",
            maxImageMb: 5,
            geminiFallbacks: [],
            admin: { username: undefined, email: undefined, password: undefined },
        });
    });

    it("reads every setting", async () => {
        const env = await load({
            ...required,
            PORT: "3000",
            NODE_ENV: "production",
            CORS_ORIGIN: "https://aloca.vn",
            MAX_IMAGE_MB: "8",
            MONGODB_DB_NAME: "aloca",
            API_KEY_CHAT: "key",
            MODEL_NAME: "gemini-x",
            HERE_API_KEY: "here",
            USERNAME_MAIL: "m@x.vn",
            PASSWORD_MAIL: "p",
            ADMIN_USERNAME: "admin",
            ADMIN_EMAIL: "admin@x.vn",
            ADMIN_PASSWORD: "pw",
        });

        expect(env).toMatchObject({
            port: 3000,
            nodeEnv: "production",
            corsOrigin: "https://aloca.vn",
            maxImageMb: 8,
            mongodbUri: "mongodb://db",
            mongodbDbName: "aloca",
            accessTokenSecret: "a",
            refreshTokenSecret: "r",
            geminiApiKey: "key",
            geminiModel: "gemini-x",
            hereApiKey: "here",
            mailUser: "m@x.vn",
            mailPassword: "p",
            admin: { username: "admin", email: "admin@x.vn", password: "pw" },
        });
    });

    it("falls back on invalid numbers", async () => {
        const env = await load({ ...required, PORT: "abc", MAX_IMAGE_MB: "lots" });

        expect(env.port).toBe(8080);
        expect(env.maxImageMb).toBe(5);
    });

    it("drops trailing slashes from PUBLIC_URL", async () => {
        const env = await load({ ...required, PUBLIC_URL: "https://api.aloca.vn///" });
        expect(env.publicUrl).toBe("https://api.aloca.vn");
    });

    it("splits MODEL_FALLBACKS, ignoring spaces and empty items", async () => {
        const env = await load({ ...required, MODEL_FALLBACKS: " model-b, ,model-c ,," });
        expect(env.geminiFallbacks).toEqual(["model-b", "model-c"]);
    });

    it("warns about missing required settings, without crashing", async () => {
        await load({ MONGODB_URI: "mongodb://db" });

        expect(console.warn).toHaveBeenCalledWith(
            "[env] Missing required settings in .env: accessTokenSecret, refreshTokenSecret",
        );
    });

    it("does not warn when everything required is set", async () => {
        await load(required);
        expect(console.warn).not.toHaveBeenCalled();
    });
});
