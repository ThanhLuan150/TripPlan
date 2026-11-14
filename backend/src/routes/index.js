import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import chatRoutes from "./chatRoutes.js";
import tripPlanRoutes from "./tripPlanRoutes.js";
import rankingRoutes from "./rankingRoutes.js";
import challengeRoutes from "./challengeRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import adminRoutes from "./adminRoutes.js";
import contentRoutes from "./contentRoutes.js";
import geoRoutes from "./geoRoutes.js";

// Same base paths as before, so existing clients keep working.
const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/chat", chatRoutes);
router.use("/trip-plan", tripPlanRoutes);
router.use("/rankings", rankingRoutes);
router.use("/challenge", challengeRoutes);
router.use(uploadRoutes); // POST /upload/image, GET /files/:id
router.use("/geo", geoRoutes); // GET /geo/reverse: province of a position
router.use("/admin", adminRoutes); // admin panel (role "admin")
router.use(contentRoutes); // GET /videos, /settings, /announcements; POST /reports

export default router;
