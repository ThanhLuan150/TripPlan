import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake GridFS bucket: records how it is used
const { bucket, FakeBucket } = vi.hoisted(() => {
    const bucket = {
        options: [],
        upload: null,
        files: [],
        openUploadStream: null,
        openDownloadStream: null,
        delete: null,
        findQuery: null,
    };
    class FakeBucket {
        constructor(db, options) {
            bucket.options.push({ db, options });
        }
        openUploadStream(...args) {
            return bucket.openUploadStream(...args);
        }
        find(query) {
            bucket.findQuery = query;
            return { limit: () => ({ toArray: async () => bucket.files }) };
        }
        openDownloadStream(id) {
            return bucket.openDownloadStream(id);
        }
        delete(id) {
            return bucket.delete(id);
        }
    }
    return { bucket, FakeBucket };
});

vi.mock("mongoose", async (importOriginal) => {
    const real = (await importOriginal()).default;
    return {
        default: {
            mongo: { GridFSBucket: FakeBucket },
            connection: { db: "the-db" },
            isValidObjectId: real.isValidObjectId,
            Types: real.Types,
        },
    };
});

const { default: imageRepository } = await import("../../../src/repositories/imageRepository.js");

const ID = "64b0000000000000000000aa";

beforeEach(() => {
    bucket.options = [];
    bucket.files = [];
    bucket.findQuery = null;
    bucket.openDownloadStream = vi.fn(() => "download-stream");
    bucket.delete = vi.fn(async () => undefined);
});

// writable stream double: end() then "finish" or "error"
const uploadStream = () => {
    const stream = new EventEmitter();
    stream.id = "new-file-id";
    stream.end = vi.fn();
    return stream;
};

describe("imageRepository", () => {
    it("stores the file in the 'images' bucket and resolves with its id", async () => {
        const stream = uploadStream();
        bucket.openUploadStream = vi.fn(() => stream);
        const buffer = Buffer.from("png");

        const saving = imageRepository.save(buffer, { filename: "u1.png", contentType: "image/png", metadata: { userId: "u1" } });
        stream.emit("finish");

        await expect(saving).resolves.toBe("new-file-id");
        expect(bucket.options[0]).toEqual({ db: "the-db", options: { bucketName: "images" } });
        expect(bucket.openUploadStream).toHaveBeenCalledWith("u1.png", { contentType: "image/png", metadata: { userId: "u1" } });
        expect(stream.end).toHaveBeenCalledWith(buffer);
    });

    it("rejects when the upload fails", async () => {
        const stream = uploadStream();
        bucket.openUploadStream = vi.fn(() => stream);

        const saving = imageRepository.save(Buffer.from("x"), { filename: "f", contentType: "image/png" });
        stream.emit("error", new Error("disk full"));

        await expect(saving).rejects.toThrow("disk full");
    });

    it("finds a file by id", async () => {
        bucket.files = [{ _id: ID, contentType: "image/png" }];

        await expect(imageRepository.findById(ID)).resolves.toEqual({ _id: ID, contentType: "image/png" });
        expect(String(bucket.findQuery._id)).toBe(ID);
    });

    it("returns null for an unknown or invalid id", async () => {
        await expect(imageRepository.findById(ID)).resolves.toBeNull();
        await expect(imageRepository.findById("not-an-id")).resolves.toBeNull();
        expect(bucket.findQuery).toEqual({ _id: expect.anything() }); // only the valid id was queried
    });

    it("opens a download stream", () => {
        expect(imageRepository.openDownloadStream(ID)).toBe("download-stream");
        expect(String(bucket.openDownloadStream.mock.calls[0][0])).toBe(ID);
    });

    it("removes a file, ignoring invalid ids", async () => {
        await imageRepository.remove(ID);
        await imageRepository.remove("nope");

        expect(bucket.delete).toHaveBeenCalledOnce();
        expect(String(bucket.delete.mock.calls[0][0])).toBe(ID);
    });
});
