import mongoose from "mongoose";
import env from "./env.js";

// Connection string comes from MONGODB_URI in .env (see .env.example).
// Optional MONGODB_DB_NAME picks the database; without it the database named
// in the URI is used (Atlas defaults to "test" when the URI has none).
const connectDatabase = async () => {
    if (!env.mongodbUri) {
        throw new Error("Missing MONGODB_URI in .env");
    }
    await mongoose.connect(env.mongodbUri, {
        retryWrites: true,
        w: "majority",
        serverSelectionTimeoutMS: 15000,
        ...(env.mongodbDbName ? { dbName: env.mongodbDbName } : {}),
    });
    console.log("Connect successfully");
};

const RETRY_MS = 10000;

// Short, actionable explanation of a connection failure.
export const describeDbError = (err) => {
    const text = `${err?.message ?? ""} ${[...(err?.reason?.servers?.values?.() ?? [])]
        .map((s) => s.error?.message ?? "")
        .join(" ")}`;
    if (/whitelist|SSL alert number 80|tlsv1 alert internal error/i.test(text)) {
        return "MongoDB Atlas refused the connection: add this machine's public IP in Atlas > Network Access";
    }
    if (/ENOTFOUND|querySrv/i.test(text)) {
        return "MongoDB host not found: check MONGODB_URI (cluster deleted or wrong name?)";
    }
    if (/Authentication failed|bad auth/i.test(text)) {
        return "MongoDB authentication failed: check the user / password in MONGODB_URI";
    }
    return err?.message ?? String(err);
};

// Keeps trying until the database is reachable (e.g. after the IP is added in
// Atlas), so the server does not need a restart.
let lastConnectError = null;

export const connectDatabaseWithRetry = async () => {
    try {
        await connectDatabase();
        lastConnectError = null;
    } catch (err) {
        lastConnectError = err;
        console.error(`[db] ${describeDbError(err)}. Retrying in ${RETRY_MS / 1000}s...`);
        setTimeout(connectDatabaseWithRetry, RETRY_MS);
    }
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

// Known to be down: the connection dropped, or the last connect attempt failed.
// (During the very first attempt queries just wait for it.)
export const isDatabaseDown = () =>
    !isDatabaseConnected() && (mongoose.connection.readyState === 0 || lastConnectError !== null);

export default connectDatabase;
