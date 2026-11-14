import { beforeEach, describe, expect, it, vi } from "vitest";
import userService from "../../../src/services/userService.js";
import imageService from "../../../src/services/imageService.js";
import userRepository from "../../../src/repositories/userRepository.js";
import imageRepository from "../../../src/repositories/imageRepository.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { updateById: vi.fn() } }));
vi.mock("../../../src/repositories/imageRepository.js", () => ({ default: { save: vi.fn() } }));

beforeEach(() => {
    vi.resetAllMocks();
});

describe("userService.updateProfile", () => {
    it("updates only the profile fields that were sent", async () => {
        userRepository.updateById.mockResolvedValue({});

        await userService.updateProfile("u1", { fullname: "Lan", phone: "0901", role: "admin", password: "x" });

        expect(userRepository.updateById).toHaveBeenCalledWith("u1", {
            fullname: "Lan",
            phone: "0901",
            updatedAt: expect.any(Date),
        });
    });

    it("keeps empty strings (clearing a field) but rejects an empty body", async () => {
        await userService.updateProfile("u1", { address: "" });
        expect(userRepository.updateById.mock.calls[0][1]).toMatchObject({ address: "" });

        await expect(userService.updateProfile("u1", { role: "admin" })).rejects.toMatchObject({ status: 400 });
    });
});

describe("userService.deleteAccount", () => {
    it("lets a user delete only their own account, whatever id is sent", async () => {
        userRepository.updateById.mockResolvedValue({ _id: "u1" });

        await userService.deleteAccount({ _id: "u1", role: "user" }, "u2");

        expect(userRepository.updateById).toHaveBeenCalledWith("u1", { isActive: "delete" });
    });

    it("lets an admin delete any account", async () => {
        userRepository.updateById.mockResolvedValue({ _id: "u2" });

        await userService.deleteAccount({ _id: "admin1", role: "admin" }, "u2");
        expect(userRepository.updateById).toHaveBeenCalledWith("u2", { isActive: "delete" });

        await userService.deleteAccount({ _id: "admin1", role: "admin" }, undefined);
        expect(userRepository.updateById).toHaveBeenLastCalledWith("admin1", { isActive: "delete" });
    });

    it("answers 404 for an unknown account", async () => {
        userRepository.updateById.mockResolvedValue(null);
        await expect(userService.deleteAccount({ _id: "admin1", role: "admin" }, "ghost")).rejects.toMatchObject({ status: 404 });
    });
});

describe("imageService.saveUpload", () => {
    const user = { _id: "u1" };
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

    it("needs a non-empty file", async () => {
        await expect(imageService.saveUpload(user, undefined, "http://api")).rejects.toMatchObject({
            status: 400,
            body: { code: "IMAGE_MISSING" },
        });
        await expect(imageService.saveUpload(user, { buffer: Buffer.alloc(0) }, "http://api")).rejects.toMatchObject({
            body: { code: "IMAGE_MISSING" },
        });
    });

    it("trusts the bytes, not the declared type", async () => {
        const fakePng = { buffer: Buffer.from("<script>alert(1)</script>"), mimetype: "image/png" };

        await expect(imageService.saveUpload(user, fakePng, "http://api")).rejects.toMatchObject({
            status: 400,
            body: { code: "IMAGE_TYPE" },
        });
        expect(imageRepository.save).not.toHaveBeenCalled();
    });

    it("stores the image with its detected type and returns its public URL", async () => {
        imageRepository.save.mockResolvedValue("img123");

        const result = await imageService.saveUpload(
            user,
            { buffer: png, mimetype: "image/jpeg", originalname: "a".repeat(300) },
            "https://api.example.com",
        );

        const [buffer, options] = imageRepository.save.mock.calls[0];
        expect(buffer).toBe(png);
        expect(options.filename).toMatch(/^u1-\d+\.png$/);
        expect(options.contentType).toBe("image/png");
        expect(options.metadata).toEqual({ userId: "u1", originalName: "a".repeat(200) });
        expect(result).toEqual({ message: "Upload image successfully", id: "img123", url: "https://api.example.com/files/img123" });
    });
});
