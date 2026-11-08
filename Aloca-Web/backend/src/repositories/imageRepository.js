import mongoose from "mongoose";

// Images are stored in MongoDB GridFS (collections images.files / images.chunks),
// so they live in the same Atlas database as the rest of the data.
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "images" });

const toId = (id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(String(id)) : null);

const save = (buffer, { filename, contentType, metadata }) =>
    new Promise((resolve, reject) => {
        const stream = bucket().openUploadStream(filename, { contentType, metadata });
        stream.once("error", reject);
        stream.once("finish", () => resolve(stream.id));
        stream.end(buffer);
    });

// File document ({ _id, length, contentType, metadata, ... }) or null
const findById = async (id) => {
    const _id = toId(id);
    return _id ? (await bucket().find({ _id }).limit(1).toArray())[0] ?? null : null;
};

const openDownloadStream = (id) => bucket().openDownloadStream(toId(id));

const remove = async (id) => {
    const _id = toId(id);
    if (_id) {
        await bucket().delete(_id);
    }
};

export default { save, findById, openDownloadStream, remove };
