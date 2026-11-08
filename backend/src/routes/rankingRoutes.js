import { Router } from "express";
import rankingController from "../controllers/rankingController.js";

const router = Router();

// Read-only, public.
router.get("/monthly", rankingController.monthly);
router.get("/weekly", rankingController.weekly);
router.get("/rankingUserHighest", rankingController.highest);

export default router;
