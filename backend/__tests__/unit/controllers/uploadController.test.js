import { PassThrough, Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import imageRepository from "../../../src/repositories/imageRepository.js";
import imageService from "../../../src/services/imageService.js";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/repositories/imageRepository.js", () => ({
    default: { findById: vi.fn(), openDownloadStream: vi.fn() },
}));
vi.mock("../../../src/services/imageService.js", () => ({ default: { saveUpload: vi.fn() } }));

const { default: uploadController } = await import("../../../src/controllers/uploadController.js");

const req = (extra = {}) =>
    mockReq({ protocol: "http", get: (name) => (name === "host" ? "localhost:8080" : undefined), ...extra });

// A writable response that collects the streamed bytes
const streamRes = () => {
    const res = new PassThrough();
    res.set = vi.fn(() => res);
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    res.body = () => Buffer.concat(chunks);
    return res;
};

beforeEach(() => {
    vi.resetAllMocks();
});

describe("uploadImage", () => {
    it("builds the public URL from the request when PUBLIC_URL is not set", async () => {
        imageService.saveUpload.mockResolvedValue({ url: "http://localhost:8080/files/1" });
        const file = { buffer: Buffer.from("x") };
        const user = { _id: "u1" };

        const { res } = await callController(uploadController.uploadImage, req({ user, file }));

        expect(imageService.saveUpload).toHaveBeenCalledWith(user, file, "http://localhost:8080");
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("uses PUBLIC_URL when it is set", async () => {
        vi.resetModules();
        vi.doMock("../../../src/config/env.js", () => ({ default: { publicUrl: "https://api.example.com" } }));
        const { default: controller } = await import("../../../src/controllers/uploadController.js");
        const { default: service } = await import("../../../src/services/imageService.js");
        service.saveUpload.mockResolvedValue({});

        await callController(controller.uploadImage, req({ user: { _id: "u1" }, file: {} }));

        expect(service.saveUpload).toHaveBeenCalledWith({ _id: "u1" }, {}, "https://api.example.com");
        vi.doUnmock("../../../src/config/env.js");
    });
});

describe("getFile", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("answers 404 for an unknown file", async () => {
        imageRepository.findById.mockResolvedValue(null);

        const { err } = await callController(uploadController.getFile, req({ params: { id: "nope" } }));

        expect(err).toMatchObject({ status: 404, message: "File not found" });
    });

    it("never serves a non-image file", async () => {
        imageRepository.findById.mockResolvedValue({ _id: "f1", contentType: "image/svg+xml", length: 10 });

        const { err } = await callController(uploadController.getFile, req({ params: { id: "f1" } }));

        expect(err).toMatchObject({ status: 404 });
        expect(imageRepository.openDownloadStream).not.toHaveBeenCalled();
    });

    it("streams the image with its type, length and safe cache headers", async () => {
        const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
        imageRepository.findById.mockResolvedValue({ _id: "f1", contentType: "image/jpeg", length: bytes.length });
        imageRepository.openDownloadStream.mockReturnValue(Readable.from([bytes]));
        const res = streamRes();

        uploadController.getFile(req({ params: { id: "f1" } }), res, vi.fn());
        await new Promise((resolve) => res.on("end", resolve));

        expect(imageRepository.openDownloadStream).toHaveBeenCalledWith("f1");
        expect(res.set).toHaveBeenCalledWith(
            expect.objectContaining({
                "Content-Type": "image/jpeg",
                "Content-Length": 4,
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "public, max-age=31536000, immutable",
            }),
        );
        expect(res.body()).toEqual(bytes);
    });

    it("destroys the response when the download fails half-way", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        imageRepository.findById.mockResolvedValue({ _id: "f1", contentType: "image/png", length: 10 });
        const failure = new Error("FileNotFound: chunk missing");
        const download = new PassThrough();
        imageRepository.openDownloadStream.mockReturnValue(download);
        const res = streamRes();
        res.on("error", () => {});
        const destroy = vi.spyOn(res, "destroy");

        uploadController.getFile(req({ params: { id: "f1" } }), res, vi.fn());
        await vi.waitFor(() => expect(imageRepository.openDownloadStream).toHaveBeenCalled());
        download.emit("error", failure);

        expect(console.log).toHaveBeenCalledWith(failure);
        expect(destroy).toHaveBeenCalledWith(failure);
    });
});
