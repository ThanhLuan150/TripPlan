import bcrypt from "bcrypt";
import env from "../config/env.js";
import User from "../models/User.js";
import TripPlan from "../models/TripPlan.js";
import TripDay from "../models/TripDay.js";
import Challenge from "../models/Challenge.js";
import UserChallengeProgress from "../models/UserChallengeProgress.js";
import { getDayOfWeek } from "../utils/date.js";

// Demo data for local testing: a "demouser" account with one saved trip, and a few
// travellers so the ranking screens are not empty. Safe to run more than once.

const AVATAR = "https://cdn.sforum.vn/sforum/wp-content/uploads/2023/10/avatar-trang-67.jpg";

const travellers = [
    { username: "minhbao", fullname: "Trần Minh Bảo", experience: 1200 },
    { username: "thucuc", fullname: "Lê Thu Cúc", experience: 640 },
    { username: "duypham", fullname: "Phạm Duy", experience: 260 },
    { username: "hoangyen", fullname: "Hoàng Yến", experience: 90 },
];

const sampleTrip = {
    nameTrip: "Đà Nẵng 2 ngày (mẫu)",
    location: "Đà Nẵng",
    days: [
        {
            title: "Khám phá bán đảo Sơn Trà",
            transportCost: 100000,
            foodCost: 150000,
            otherCost: 0,
            challenges: [
                { challengeSummary: "Check-in chùa Linh Ứng", nameLocation: "Chùa Linh Ứng", location: "Chùa Linh Ứng, Sơn Trà, Đà Nẵng", latitude: "16.1003", longitude: "108.2775", points: 50 },
                // completed in the sample, so it has a photo
                { challengeSummary: "Ngắm hoàng hôn ở biển Mỹ Khê", nameLocation: "Bãi biển Mỹ Khê", location: "Bãi biển Mỹ Khê, Đà Nẵng", latitude: "16.0610", longitude: "108.2470", points: 30, imageUrl: "https://statics.vinpearl.com/du-lich-da-nang_1657939501.JPG" },
            ],
        },
        {
            title: "Bà Nà Hills",
            transportCost: 200000,
            foodCost: 250000,
            otherCost: 900000,
            challenges: [
                { challengeSummary: "Đi bộ trên Cầu Vàng", nameLocation: "Cầu Vàng", location: "Cầu Vàng, Bà Nà Hills, Đà Nẵng", latitude: "15.9950", longitude: "107.9960", points: 100 },
            ],
        },
    ],
};

const upsertUser = async ({ username, fullname, experience = 0, password }) =>
    User.findOneAndUpdate(
        { username },
        {
            $set: { fullname, experience, isActive: "active" },
            $setOnInsert: { email: `${username}@aloca.local`, password, image: AVATAR, role: "user" },
        },
        { upsert: true, new: true },
    );

export default async function seedSampleData() {
    const demoPassword = process.env.SEED_DEMO_PASSWORD || (env.nodeEnv !== "production" ? "demo123" : null);
    if (!demoPassword) {
        console.log("[seed:sample] skipped: set SEED_DEMO_PASSWORD to seed sample data in production");
        return;
    }
    const password = await bcrypt.hash(demoPassword, 10);

    for (const traveller of travellers) {
        await upsertUser({ ...traveller, password });
    }
    // username: 5-12 characters, the rule of the sign-in form
    const demo = await upsertUser({ username: "demouser", fullname: "Tài khoản Demo", experience: 30, password });
    console.log(`[seed:sample] users ready (password: ${process.env.SEED_DEMO_PASSWORD ? "SEED_DEMO_PASSWORD" : demoPassword})`);

    if (await TripPlan.exists({ userId: demo._id, nameTrip: sampleTrip.nameTrip, status: { $ne: "delete" } })) {
        console.log("[seed:sample] sample trip already exists");
        return;
    }

    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + sampleTrip.days.length - 1);

    const trip = await TripPlan.create({
        userId: demo._id,
        nameTrip: sampleTrip.nameTrip,
        location: sampleTrip.location,
        startDate: start,
        endDate: end,
        transportCostTotal: sampleTrip.days.reduce((s, d) => s + d.transportCost, 0),
        foodCostTotal: sampleTrip.days.reduce((s, d) => s + d.foodCost, 0),
        otherCostTotal: sampleTrip.days.reduce((s, d) => s + d.otherCost, 0),
    });

    for (const [dayNumber, day] of sampleTrip.days.entries()) {
        const date = new Date(start);
        date.setDate(date.getDate() + dayNumber);
        const tripDay = await TripDay.create({
            tripId: trip._id,
            day: dayNumber,
            title: day.title,
            dayOfWeek: getDayOfWeek(date.getDay()),
            date,
            transportCost: day.transportCost,
            foodCost: day.foodCost,
            otherCost: day.otherCost,
        });
        for (const data of day.challenges) {
            const challenge = await Challenge.create({ ...data, tripDayId: tripDay._id });
            // one challenge is already done, to show both states
            const done = Boolean(data.imageUrl);
            await UserChallengeProgress.create({ userId: demo._id, chaId: challenge._id, completed: done });
        }
    }
    console.log(`[seed:sample] sample trip created: ${sampleTrip.nameTrip}`);
}
