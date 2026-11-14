import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { apiLimiter, authLimiter, createLimiter } from "../../../src/middleware/rateLimit.js";

// a tiny app: the limiter in front of one route
const appWith = (limiter) => {
    const app = express();
    app.use(limiter);
    app.get("/ping", (req, res) => res.json({ ok: true }));
    return app;
};

describe("createLimiter", () => {
    it("answers 429 { message } with retry headers once the limit is used up", async () => {
        const app = appWith(createLimiter({ limit: 2, skip: () => false }));

        await request(app).get("/ping").expect(200);
        await request(app).get("/ping").expect(200);
        const blocked = await request(app).get("/ping");

        expect(blocked.status).toBe(429);
        expect(blocked.body).toEqual({ message: "Too many requests, please try again later" });
        expect(blocked.headers.ratelimit).toBeDefined();
        expect(blocked.headers["retry-after"]).toBeDefined();
        // the legacy X-RateLimit-* headers are not sent
        expect(blocked.headers["x-ratelimit-limit"]).toBeUndefined();
    });

    it("counts each client separately", async () => {
        const app = express();
        app.set("trust proxy", 1);
        app.use(createLimiter({ limit: 1, skip: () => false }));
        app.get("/ping", (req, res) => res.json({}));

        await request(app).get("/ping").set("X-Forwarded-For", "1.1.1.1").expect(200);
        await request(app).get("/ping").set("X-Forwarded-For", "1.1.1.1").expect(429);
        await request(app).get("/ping").set("X-Forwarded-For", "2.2.2.2").expect(200);
    });
});

describe("the limits of the API", () => {
    it("are off while testing, so the other tests are not throttled", async () => {
        for (const limiter of [apiLimiter, authLimiter]) {
            const app = appWith(limiter);
            for (let i = 0; i < 5; i++) {
                await request(app).get("/ping").expect(200);
            }
        }
    });
});
