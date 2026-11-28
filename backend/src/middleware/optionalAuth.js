import userRepository from "../repositories/userRepository.js";
import { verifyAccessToken } from "../utils/jwt.js";

// For pages anyone may read but that show more to a signed-in user (e.g. "did I like this").
// A missing, bad or expired token (an expired one is not renewed here) never fails the request: the visitor is just anonymous.
const optionalAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        const decoded = header ? verifyAccessToken(header.split(" ")[1]) : null;
        if (decoded?.userId && !decoded.exp) {
            const user = await userRepository.findById(decoded.userId);
            if (user && user.isActive === "active") {
                req.user = user;
            }
        }
    } catch {
        // anonymous
    }
    next();
};

export default optionalAuth;
