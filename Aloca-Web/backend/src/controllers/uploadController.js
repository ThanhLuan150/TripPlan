import env from "../config/env.js";
import imageRepository from "../repositories/imageRepository.js";
import imageService from "../services/imageService.js";
import asyncHandler from "../utils/asyncHandler.js";
import HttpError from "../utils/HttpError.js";
import { ALLOWED_IMAGE_TYPES } from "../utils/imageType.js";

const baseUrl = (req) => env.publicUrl || `${req.protocol}://${req.get("host")}`;

// POST /upload/image (multipart, field "image") -> { url, id }
const uploadImage = asyncHandler(async (req, res) => {
    res.status(201).json(await imageService.saveUpload(req.user, req.file, baseUrl(req)));
});

// GET /files/:id -> the image bytes
const getFile = asyncHandler(async (req, res) => {
    const file = await imageRepository.findById(req.params.id);
    if (!file || !ALLOWED_IMAGE_TYPES.includes(file.contentType)) {
        throw new HttpError(404, "File not found");
    }
    res.set({
        "Content-Type": file.contentType,
        "Content-Length": file.length,
        // an id always points to the same bytes
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        "Cross-Origin-Resource-Policy": "cross-origin",
    });
    imageRepository
        .openDownloadStream(file._id)
        .on("error", (err) => {
            console.log(err);
            res.destroy(err);
        })
        .pipe(res);
});

export default { uploadImage, getFile };
