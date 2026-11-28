import { Router } from "express";
import userController from "../controllers/userController.js";
import followController from "../controllers/followController.js";
import authenticate from "../middleware/auth.js";
import logActivity from "../middleware/logActivity.js";
import requireRole from "../middleware/requireRole.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

router.post("/profile", authenticate, requireRole("user", "admin"), logActivity("updateProfile"), userController.updateProfile); // role: user|admin — own profile
router.get("/preferences", authenticate, requireRole("user", "admin"), userController.getPreferences);       // role: user|admin — own AI travel preferences
router.put("/preferences", authenticate, requireRole("user", "admin"), logActivity("updateProfile"), userController.savePreferences); // role: user|admin — { categories?, notes? }, own only
router.delete("/preferences", authenticate, requireRole("user", "admin"), logActivity("updateProfile"), userController.clearPreferences); // role: user|admin — clears own preferences
router.get("/:id/profile", authenticate, requireRole("user", "admin"), followController.getProfile);   // role: user|admin — public profile of an account (:id or "me") + followers count + isFollowing
router.post("/:id/follow", authenticate, requireRole("user", "admin"), followController.follow);   // role: user|admin — follow :id (not yourself, no duplicate)
router.delete("/:id/follow", authenticate, requireRole("user", "admin"), followController.unfollow); // role: user|admin — unfollow :id
router.post("/:id", authenticate, requireRole("user", "admin"), userController.deleteAccount);    // role: user (own account) | admin (any :id) — soft delete

export default router;
