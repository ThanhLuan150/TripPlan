import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import sendVerificationCodeEmail from "../email/sendVerificationCodeEmail.js";
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from "../helper/jwt.js";
import { generateVerificationCode } from "../helper/verificationCode.js";
const register = async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        if (!username || !password || !email) {
            return res.status(401).json({
                message: "Username, email or password not found"
            });
        }
        const checkUser = await User.findOne({
            $or: [
                { "username": username },
                { "email": email }
            ]
        })
        if (checkUser) {
            return res.status(401).json({
                message: "Username or email already exist"
            });
        }
        if (password !== confirmPassword) {
            return res.status(401).json({
                message: "Pasword and Confirm Password do not match"
            });
        }
        const verificationCode = generateVerificationCode();
        const hashedPassword = await bcrypt.hash(password, 10);
        sendVerificationCodeEmail(email, verificationCode);
        const newUser = new User({ username, email, password: hashedPassword, code: verificationCode })
        await newUser.save();

        return res.status(200).json({
            message: "Registration successful. Check your email to verify your account",
            email: email
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const confirmAccount = async (req, res) => {
    try {
        const { code } = req.body;
        const checkVerifiCode = await User.findOne({ code: code })
        if (!checkVerifiCode) {
            return res.status(401).json({
                message: "Your code is not correct"
            })
        }
        await User.findOneAndUpdate({ _id: checkVerifiCode._id }, { isActive: "active", code: "" });

        return res.status(200).json({
            message: "Verification successful. Your account is now active"
        })
    }
    catch (err) {
        console.log(err);
    }
}

const login = async (req, res) => {
    try {
        const { username, password, fcmToken } = req.body;
        const checkAccount = await User.findOne({ username })
        if (!checkAccount) {
            return res.status(404).json({ message: "The account is not registered" })
        }
        if (checkAccount.isActive == "delete") {
            return res.status(400).json({ message: "The account has been deleted" })
        } else if (checkAccount.isActive == "notActive") {
            return res.status(404).json({ message: "Unverified account" })
        }
        if (!password) {
            return res.status(404).json({ message: "Password not found" })
        }
        const validPassword = await bcrypt.compare(password, checkAccount.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Incorrect password" });
        }

        if (fcmToken !== undefined && fcmToken !== null) {
            checkAccount.fcmToken = fcmToken;
            checkAccount.save();
        }

        if (checkAccount && validPassword) {
            const accessToken = generateAccessToken(checkAccount);
            const refreshToken = generateRefreshToken(checkAccount);
            await User.findOneAndUpdate({
                username: username
            }, {
                refreshToken: refreshToken
            });
            let userData = JSON.parse(JSON.stringify(checkAccount));
            delete userData.refreshToken
            delete userData._id;
            delete userData.password;
            delete userData.code;
            delete userData.isActive;
            delete userData.role;
            delete userData.createdAt;
            delete userData.updatedAt;
            delete userData.__v;
            return res.status(200).json({
                message: "Login successfully",
                accessToken: accessToken,
                data: userData
            })
        }
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const refreshVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        const checkUser = await User.findOne({ email: email })

        if (!checkUser) {
            return res.status(401).json({ message: "Your account not exist" })
        }

        const newVerificationCode = generateVerificationCode();
        await User.updateOne({
            code: newVerificationCode
        })

        return res.status(200).json({ message: "The new code was successfully generated" })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const checkUser = await User.findOne({ email })
        if (!checkUser) {
            return res.status(401).json({ message: "The email is not exist" });
        }
        if (checkUser.isActive == "notActive") {
            return res.status(401).json({ message: "Your account not active" })
        }
        else if (checkUser.isActive == "delete") {
            return res.status(401).json({ message: "Your account not exist" })
        }
        const verificationCode = generateVerificationCode();
        sendVerificationCodeEmail(email, verificationCode);
        await User.updateOne(
            { email: email },
            {
                $set: { code: verificationCode }
            })
        return res.status(200).json({ message: "The new code was successfully generated" })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Servel Error" });
    }
}

const verifyCodeResetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { email } = req.body;

        const checkUser = await User.findOne({ email });
        if (!checkUser) {
            return res.status(401).json({ message: "The account is not exist" });
        }
        if (token != checkUser.code) {
            return res.status(401).json({ message: "Your code is incorect" });
        }

        await User.findOneAndUpdate({ _id: checkUser._id }, { code: "" })
        return res.status(200).json({ message: "Code verification successful", userId: checkUser._id })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Servel Error" });
    }
}

const resetPassword = async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        const checkUser = await User.find({ email });
        console.log(email);
        if (!checkUser) {
            return res.status(401).json({ message: "The account is not exist" });
        }

        if (password !== confirmPassword) {
            return res.status(401).json({ message: "Password and Confirm Password do not match" })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.findOneAndUpdate({ email: email }, { password: hashedPassword });
        return res.status(200).json({ message: "Update password successfully" })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Servel Error" });
    }
}

const refreshToken = async (req, res) => {
    try {
        const { token } = req.req.headers.authorization;
        const tokenArray = token.split(' ');
        const accessToken = tokenArray[1];

        if (!token) {
            return res.status(400).json({ message: "Missing token parameter" });
        }
        const newToken = verifyAccessToken(accessToken);
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Servel Error" });
    }
}

export {
    register,
    confirmAccount,
    refreshVerificationCode,
    verifyCodeResetPassword,
    login,
    forgotPassword,
    resetPassword,
    refreshToken
}