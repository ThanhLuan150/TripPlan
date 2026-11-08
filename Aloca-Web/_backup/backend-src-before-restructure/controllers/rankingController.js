import { configDotenv } from "dotenv";
import UserChallengeProgressSchema from "../models/userChallengeProgressModel.js";
import User from "../models/userModel.js";
configDotenv();

const rankPerMonth = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const dataRankingPerMonth = await UserChallengeProgressSchema.aggregate([
            {
                $match: {
                    completed: true,
                    $expr: {
                        $eq:
                            [{ $month: "$updatedAt" }, currentMonth]
                    }
                }
            },
            {
                $lookup: {
                    from: "challenges",
                    localField: "chaId",
                    foreignField: "_id",
                    as: "challenge"
                }
            },
            {
                $unwind: "$challenge"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $group: {
                    _id: "$userId",
                    fullname: { $first: "$user.fullname" },
                    experience: { $sum: "$challenge.points" },
                    image: { $first: "$user.image" }
                }
            },
            {
                $sort: {
                    experience: -1
                }
            }
        ])

        return res.status(200).json({ message: "Get Ranking Per Month Successfully", dataRanks: dataRankingPerMonth })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error!" });
    }
}

const rankPerWeek = async (req, res) => {
    try {
        const dataRankingPerWeek = await UserChallengeProgressSchema.aggregate([
            {
                $match: {
                    completed: true,
                    $expr: {
                        $and: [
                            { $eq: [{ $week: "$updatedAt" }, { $week: new Date() }] },
                            { $eq: [{ $year: "$updatedAt" }, { $year: new Date() }] }
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "challenges",
                    localField: "chaId",
                    foreignField: "_id",
                    as: "challenge"
                }
            },
            {
                $unwind: "$challenge"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $group: {
                    _id: "$userId",
                    fullname: { $first: "$user.fullname" },
                    experience: { $sum: "$challenge.points" },
                    image: { $first: "$user.image" }
                }
            },
            {
                $sort: {
                    experience: -1
                }
            }
        ])

        return res.status(200).json({ message: "Get Ranking Per Week Successfully", dataRanks: dataRankingPerWeek })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Servel Error!" });
    }
}

const rankingUserHighest = async (req, res) => {
    try {
        const dataRankingUserHighest = await User.aggregate([
            {
                $sort: {
                    experience: -1
                }
            },
            {
                $limit: 100
            },
            {
                $project: {
                    _id: "$_id",
                    fullname: "$fullname",
                    experience: "$experience",
                    image: "$image"
                }
            }
        ])
        return res.status(200).json({ message: "Get the Highest Ranking User Successfully", dataRanks: dataRankingUserHighest })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Servel Error!" });
    }
}

export {
    rankPerMonth,
    rankPerWeek,
    rankingUserHighest
}
