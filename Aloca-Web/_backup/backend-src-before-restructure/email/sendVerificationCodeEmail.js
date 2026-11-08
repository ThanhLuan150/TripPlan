import nodemailer from "nodemailer";
import { configDotenv } from "dotenv";
configDotenv();

const sendVerificationCodeEmail = (userEmail, verificationCode) => {
    const transporter = nodemailer.createTransport({
        service:"gmail",
        auth: {
            user: process.env.USERNAME_MAIL,
            pass: process.env.PASSWORD_MAIL
        }
    })

    const mailOptions = {
        from: "ALOCA <khanhabcdd5@gmail.com>",
        to: userEmail,
        subject: "[ALOCA] Account Confirmation Code",
        text: `Your account confirmation code is ${verificationCode}`
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Email sent " + info.response);
        }
    })
}

export default sendVerificationCodeEmail