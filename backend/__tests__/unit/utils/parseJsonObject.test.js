import { describe, expect, it } from "vitest";
import parseJsonObject from "../../../src/utils/parseJsonObject.js";

describe("parseJsonObject", () => {
    it("parses plain JSON", () => {
        expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    });

    it("keeps the outer object of text and code fences around it", () => {
        expect(parseJsonObject('Here you go:\n```json\n{"a":{"b":2}}\n```\nEnjoy')).toEqual({ a: { b: 2 } });
    });

    it("returns undefined without an object or with broken JSON", () => {
        expect(parseJsonObject("no json")).toBeUndefined();
        expect(parseJsonObject("{ a: ")).toBeUndefined();
        expect(parseJsonObject("")).toBeUndefined();
    });
});
