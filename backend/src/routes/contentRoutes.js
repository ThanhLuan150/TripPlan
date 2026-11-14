import { Router } from "express";
import contentController from "../controllers/contentController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/home", apiLimiter, contentController.home);                                       // public — slider and suggestions of the home page
router.get("/videos", apiLimiter, contentController.videos);                                  // public — published videos, ?home=1 for the home page
router.get("/settings", apiLimiter, contentController.settings);                              // public — app name, support e-mail, hotline
router.get("/announcements", apiLimiter, authenticate, requireRole("user", "admin"), contentController.announcements); // role: user|admin — published notifications
router.post("/reports", apiLimiter, authenticate, requireRole("user", "admin"), contentController.report);             // role: user|admin — { type, reason, content, authorName? }

export default router;
