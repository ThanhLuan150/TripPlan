// Test-only endpoints, mounted in front of the backend under /__test (they do not exist in
// the backend itself): they let a spec do what a user cannot, like reading the code that was
// "e-mailed", creating an administrator, steering the stubs or taking the database away.
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const backend = createRequire(new URL("../../../backend/package.json", import.meta.url));
const express = backend("express");
const mongoose = backend("mongoose");
const bcrypt = backend("bcrypt");
const jwt = backend("jsonwebtoken");

export const PASSWORD = "secret123";
const SECRETS = {
    access: "automation-access-secret",
    refresh: "automation-refresh-secret",
    other: "another-secret",
};

export async function createControl({ mongoUri, dbName }) {
    const { external } = await import("../stubs/state.js");
    const { default: User } = await import("../../../backend/src/models/User.js");
    const { default: env } = await import("../../../backend/src/config/env.js");

    const router = express.Router();
    router.use(express.json());

    // POST { ...fields } -> a user straight in the database (active, password "secret123")
    router.post("/users", async (req, res) => {
        const n = randomBytes(6).toString("base64url");
        const user = await User.create({
            username: `user${n}`,
            email: `user${n}@example.com`,
            isActive: "active",
            ...req.body,
            password: await bcrypt.hash(req.body.password ?? PASSWORD, 4),
        });
        res.json({ id: String(user._id), username: user.username, email: user.email });
    });

    // GET -> the whole stored document, by id or e-mail
    router.get("/users/:key", async (req, res) => {
        const { key } = req.params;
        const user = await (mongoose.isValidObjectId(key) ? User.findById(key) : User.findOne({ email: key.toLowerCase() }));
        res.json(user ? user.toObject() : null);
    });

    router.patch("/users/:id", async (req, res) => {
        await User.updateOne({ _id: req.params.id }, req.body);
        res.json({ ok: true });
    });

    // POST { which: access|refresh|other, payload, expiresIn } -> a signed token
    router.post("/token", (req, res) => {
        const { which = "access", payload = {}, expiresIn = "1h" } = req.body;
        res.json({ token: jwt.sign(payload, SECRETS[which], { expiresIn }) });
    });

    // what the stubs answer
    router.post("/external", (req, res) => {
        const { reset, ...next } = req.body;
        if (reset) {
            Object.assign(external, { ai: { text: "OK" }, aiQueue: [], prompts: [], route: null, province: null });
        }
        Object.assign(external, next);
        res.json({ ok: true });
    });
    router.get("/external", (req, res) => res.json(external));

    // run the app as in production: the rate limits switch on
    router.post("/mode", (req, res) => {
        env.nodeEnv = req.body.production ? "production" : "test";
        res.json({ nodeEnv: env.nodeEnv });
    });

    // take the database away / bring it back
    router.post("/db", async (req, res) => {
        if (req.body.down) {
            await mongoose.disconnect();
        } else if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(mongoUri, { dbName });
        }
        res.json({ readyState: mongoose.connection.readyState });
    });

    return router;
}
