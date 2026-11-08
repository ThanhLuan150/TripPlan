import mongoose from "mongoose";
import connectDatabase from "../config/db.js";
import seedAdmin from "./seedAdmin.js";
import seedSampleData from "./seedSampleData.js";

// Usage:
//   npm run seed          -> admin account
//   npm run seed:sample   -> demo account, sample trip, ranking users
//   node src/seed/index.js all
const seeders = {
    admin: [seedAdmin],
    sample: [seedSampleData],
    all: [seedAdmin, seedSampleData],
};

const target = process.argv[2] || "admin";

const run = async () => {
    const list = seeders[target];
    if (!list) {
        throw new Error(`Unknown seed "${target}". Use: ${Object.keys(seeders).join(" | ")}`);
    }
    await connectDatabase();
    for (const seed of list) {
        await seed();
    }
};

run()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
