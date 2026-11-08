import multer from "multer";
import env from "../config/env.js";
import HttpError from "../utils/HttpError.js";
import { ALLOWED_IMAGE_TYPES } from "../utils/imageType.js";

// One image in the "image" field of a multipart/form-data request, kept in
// memory (it is then stored in MongoDB by imageService).
const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxImageMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return cb(new HttpError(400, "Only JPEG, PNG, WEBP or GIF images", { code: "IMAGE_TYPE" }));
        }
        cb(null, true);
    },
}).single("image");

// Runs multer and turns its errors into HttpErrors.
export const uploadImage = (req, res, next) => {
    imageUpload(req, res, (err) => {
        if (!err) {
            return next();
        }
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return next(new HttpError(413, `Image is larger than ${env.maxImageMb} MB`, { code: "IMAGE_TOO_LARGE" }));
            }
            return next(new HttpError(400, `Upload error: ${err.code}`, { code: "UPLOAD_ERROR" }));
        }
        next(err);
    });
};
