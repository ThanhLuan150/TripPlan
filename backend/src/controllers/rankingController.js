import userRepository from "../repositories/userRepository.js";
import challengeProgressRepository from "../repositories/challengeProgressRepository.js";
import asyncHandler from "../utils/asyncHandler.js";

// Read-only: no business logic, so it talks to the repositories directly.

const monthly = asyncHandler(async (req, res) => {
    const dataRanks = await challengeProgressRepository.rankingThisMonth();
    res.status(200).json({ message: "Get Ranking Per Month Successfully", dataRanks });
});

const weekly = asyncHandler(async (req, res) => {
    const dataRanks = await challengeProgressRepository.rankingThisWeek();
    res.status(200).json({ message: "Get Ranking Per Week Successfully", dataRanks });
});

const highest = asyncHandler(async (req, res) => {
    const dataRanks = await userRepository.topByExperience(100);
    res.status(200).json({ message: "Get the Highest Ranking User Successfully", dataRanks });
});

export default { monthly, weekly, highest };
