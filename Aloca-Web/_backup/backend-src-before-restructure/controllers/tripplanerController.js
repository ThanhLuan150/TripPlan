import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { configDotenv } from "dotenv";
import { getDayOfWeek } from "../helper/travel.js";
import { getImagesFromLocation } from "../helper/trip.js";
import TripDay from "../models/tripDayModel.js";
import Tripplan from "../models/tripplannerModel.js";
import Challenge from "../models/challengeModel.js";
import UserChallengProgress from "../models/userChallengeProgressModel.js";
import { getLocationFromNameLocation } from "../helper/getLocationFromNameLocation.js";
configDotenv();

const createTrip = async (req, res) => {
    try {
        const { location, numberOfPeople, budget, interest, numberOfDay, startDate, endDate, userLocation } = req.body;
        const overlappingPlans = await Tripplan.find({
            $or: [
                { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
                { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
            ]
        })
        if (overlappingPlans.length > 0) {
            return res.status(400).json({ message: "Please choose another day. Your selected dates overlap with existing trip plans." });
        }
        const genAI = new GoogleGenerativeAI(process.env.API_KEY_CHAT);
        const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });
        const generationConfig = {
            temperature: 1.5,
            topK: 20,
            topP: 0.5,
            maxOutputTokens: 14348,
        };
        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ];
        const chat = model.startChat({
            generationConfig,
            safetySettings
        });
        const result = await chat.sendMessage(`
        - Địa điểm:${location}
        - Số lượng người: ${numberOfPeople}
        - Ngân sách: ${budget} 
        - Sở thích: ${interest}
        - Tôi hiện tại sống ở: ${userLocation}
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
        THERE IS NO TEXT IN THE REPLY, ONLY JSON AND USING VIETNAMESE AND COMBINE TWO PLAN JSON STRINGS INTO A SINGLE JSON STRING`);
        const response = result.response.candidates;
        const hasContent = response.some(item => item.content);
        if (!hasContent) {
            return res.status(200).json({ message: "An error occurred while creating the trip plan, try again" })
        }
        let TripResponse = response[0].content.parts[0].text;
        console.log("trip", TripResponse);
        let jsonData;
        const startIndex = TripResponse.indexOf('{');
        const endIndex = TripResponse.lastIndexOf('}') + 1;
        if (startIndex !== -1 && endIndex !== -1) {
            const jsonSubstring = TripResponse.substring(startIndex, endIndex);
            jsonData = JSON.parse(jsonSubstring);
        } else {
            console.log("No valid JSON found in the return data.");
        }
        return res.status(200).json({ message: "Create the plan successfully", data: jsonData })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json("Internal Server Error");
    }
}

const saveTripPlanner = async (req, res) => {
    try {
        const { jsonTrip, location, startDate, endDate, nameTrip } = req.body;
        const userId = req.userData._id;
        let transportCostTotal = 0;
        let foodCostTotal = 0;
        let otherCostTotal = 0;
        const getDataAllTrip = await Tripplan.find({ userId: userId });
        const tripWithSameName = getDataAllTrip.find(trip => trip.nameTrip === nameTrip);
        if (tripWithSameName) {
            return res.status(400).json({ message: "A trip with the same name already exists" })
        }
        const tripPlan = new Tripplan({ userId, startDate, endDate, location, nameTrip }) // imageUrl
        await tripPlan.save();
        for (const [dayKey, dayData] of Object.entries(jsonTrip)) {
            const dayNumber = parseInt(dayKey.replace('day', ''));
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + dayNumber);
            const dayOfWeek = getDayOfWeek(dayDate.getDay());
            const { title, transportCost, foodCost, otherCost } = dayData;
            transportCostTotal += transportCost;
            foodCostTotal += foodCost;
            otherCostTotal += otherCost;
            const tripday = new TripDay({ tripId: tripPlan._id, day: dayNumber, title, dayOfWeek, date: dayDate, transportCost, foodCost, otherCost }); // imageUrlLocation
            await tripday.save();
            const activities = dayData.activities || [];
            for (const challengeData of activities) {
                let { challenge_summary, level_of_difficult, name_location, province } = challengeData;
                const data = await getLocationFromNameLocation(name_location, province);
                const location = data.location;
                const latitude = data.latitude;
                const longitude = data.longitude;
                const challenge = new Challenge({ tripDayId: tripday._id, challengeSummary: challenge_summary, location, points: level_of_difficult, latitude, longitude, nameLocation: name_location })
                await challenge.save();
                const userChallengeProgress = new UserChallengProgress({ userId: userId, chaId: challenge._id })
                await userChallengeProgress.save();
            }
        }
        tripPlan.transportCostTotal = transportCostTotal;
        tripPlan.foodCostTotal = foodCostTotal;
        tripPlan.otherCostTotal = otherCostTotal;
        await tripPlan.save();
        return res.status(200).json({ message: "Trip plan saved successfully", tripId: tripPlan._id })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json("Internal Server Error");
    }
}

const getTrip = async (req, res) => {
    try {
        const userId = req.userData._id;
        const dataTrip = await Tripplan.find({ userId: userId, status: { $ne: "delete" } });

        return res.status(200).json({ message: "Get Trip Successfully", dataTrip })
    }
    catch (err) {
        console.log(err);
        return res.status(500).send("Internal Server Error")
    }
}

const getDetailTrip = async (req, res) => {
    try {
        const idTrip = req.params.id;
        const userId = req.userData._id;
        const dataTrip = await Tripplan.findOne({ _id: idTrip, userId: userId }).select("-userId");
        if (!dataTrip || dataTrip.status == "delete") {
            return res.status(401).json({ message: "Data Trip not found!" })
        }

        const dataTripDays = await TripDay.find({ tripId: dataTrip._id }).select("-tripId -userId");
        const tripDatas = {
            ...dataTrip.toObject(),
            dataTripDays: await Promise.all(dataTripDays.map(async (tripDay) => {
                const challenges = await Challenge.find({ tripDayId: tripDay._id }).select("-tripId -tripDayId");
                const challengesWithStatus = await Promise.all(challenges.map(async (challenge) => {
                    const userChallengeProgress = await UserChallengProgress.findOne({ userId, chaId: challenge._id });
                    return {
                        ...challenge.toObject(),
                        completed: userChallengeProgress.completed
                    }
                }));
                return {
                    ...tripDay.toObject(),
                    challenges: challengesWithStatus
                }
            }))
        }
        return res.status(200).json({ message: "Get Data Detail Trip Successfully", tripDatas })
    }
    catch (err) {
        console.log(err);
        return res.status(500).send("Internal Server Error")
    }
}

const deleteTrip = async (req, res) => {
    try {
        const userId = req.userData._id;
        const tripId = req.params.id;

        const deleteTrip = await Tripplan.findOneAndUpdate(
            { _id: tripId, userId: userId },
            { $set: { status: "delete" } },
            { new: true })
        console.log(deleteTrip);
        if (!deleteTrip) {
            return res.status(404).json({ message: "Trip not found or unauthorized" });
        }
        return res.status(200).json({ message: "Trip deleted successfully" });
    } catch (error) {
        console.log(err);
        return res.status(500).send("Internal Server Error")
    }
}

const getLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = [];
        const tripDays = await TripDay.find({ tripId: id });
        for (const tripDay of tripDays) {
            const challenge = await Challenge.findOne({ tripDayId: tripDay._id });
            if (challenge) {
                result.push({
                    day: tripDay.day,
                    location: challenge.location,
                    latitude: challenge.latitude,
                    longitude: challenge.longitude
                });
            }
        }
        return res.status(200).json({ message: "Get location successfully", result });
    } catch (error) {
        console.log(error);
        return res.status(500).send("Internal Server Error")
    }
}


export {
    createTrip,
    saveTripPlanner,
    getTrip,
    getDetailTrip,
    deleteTrip,
    getLocation
}
