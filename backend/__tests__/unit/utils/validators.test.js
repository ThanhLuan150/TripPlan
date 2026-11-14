import { describe, expect, it } from "vitest";
import { isEmail } from "../../../src/utils/validators.js";

describe("isEmail", () => {
    it.each(["an@example.com", "a.b+c@mail.example.co.uk", "x@y.z", "ten.chu@e-mail.vn"])("accepts %s", (value) => {
        expect(isEmail(value)).toBe(true);
    });

    it.each([
        "", "plain", "@example.com", "an@", "an@example", "an@.com", "an@example.", "a@b@c.com", "an @example.com", "an@exa mple.com", "an@@example.com",
        undefined, null, 5,
    ])("rejects %j", (value) => {
        expect(isEmail(value)).toBe(false);
    });

    it("refuses very long values at once", () => {
        expect(isEmail(`${"a".repeat(250)}@b.co`)).toBe(false);
    });

    it("is fast on the strings that made the old pattern take minutes (many repetitions of '!.')", () => {
        const start = Date.now();

        // too long: refused at once
        expect(isEmail(`!@!.${"!.".repeat(100_000)}`)).toBe(false);
        expect(isEmail(`!@!.${"!.".repeat(100_000)} `)).toBe(false);
        // within the length limit: a straight scan
        expect(isEmail(`!@!.${"!.".repeat(120)}`)).toBe(false);
        expect(isEmail(`!@!.${"!.".repeat(120)}!`)).toBe(true);

        expect(Date.now() - start).toBeLessThan(1000);
    });
});
