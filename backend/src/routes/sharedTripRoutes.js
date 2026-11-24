import { Router } from "express";
import sharedTripController from "../controllers/sharedTripController.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// no sign-in here: limited per IP before touching the database
router.use(apiLimiter);

router.get("/:token", sharedTripController.getSharedTrip); // public, read only: no write route exists

export default router;
