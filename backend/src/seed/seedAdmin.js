import bcrypt from "bcrypt";
import env from "../config/env.js";
import User from "../models/User.js";

// Creates (or updates) the admin account from ADMIN_USERNAME / ADMIN_EMAIL /
// ADMIN_PASSWORD in .env. Roles are plain strings on User ("user" | "admin").
export default async function seedAdmin() {
    const { username, email, password } = env.admin;
    if (!username || !email || !password) {
        console.log("[seed:admin] skipped: set ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env");
        return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.findOneAndUpdate(
        { username: username.toLowerCase() },
        {
            $set: { email: email.toLowerCase(), password: hashedPassword, role: "admin", isActive: "active", code: "" },
            $setOnInsert: { fullname: "Aloca Admin" },
        },
        { upsert: true, new: true },
    );
    console.log(`[seed:admin] admin account ready: ${admin.username}`);
}
