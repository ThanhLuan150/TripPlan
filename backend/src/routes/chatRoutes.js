import { Router } from "express";
import chatController from "../controllers/chatController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { ownChat } from "../middleware/ownership.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

router.use(authenticate, requireRole("user", "admin"));

router.get("/", chatController.listChats);                       // role: user|admin — own conversations
router.get("/:id", ownChat, chatController.getChatDetail);       // role: user|admin + owner of the conversation
router.post("/", logActivity("useAi", (req) => String(req.body?.message ?? "").slice(0, 80)), chatController.sendMessage);                    // role: user|admin — { message, idChat? }
router.delete("/:id", ownChat, chatController.deleteChat);       // role: user|admin + owner of the conversation

export default router;
