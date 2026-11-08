import { Router } from "express";
import { updateProfile, deleteAcount } from "../controllers/userController.js";
import checkAuthentication from "../middlewares/checkAuthentication.js";

const router = Router();

router.post("/profile", checkAuthentication, updateProfile)
router.post("/:id", checkAuthentication, deleteAcount)

export default router;