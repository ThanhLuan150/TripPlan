import nodemailer from "nodemailer";
import env from "../config/env.js";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: env.mailUser,
        pass: env.mailPassword,
    },
});

// Fire-and-forget: a mail failure is logged but does not fail the request,
// same as before.
const sendVerificationCodeEmail = (userEmail, verificationCode) => {
    const mailOptions = {
        from: `ALOCA <${env.mailUser}>`,
        to: userEmail,
        subject: "[ALOCA] Account Confirmation Code",
        text: `Your account confirmation code is ${verificationCode}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Email sent " + info.response);
        }
    });
};

export { sendVerificationCodeEmail };
