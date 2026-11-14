import { Router } from "express";
import challengeController from "../controllers/challengeController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { ownChallenge } from "../middleware/ownership.js";

const router = Router();

router.use(authenticate, requireRole("user", "admin"));

router.post("/checkProgress", ownChallenge, challengeController.checkProgress);   // role: user|admin + challenge in own trip — { chaId, lat, lng }
router.post("/updateProgress", ownChallenge, logActivity("completeChallenge", (req) => String(req.body?.chaId ?? "")), challengeController.updateProgress); // role: user|admin + challenge in own trip — { chaId, imageUrl }; points awarded once

export default router;
