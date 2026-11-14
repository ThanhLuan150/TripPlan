import { Router } from "express";
import tripPlanController from "../controllers/tripPlanController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { ownTrip } from "../middleware/ownership.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

router.use(authenticate, requireRole("user", "admin"));

router.post("/", tripPlanController.generatePlans);                      // role: user|admin — AI suggestions, nothing saved
router.post("/save-trip", logActivity("createTrip", (req) => req.body?.nameTrip), tripPlanController.saveTrip);                  // role: user|admin — saves the chosen plan for req.user
router.get("/get-trip", tripPlanController.listTrips);                   // role: user|admin — own trips
router.get("/get-trip/:id", ownTrip, tripPlanController.getTripDetail);  // role: user|admin + owner of the trip
router.delete("/:id", ownTrip, tripPlanController.deleteTrip);           // role: user|admin + owner of the trip — soft delete
router.get("/location/:id", ownTrip, tripPlanController.getTripLocations); // role: user|admin + owner of the trip

export default router;
