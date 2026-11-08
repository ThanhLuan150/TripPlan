import imageRepository from "../repositories/imageRepository.js";
import HttpError from "../utils/HttpError.js";
import { detectImageType } from "../utils/imageType.js";

// Stores an uploaded image and returns its public URL (GET /files/:id).
const saveUpload = async (user, file, baseUrl) => {
    if (!file?.buffer?.length) {
        throw new HttpError(400, "No image in the \"image\" field", { code: "IMAGE_MISSING" });
    }
    // trust the file content, not the type sent by the browser
    const detected = detectImageType(file.buffer);
    if (!detected) {
        throw new HttpError(400, "Only JPEG, PNG, WEBP or GIF images", { code: "IMAGE_TYPE" });
    }
    const id = await imageRepository.save(file.buffer, {
        filename: `${user._id}-${Date.now()}.${detected.ext}`,
        contentType: detected.type,
        metadata: { userId: user._id, originalName: file.originalname?.slice(0, 200) },
    });
    return { message: "Upload image successfully", id, url: `${baseUrl}/files/${id}` };
};

export default { saveUpload };
