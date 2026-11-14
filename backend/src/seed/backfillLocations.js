import Challenge from "../models/Challenge.js";
import TripDay from "../models/TripDay.js";
import TripPlan from "../models/TripPlan.js";
import { getLocationFromNameLocation } from "../utils/geocode.js";

// Gives coordinates to the challenges saved without them (the place lookup
// failed at the time, e.g. an invalid HERE key): without coordinates a user
// cannot check in ("This challenge has no location"). One lookup per second
// (OpenStreetMap's usage policy). Safe to run more than once.

const MISSING = { $or: [{ latitude: { $exists: false } }, { latitude: null }, { latitude: "" }, { longitude: { $exists: false } }, { longitude: null }, { longitude: "" }] };

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function backfillLocations({ delayMs = 1100 } = {}) {
    const challenges = await Challenge.find(MISSING).lean();
    let fixed = 0;
    for (const challenge of challenges) {
        const day = await TripDay.findById(challenge.tripDayId).select("tripId").lean();
        const trip = day ? await TripPlan.findById(day.tripId).select("location").lean() : null;
        const place = await getLocationFromNameLocation(challenge.nameLocation, trip?.location ?? "");
        if (place) {
            await Challenge.updateOne({ _id: challenge._id }, { $set: { latitude: place.latitude, longitude: place.longitude } });
            fixed += 1;
        }
        await pause(delayMs);
    }
    console.log(`[backfill:locations] ${fixed} of ${challenges.length} challenges got coordinates`);
}
