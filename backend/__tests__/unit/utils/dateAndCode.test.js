import { describe, expect, it, vi } from "vitest";
import { getDayOfWeek } from "../../../src/utils/date.js";
import { generateVerificationCode } from "../../../src/utils/verificationCode.js";

describe("getDayOfWeek", () => {
    it.each([
        [0, "Chủ Nhật"],
        [1, "Thứ 2"],
        [6, "Thứ 7"],
    ])("maps Date#getDay() %i to %s", (index, name) => {
        expect(getDayOfWeek(index)).toBe(name);
    });

    it("returns undefined outside 0-6", () => {
        expect(getDayOfWeek(7)).toBeUndefined();
    });
});

describe("generateVerificationCode", () => {
    it("always returns 6 digits", () => {
        for (let i = 0; i < 50; i += 1) {
            expect(generateVerificationCode()).toMatch(/^\d{6}$/);
        }
    });

    it("pads small numbers with leading zeros", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.000042);
        expect(generateVerificationCode()).toBe("000042");
        vi.restoreAllMocks();
    });
});
