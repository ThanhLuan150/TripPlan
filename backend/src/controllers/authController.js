import authService from "../services/authService.js";
import asyncHandler from "../utils/asyncHandler.js";

const register = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.register(req.body));
});

const confirmAccount = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.confirmAccount(req.body));
});

const refreshVerificationCode = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.refreshVerificationCode(req.body));
});

const login = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.login(req.body));
});

const forgotPassword = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.forgotPassword(req.body));
});

const verifyCodeResetPassword = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.verifyResetCode({ email: req.body.email, code: req.params.token }));
});

const resetPassword = asyncHandler(async (req, res) => {
    res.status(200).json(await authService.resetPassword(req.body));
});

// token in the URL, or the (expired) access token in the Authorization header
const refreshToken = asyncHandler(async (req, res) => {
    const token = req.params.token || req.headers.authorization?.split(" ")[1];
    res.status(200).json(await authService.refreshAccessToken(token));
});

export default {
    register,
    confirmAccount,
    refreshVerificationCode,
    login,
    forgotPassword,
    verifyCodeResetPassword,
    resetPassword,
    refreshToken,
};
