import { Router } from "express";
import { rankPerMonth, rankPerWeek, rankingUserHighest } from "../controllers/rankingController.js";
const router = Router();

router.get("/monthly", rankPerMonth)
router.get("/weekly", rankPerWeek)
router.get("/rankingUserHighest", rankingUserHighest)

export default router;
