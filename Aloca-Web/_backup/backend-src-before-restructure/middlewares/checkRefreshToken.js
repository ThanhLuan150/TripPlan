import { generateAccessToken, verifyRefreshToken } from "../helper/jwt.js";
import User from "../models/userModel.js";

const checkRefreshToken = async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);

        if (!user || user.isActive !== "active") {
            return res.status(401).send("User not found");
        }
        const refreshToken = user.refreshToken;

        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.exp == true) {
            return res.status(401).json({ message: "Your session has expired, please log in again" })
        }

        const newAccessToken = generateAccessToken(userId);
        res.setHeader('Authorization', `Bearer ${newAccessToken}`);
        req.userData = user;
        next()
    }
    catch (err) {
        console.log(err);
        return res.status(500).send("Internal server Error");
    }
}

export default checkRefreshToken;