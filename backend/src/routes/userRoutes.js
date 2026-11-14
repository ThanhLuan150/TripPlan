import { Router } from "express";
import userController from "../controllers/userController.js";
import authenticate from "../middleware/auth.js";
import logActivity from "../middleware/logActivity.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.post("/profile", authenticate, requireRole("user", "admin"), logActivity("updateProfile"), userController.updateProfile); // role: user|admin — own profile
router.post("/:id", authenticate, requireRole("user", "admin"), userController.deleteAccount);    // role: user (own account) | admin (any :id) — soft delete

export default router;
