import { Router } from "express";
import { createTrip, saveTripPlanner, getTrip, getDetailTrip, deleteTrip, getLocation } from "../controllers/tripplanerController.js";
import checkAuthentication from "../middlewares/checkAuthentication.js";

const router = Router();

router.post("/", createTrip)
router.post("/save-trip", checkAuthentication, saveTripPlanner)
router.get("/get-trip", checkAuthentication, getTrip)
router.get("/get-trip/:id", checkAuthentication, getDetailTrip)
router.delete("/:id", checkAuthentication, deleteTrip)
router.get("/location/:id", checkAuthentication, getLocation)

export default router;