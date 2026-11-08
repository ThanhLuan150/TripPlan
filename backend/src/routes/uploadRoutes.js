import { Router } from "express";
import uploadController from "../controllers/uploadController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadImage } from "../middleware/upload.js";

const router = Router();

// Images (profile pictures, challenge photos) are stored in MongoDB GridFS.
router.post("/upload/image", authenticate, requireRole("user", "admin"), uploadImage, uploadController.uploadImage); // role: user|admin — multipart field "image", JPEG/PNG/WEBP/GIF, max MAX_IMAGE_MB
router.get("/files/:id", uploadController.getFile); // public — serves an uploaded image

export default router;
