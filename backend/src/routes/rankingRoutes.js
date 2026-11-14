import { Router } from "express";
import rankingController from "../controllers/rankingController.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

// Read-only, public.
router.get("/monthly", rankingController.monthly);
router.get("/weekly", rankingController.weekly);
router.get("/rankingUserHighest", rankingController.highest);

export default router;
