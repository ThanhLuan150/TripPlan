import { Router } from "express";
import contentController from "../controllers/contentController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.get("/home", contentController.home);                                       // public — slider and suggestions of the home page
router.get("/videos", contentController.videos);                                  // public — published videos, ?home=1 for the home page
router.get("/settings", contentController.settings);                              // public — app name, support e-mail, hotline
router.get("/announcements", authenticate, requireRole("user", "admin"), contentController.announcements); // role: user|admin — published notifications
router.post("/reports", authenticate, requireRole("user", "admin"), contentController.report);             // role: user|admin — { type, reason, content, authorName? }

export default router;
