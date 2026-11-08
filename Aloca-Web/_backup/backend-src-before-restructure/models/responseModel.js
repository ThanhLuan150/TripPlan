import mongoose from "mongoose";

const responseSchema = mongoose.Schema({
    chatAiId: { type: mongoose.Schema.ObjectId, ref: "ChatAi" },
    createdAt: { type: Date, default: Date.now },
    content: String,
})

const Response = mongoose.model("Response", responseSchema);

export default Response;
