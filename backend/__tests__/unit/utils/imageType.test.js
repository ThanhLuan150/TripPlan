import { describe, expect, it } from "vitest";
import { ALLOWED_IMAGE_TYPES, detectImageType } from "../../../src/utils/imageType.js";

// first bytes of each format, padded to the 12 bytes detectImageType needs
const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

const samples = {
    jpeg: pad([0xff, 0xd8, 0xff, 0xe0]),
    png: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    gif: pad([...Buffer.from("GIF89a")]),
    webp: Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]),
};

describe("detectImageType", () => {
    it.each([
        ["jpeg", "image/jpeg", "jpg"],
        ["png", "image/png", "png"],
        ["gif", "image/gif", "gif"],
        ["webp", "image/webp", "webp"],
    ])("recognises %s from its magic bytes", (name, type, ext) => {
        expect(detectImageType(samples[name])).toEqual({ type, ext });
    });

    it("rejects other content, whatever the extension says", () => {
        expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
        expect(detectImageType(pad([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    });

    it("rejects missing or too short buffers", () => {
        expect(detectImageType(undefined)).toBeNull();
        expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    });

    it("lists the four accepted types", () => {
        expect(ALLOWED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    });
});
