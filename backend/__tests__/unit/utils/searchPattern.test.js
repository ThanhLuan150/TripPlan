import { describe, expect, it } from "vitest";
import { cleanKeyword, keywordPattern, MAX_SEARCH_LENGTH } from "../../../src/utils/searchPattern.js";

const matches = (keyword, text) => new RegExp(keywordPattern(keyword), "i").test(text);

describe("cleanKeyword", () => {
    it("trims, collapses spaces and drops control characters", () => {
        expect(cleanKeyword("  da   lat \n")).toEqual({ keyword: "da lat" });
        expect(cleanKeyword("a\u0000b")).toEqual({ keyword: "a b" });
    });

    it("treats a missing keyword or only spaces as no search", () => {
        expect(cleanKeyword(undefined)).toEqual({ keyword: "" });
        expect(cleanKeyword(null)).toEqual({ keyword: "" });
        expect(cleanKeyword("   ")).toEqual({ keyword: "" });
    });

    it("rejects anything that is not text (arrays and objects from the query string)", () => {
        for (const value of [["a"], { $ne: "x" }, 5, true]) {
            expect(cleanKeyword(value)).toEqual({ error: "q must be text" });
        }
    });

    it("accepts the maximum length and rejects one more", () => {
        expect(cleanKeyword("a".repeat(MAX_SEARCH_LENGTH)).keyword).toHaveLength(MAX_SEARCH_LENGTH);
        expect(cleanKeyword("a".repeat(MAX_SEARCH_LENGTH + 1)).error).toMatch(/at most 100/);
    });
});

describe("keywordPattern", () => {
    it("matches ignoring case and Vietnamese accents, both ways", () => {
        expect(matches("ha giang", "Du lịch Hà Giang")).toBe(true);
        expect(matches("HÀ GIANG", "ha giang")).toBe(true);
        expect(matches("đà nẵng", "Da Nang")).toBe(true);
        expect(matches("da nang", "Đà Nẵng 3 ngày")).toBe(true);
        expect(matches("huế", "Hue")).toBe(true);
    });

    it("does not match a different word", () => {
        expect(matches("sapa", "Hà Giang")).toBe(false);
    });

    it("escapes regular expression characters so they are plain text", () => {
        expect(matches("a.*", "abc")).toBe(false);
        expect(matches("a.*", "a.* b")).toBe(true);
        expect(matches("(", "no bracket")).toBe(false);
        expect(() => new RegExp(keywordPattern("[(+?^$|\\{"))).not.toThrow();
        expect(matches("1+1", "1+1=2")).toBe(true);
        expect(matches("1+1", "111")).toBe(false);
    });
});
