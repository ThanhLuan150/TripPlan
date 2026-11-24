import { external } from "./state.js";

// Instead of sending a Gmail message, remember it.
export const sendVerificationCodeEmail = (email, code) => {
    external.mails.push({ email, code });
};
