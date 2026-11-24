// Starts the real backend on an in-memory MongoDB, runs the Cypress specs against it, stops it.
//   node scripts/run.mjs          headless
//   node scripts/run.mjs --open   Cypress window (the backend stays up while it is open)
// MONGO_URI=mongodb://... uses a MongoDB that is already running instead.
import { createRequire, register } from "node:module";
import { fileURLToPath } from "node:url";
import cypress from "cypress";
import { MongoMemoryServer } from "mongodb-memory-server";

export const PORT = 5175;
const root = fileURLToPath(new URL("..", import.meta.url));

// Set before the backend's src/config/env.js loads, so a local backend/.env never changes what
// the tests rely on (dotenv does not override these).
Object.assign(process.env, {
    NODE_ENV: "test", // also switches the rate limits off
    PORT: String(PORT),
    CORS_ORIGIN: "*",
    PUBLIC_URL: "",
    MAX_IMAGE_MB: "1",
    ACCESS_TOKEN_SECRET: "automation-access-secret",
    REFRESH_TOKEN_SECRET: "automation-refresh-secret",
    API_KEY_CHAT: "unused",
    MODEL_NAME: "unused",
    HERE_API_KEY: "unused",
    USERNAME_MAIL: "noreply@example.com",
    PASSWORD_MAIL: "unused",
});

// mongod sometimes fails to start on Windows (antivirus, a previous run still closing): try again
const startMongo = async () => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await MongoMemoryServer.create();
        } catch (err) {
            if (attempt === 3) {
                throw err;
            }
            console.warn(`MongoDB did not start (attempt ${attempt}), trying again...`);
        }
    }
};

let mongod;
const mongoUri = process.env.MONGO_URI || (mongod = await startMongo()).getUri();
process.env.MONGODB_URI = mongoUri;
const dbName = "aloca_automation";

// e-mail, AI and place lookups are answered by stubs (scripts/hooks.mjs)
register("./hooks.mjs", import.meta.url);

const backend = createRequire(new URL("../../../backend/package.json", import.meta.url));
const mongoose = backend("mongoose");
const express = backend("express");
await mongoose.connect(mongoUri, { dbName });
await mongoose.connection.syncIndexes(); // unique username / e-mail

const { default: app } = await import("../../../backend/src/app.js");
const { createControl } = await import("./control.mjs");
const server = express();
server.use("/__test", await createControl({ mongoUri, dbName }));
server.use(app);
const listening = await new Promise((resolve) => {
    const s = server.listen(PORT, () => resolve(s));
});
console.log(`Backend under test on http://localhost:${PORT} (database ${dbName})`);

let failed = 1;
try {
    if (process.argv.includes("--open")) {
        await cypress.open({ project: root });
        failed = 0;
    } else {
        const result = await cypress.run({ project: root });
        failed = result.status === "failed" || result.totalFailed > 0 ? 1 : 0;
    }
} catch (err) {
    console.error(err);
} finally {
    await new Promise((resolve) => listening.close(resolve));
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
    }
    await mongoose.disconnect();
    await mongod?.stop();
}
// (not process.exit: c8 writes its coverage report when the process ends by itself)
process.exitCode = failed;
