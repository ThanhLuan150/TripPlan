import { beforeEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => {
    const sendMail = vi.fn();
    return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const { sendVerificationCodeEmail } = await import("../../../src/utils/mailer.js");
// the transport is created on import (before clearMocks runs between tests)
const transportOptions = createTransport.mock.calls[0]?.[0];

describe("sendVerificationCodeEmail", () => {
    beforeEach(() => {
        sendMail.mockReset();
        vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("uses the Gmail account from the settings", () => {
        expect(transportOptions).toEqual({
            service: "gmail",
            auth: { user: "noreply@example.com", pass: "test" },
        });
    });

    it("emails the code to the user", () => {
        sendVerificationCodeEmail("traveler@example.com", "042042");

        expect(sendMail).toHaveBeenCalledWith(
            {
                from: "ALOCA <noreply@example.com>",
                to: "traveler@example.com",
                subject: "[ALOCA] Account Confirmation Code",
                text: "Your account confirmation code is 042042",
            },
            expect.any(Function),
        );
    });

    it("only logs a delivery failure (fire-and-forget)", () => {
        const failure = new Error("Invalid login");
        sendMail.mockImplementation((options, callback) => callback(failure));

        expect(() => sendVerificationCodeEmail("a@b.c", "1")).not.toThrow();
        expect(console.log).toHaveBeenCalledWith(failure);
    });

    it("logs the SMTP answer on success", () => {
        sendMail.mockImplementation((options, callback) => callback(null, { response: "250 OK" }));

        sendVerificationCodeEmail("a@b.c", "1");

        expect(console.log).toHaveBeenCalledWith("Email sent 250 OK");
    });
});
