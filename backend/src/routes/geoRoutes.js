import { Router } from "express";
import geoController from "../controllers/geoController.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (it calls an outside service)
router.use(apiLimiter);

router.get("/reverse", geoController.reverse); // public — ?lat=&lng= -> { province }
router.get("/route", geoController.route); // public — ?fromLat=&fromLng=&toLat=&toLng= -> { distance, duration, path, steps }

export default router;
