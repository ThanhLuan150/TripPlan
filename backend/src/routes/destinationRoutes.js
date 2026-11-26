import { Router } from "express";
import destinationController from "../controllers/destinationController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

router.use(authenticate, requireRole("user", "admin"));

router.post("/recommend", logActivity("useAi", (req) => String(req.body?.query ?? "").slice(0, 80)), destinationController.recommend); // role: user|admin — { query?, interests?, region?, budget? }; AI suggestions, saved only as a history entry

router.get("/history", destinationController.listHistory);          // role: user|admin — own past suggestions, ?status=draft|created
router.get("/history/:id", destinationController.getHistory);       // role: user|admin — one of own suggestions, with its places
router.patch("/history/:id", destinationController.updateHistory);  // role: user|admin — { status: "draft" | "created", tripId? }
router.delete("/history/:id", destinationController.removeHistory); // role: user|admin — deletes only the caller's own suggestion

export default router;
