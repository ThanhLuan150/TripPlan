import mongoose from "mongoose";
import connectDatabase from "../config/db.js";
import seedAdmin from "./seedAdmin.js";
import seedSampleData from "./seedSampleData.js";
import seedContent from "./seedContent.js";

// Usage:
//   npm run seed          -> admin account
//   npm run seed:sample   -> demo account, sample trip, ranking users + the content below
//   npm run seed:content  -> videos, home page pictures and announcements only
//                            (add `-- --reset` to replace what is there)
//   node src/seed/index.js all
const seeders = {
    admin: [seedAdmin],
    sample: [seedSampleData],
    content: [seedContent],
    all: [seedAdmin, seedSampleData],
};

const target = process.argv[2] || "admin";

const run = async () => {
    const list = seeders[target];
    if (!list) {
        throw new Error(`Unknown seed "${target}". Use: ${Object.keys(seeders).join(" | ")}`);
    }
    await connectDatabase();
    // `-- --reset` (seed:content): replace the content instead of only filling what is empty
    const reset = process.argv.includes("--reset");
    for (const seed of list) {
        await seed({ reset });
    }
};

run()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
