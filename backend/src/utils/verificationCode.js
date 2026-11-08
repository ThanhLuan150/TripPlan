// 6-digit code sent by email (account confirmation, password reset)
const generateVerificationCode = () => {
    const randomCode = Math.floor(Math.random() * 1000000);
    return randomCode.toString().padStart(6, "0");
};

export { generateVerificationCode };
