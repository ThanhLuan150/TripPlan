import { Router } from "express";
import publicTripController from "../controllers/publicTripController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// limited per IP before touching the database (the readers are not signed in)
router.use(apiLimiter);

router.get("/", publicTripController.listPublicTrips);   // no sign-in: cards of public trips, ?page&limit
router.get("/:id", publicTripController.getPublicTrip);  // no sign-in: public trips only, read only
router.post("/:id/copy", authenticate, requireRole("user", "admin"), logActivity("createTrip", (req) => `copy of public trip ${req.params.id}`), publicTripController.copyPublicTrip); // role: user|admin — private copy owned by req.user

export default router;
