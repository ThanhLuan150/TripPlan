import express from "express";
import cors from "cors";
import morgan from "morgan";
import env from "./config/env.js";
import { isDatabaseConnected, isDatabaseDown } from "./config/db.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

// Express app without listen(), so it can be reused by scripts and tests.
const app = express();

if (env.trustProxy) {
    app.set("trust proxy", env.trustProxy);
}

app.use(express.json({ limit: "2mb" }));
app.use(cors({
    origin: env.corsOrigin === "*" ? "*" : env.corsOrigin.split(",").map((o) => o.trim()),
    // lets the web app read the refreshed access token (see middleware/auth.js)
    exposedHeaders: ["Authorization"],
}));
if (env.nodeEnv !== "test") {
    app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.get("/health", (req, res) => {
    const db = isDatabaseConnected() ? "connected" : "disconnected";
    res.status(db === "connected" ? 200 : 503).json({ status: db === "connected" ? "ok" : "degraded", db });
});

// While the database is known to be down answer at once, instead of letting
// Mongoose buffer the query for 10s.
app.use((req, res, next) => {
    if (isDatabaseDown()) {
        return res.status(503).json({ message: "Database unavailable" });
    }
    next();
});
app.use(routes);

app.use(notFound);
app.use(errorHandler);

export default app;
