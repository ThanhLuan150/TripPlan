import { Router } from "express";
import authController from "../controllers/authController.js";

const router = Router();

// All routes here are public (no token).
router.post("/register", authController.register);                         // public — create account, emails a 6-digit code
router.post("/confirm-account", authController.confirmAccount);            // public — { email, code } activates the account
router.post("/refresh-verification", authController.refreshVerificationCode); // public — { email } sends a new code
router.post("/login", authController.login);                               // public — { username, password } -> accessToken
router.post("/forgot-password", authController.forgotPassword);            // public — { email } sends a reset code
router.post("/reset-password/:token", authController.verifyCodeResetPassword); // public — :token = code, { email }; opens a 15-min reset window
router.post("/reset-password/", authController.resetPassword);             // public — { email, password, confirmPassword }; only inside the reset window
router.post("/refresh-token/:token?", authController.refreshToken);        // public — expired access token -> new one while the refresh token is valid

export default router;
