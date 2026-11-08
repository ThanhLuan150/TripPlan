import mongoose from "mongoose";
import { configDotenv } from "dotenv";
configDotenv();

// Connection string comes from .env (see .env.example).
// Optional MONGODB_DB_NAME picks the database; without it the database named
// in the URI is used (Atlas defaults to "test" when the URI has none).
const connect = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log("Missing MONGODB_URI in .env");
        return;
    }
    try {
        await mongoose.connect(uri, {
            retryWrites: true,
            w: "majority",
            ...(process.env.MONGODB_DB_NAME ? { dbName: process.env.MONGODB_DB_NAME } : {}),
        });
        console.log("Connect successfully");
    }
    catch (err) {
        console.log(err);
    }
}

export default connect;
