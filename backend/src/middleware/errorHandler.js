import mongoose from "mongoose";
import HttpError from "../utils/HttpError.js";
import { describeDbError } from "../config/db.js";

const DB_ERRORS = ["MongooseServerSelectionError", "MongoServerSelectionError", "MongoNetworkError", "MongoNetworkTimeoutError", "MongoNotConnectedError"];

const isDatabaseError = (err) =>
    DB_ERRORS.includes(err?.name) || /buffering timed out|Client must be connected/i.test(err?.message ?? "");

export const notFound = (req, res, next) => {
    next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));
};

// Every error ends here and is sent as JSON: { message, ...extra }
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ message: err.message, ...err.body });
    }
    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: `Invalid ${err.path}` });
    }
    if (err instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ message: err.message });
    }
    if (err?.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" });
    }
    // MongoDB unreachable (Atlas IP not allowed, network down...): 503, not 500
    if (isDatabaseError(err)) {
        console.error(`[db] ${req.method} ${req.originalUrl}: ${describeDbError(err)}`);
        return res.status(503).json({ message: "Database unavailable" });
    }
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
};
