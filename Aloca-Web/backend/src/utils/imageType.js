// Detects the real image type from the first bytes of the file (the type the
// browser sends can be anything). Only these types are accepted and served.
const signatures = [
    { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
    { type: "image/gif", ext: "gif", test: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
    { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export const ALLOWED_IMAGE_TYPES = signatures.map((s) => s.type);

// { type, ext } or null when the buffer is not a supported image
export const detectImageType = (buffer) => {
    if (!buffer || buffer.length < 12) {
        return null;
    }
    const match = signatures.find((s) => s.test(buffer));
    return match ? { type: match.type, ext: match.ext } : null;
};
