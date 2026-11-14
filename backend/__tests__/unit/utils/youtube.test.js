import { describe, expect, it } from "vitest";
import { youtubeId, youtubeThumbnail } from "../../../src/utils/youtube.js";

describe("youtubeId", () => {
    it.each([
        ["https://www.youtube.com/watch?v=abcdefghijk", "abcdefghijk"],
        ["https://youtube.com/watch?v=abcdefghijk&t=3", "abcdefghijk"],
        ["https://youtu.be/abcdefghijk?si=x", "abcdefghijk"],
        ["https://youtube.com/shorts/abcdefghijk?si=x", "abcdefghijk"],
        ["https://www.youtube.com/embed/abcdefghijk", "abcdefghijk"],
        ["https://www.youtube.com/live/abcdefghijk", "abcdefghijk"],
    ])("%s -> %s", (link, id) => {
        expect(youtubeId(link)).toBe(id);
    });

    it.each(["https://example.com/watch?v=abcdefghijk", "https://youtu.be/", "https://youtube.com/shorts/", "not a url", "", undefined])(
        "has none in %j",
        (link) => {
            expect(youtubeId(link)).toBeNull();
        },
    );
});

describe("youtubeThumbnail", () => {
    it("is the still image of the video, or empty", () => {
        expect(youtubeThumbnail("https://youtu.be/abcdefghijk")).toBe("https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg");
        expect(youtubeThumbnail("https://example.com")).toBe("");
    });
});
