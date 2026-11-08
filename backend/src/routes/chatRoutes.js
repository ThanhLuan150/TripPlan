import { Router } from "express";
import chatController from "../controllers/chatController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { ownChat } from "../middleware/ownership.js";

const router = Router();

router.use(authenticate, requireRole("user", "admin"));

router.get("/", chatController.listChats);                       // role: user|admin — own conversations
router.get("/:id", ownChat, chatController.getChatDetail);       // role: user|admin + owner of the conversation
router.post("/", chatController.sendMessage);                    // role: user|admin — { message, idChat? }
router.delete("/:id", ownChat, chatController.deleteChat);       // role: user|admin + owner of the conversation

export default router;
