const generateVerificationCode = () => {
    const min = 0;
    const max = 999999;
    const randomCode = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomCode.toString().padStart(6, "0");
}

export { generateVerificationCode } 