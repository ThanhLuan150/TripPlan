import { Router } from "express";
import { checkChallengeProgress, updateChallengeProgress } from "../controllers/challengeController.js";
const router = Router();

router.post("/checkProgress", checkChallengeProgress)
router.post("/updateProgress", updateChallengeProgress)


export default router;
