import tripPlanRepository from "../repositories/tripPlanRepository.js";
import tripDayRepository from "../repositories/tripDayRepository.js";
import challengeRepository from "../repositories/challengeRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import HttpError from "../utils/HttpError.js";
import { startChat, getResponseText } from "../utils/gemini.js";
import { getDayOfWeek } from "../utils/date.js";
import { getLocationFromNameLocation } from "../utils/geocode.js";

const MAX_NOTE_LENGTH = 1500;

// Optional free text from the user (e.g. an AI chat answer they want to turn
// into a plan): the places in it should be used first.
const noteLine = (note, location) => {
    const text = typeof note === "string" ? note.trim().slice(0, MAX_NOTE_LENGTH) : "";
    if (!text) {
        return "";
    }
    return `
        - Ghi chú / gợi ý của tôi (ƯU TIÊN đưa các địa điểm và hoạt động trong ghi chú này vào kế hoạch, nếu chúng nằm trong ${location}):
        """${text.replace(/"""/g, "'''")}"""`;
};

const buildPrompt = ({ location, numberOfPeople, budget, interest, numberOfDay, userLocation, note }) => `
        - Địa điểm:${location}
        - Số lượng người: ${numberOfPeople}
        - Ngân sách: ${budget}
        - Sở thích: ${interest}
        - Tôi hiện tại sống ở: ${userLocation}${noteLine(note, location)}
        BẮT BUỘC phải tạo ra ít nhất 2 plan TRONG PHẠM VI ${location} và SỐ TIỀN TỔNG CHI PHÍ CỦA PLAN NÓ TRONG KHOẢNG ${budget} và có ĐẦY ĐỦ ${numberOfDay} ngày? Vui lòng cho ra tất cả trong chuỗi JSON format, với từ khóa là
        plannb:{
        "daynb": {
        title:"biggest location",
        "activities": [
            {"challenge_summary": string,
            "name_location":(string) VIETNAMESE,
            "province":(string),
            "level_of_difficult":number (from 10 to 100)}],
        "transportCost": money(NUMBER)(MUST BE GREATER THAN 0),
        "foodCost": money(NUMBER)(MUST BE GREATER THAN 0),
        "otherCost":money(NUMBER)(MUST BE GREATER THAN 0),
        }}
        THERE IS NO TEXT IN THE REPLY, ONLY JSON AND USING VIETNAMESE AND COMBINE TWO PLAN JSON STRINGS INTO A SINGLE JSON STRING`;

// The model sometimes wraps the JSON in text / code fences: keep the outer object.
const parsePlans = (text) => {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}") + 1;
    if (start === -1 || end === 0) {
        return undefined;
    }
    try {
        return JSON.parse(text.substring(start, end));
    } catch {
        return undefined;
    }
};

// Ask Gemini for (at least) two plans. Nothing is saved yet.
const generatePlans = async (userId, body) => {
    const { startDate, endDate } = body;
    if (startDate && endDate) {
        const overlapping = await tripPlanRepository.findOverlapping(userId, startDate, endDate);
        if (overlapping.length > 0) {
            throw new HttpError(400, "Please choose another day. Your selected dates overlap with existing trip plans.");
        }
    }
    const chat = startChat({ maxOutputTokens: 14348 });
    const result = await chat.sendMessage(buildPrompt(body));
    const text = getResponseText(result);
    if (text === null) {
        return { message: "An error occurred while creating the trip plan, try again" };
    }
    const data = parsePlans(text);
    if (!data) {
        console.log("No valid JSON found in the return data.", text);
        throw new HttpError(502, "An error occurred while creating the trip plan, try again");
    }
    return { message: "Create the plan successfully", data };
};

// Save the plan the user picked: trip -> days -> challenges (+ progress per challenge).
const saveTrip = async (userId, { jsonTrip, location, startDate, endDate, nameTrip }) => {
    if (!jsonTrip || !nameTrip) {
        throw new HttpError(400, "Missing trip data");
    }
    if (await tripPlanRepository.existsActiveWithName(userId, nameTrip)) {
        throw new HttpError(400, "A trip with the same name already exists");
    }
    const tripPlan = await tripPlanRepository.create({ userId, startDate, endDate, location, nameTrip });

    let transportCostTotal = 0;
    let foodCostTotal = 0;
    let otherCostTotal = 0;

    // jsonTrip is the list of days of the chosen plan (day 0 = start date)
    const days = Object.values(jsonTrip);
    for (const [dayNumber, dayData] of days.entries()) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + dayNumber);
        const { title, transportCost = 0, foodCost = 0, otherCost = 0 } = dayData;
        transportCostTotal += transportCost;
        foodCostTotal += foodCost;
        otherCostTotal += otherCost;

        const tripDay = await tripDayRepository.create({
            tripId: tripPlan._id,
            day: dayNumber,
            title,
            dayOfWeek: getDayOfWeek(dayDate.getDay()),
            date: dayDate,
            transportCost,
            foodCost,
            otherCost,
        });

        for (const activity of dayData.activities || []) {
            const { challenge_summary, level_of_difficult, name_location, province } = activity;
            const place = await getLocationFromNameLocation(name_location, province);
            const challenge = await challengeRepository.create({
                tripDayId: tripDay._id,
                challengeSummary: challenge_summary,
                nameLocation: name_location,
                location: place?.location ?? [name_location, province].filter(Boolean).join(", "),
                latitude: place?.latitude,
                longitude: place?.longitude,
                points: level_of_difficult,
            });
            await challengeProgressRepository.create(userId, challenge._id);
        }
    }

    await tripPlanRepository.updateById(tripPlan._id, { transportCostTotal, foodCostTotal, otherCostTotal });
    return { message: "Trip plan saved successfully", tripId: tripPlan._id };
};

const listTrips = async (userId) => ({
    message: "Get Trip Successfully",
    dataTrip: await tripPlanRepository.findActiveByUser(userId),
});

// Trip with its days, each day with its challenges and the user's progress.
const getTripDetail = async (trip, userId) => {
    const days = await tripDayRepository.findByTripId(trip._id);
    const dataTripDays = await Promise.all(days.map(async (tripDay) => {
        const challenges = await challengeRepository.findByTripDayId(tripDay._id);
        const progress = await challengeProgressRepository.findByUserAndChallenges(
            userId,
            challenges.map((c) => c._id),
        );
        const completedById = new Map(progress.map((p) => [String(p.chaId), p.completed]));
        const { tripId, ...day } = tripDay.toObject();
        return {
            ...day,
            challenges: challenges.map((challenge) => {
                const { tripDayId, ...data } = challenge.toObject();
                return { ...data, completed: completedById.get(String(challenge._id)) ?? false };
            }),
        };
    }));
    const { userId: _owner, ...tripData } = trip.toObject();
    return { message: "Get Data Detail Trip Successfully", tripDatas: { ...tripData, dataTripDays } };
};

const deleteTrip = async (trip) => {
    await tripPlanRepository.softDelete(trip._id);
    return { message: "Trip deleted successfully" };
};

// First challenge location of each day (used for the map overview)
const getTripLocations = async (trip) => {
    const days = await tripDayRepository.findByTripId(trip._id);
    const result = [];
    for (const tripDay of days) {
        const challenge = await challengeRepository.findFirstByTripDayId(tripDay._id);
        if (challenge) {
            result.push({
                day: tripDay.day,
                location: challenge.location,
                latitude: challenge.latitude,
                longitude: challenge.longitude,
            });
        }
    }
    return { message: "Get location successfully", result };
};

export default { generatePlans, saveTrip, listTrips, getTripDetail, deleteTrip, getTripLocations };
