import mongoose from "mongoose";
import tripDayRepository from "../repositories/tripDayRepository.js";
import challengeRepository from "../repositories/challengeRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import HttpError from "../utils/HttpError.js";
import { getLocationFromNameLocation } from "../utils/geocode.js";

// Adds one place (e.g. a destination the AI recommended) to a day of one of the user's own trips.
// The place becomes a normal challenge of that day with fresh progress; nothing else is touched.

export const MAX_PLACES_PER_DAY = 10;
const POINTS_NEW_PLACE = 10;

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const norm = (name) => String(name ?? "").trim().toLowerCase();

// trip: loaded by ownTrip (owned by the user, not deleted)
const addPlace = async (trip, userId, body = {}) => {
    const name = text(body.name, 200);
    if (!name) {
        throw new HttpError(400, "The place name is required");
    }
    if (!mongoose.isValidObjectId(body.dayId)) {
        throw new HttpError(400, "Please choose a day of the trip");
    }
    const province = text(body.province, 100);
    const summary = text(body.summary, 1000) || name;

    const days = await tripDayRepository.findByTripId(trip._id);
    const day = days.find((item) => String(item._id) === String(body.dayId));
    if (!day) {
        throw new HttpError(404, "This day does not belong to the trip");
    }
    const challengesByDay = await Promise.all(days.map((item) => challengeRepository.findByTripDayId(item._id)));
    // the same place twice in one trip is almost certainly a mistake: say so instead of adding it
    if (challengesByDay.flat().some((challenge) => norm(challenge.nameLocation) === norm(name))) {
        throw new HttpError(409, "This place is already in the trip", { code: "PLACE_ALREADY_IN_TRIP" });
    }
    const index = days.indexOf(day);
    if (challengesByDay[index].length >= MAX_PLACES_PER_DAY) {
        throw new HttpError(409, `A day can have at most ${MAX_PLACES_PER_DAY} places`, { code: "DAY_FULL" });
    }

    // looked up before writing: slow and may find nothing, the trip is still intact
    const place = await getLocationFromNameLocation(name, province);
    const challenge = await challengeRepository.create({
        tripDayId: day._id,
        challengeSummary: summary,
        nameLocation: name,
        points: POINTS_NEW_PLACE,
        location: place?.location ?? [name, province].filter(Boolean).join(", "),
        latitude: place?.latitude,
        longitude: place?.longitude,
    });
    await challengeProgressRepository.create(userId, challenge._id);
    return {
        message: "Place added to the trip",
        challengeId: challenge._id,
        day: { id: day._id, title: day.title },
        // false: the place has no position on the map yet
        located: Boolean(place),
    };
};

export default { addPlace };
