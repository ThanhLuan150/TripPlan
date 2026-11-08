import mongoose from "mongoose";

const ChatAiSchema = mongoose.Schema({
    title: String,
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
})

const ChatAi = mongoose.model("ChatAi", ChatAiSchema);

export default ChatAi;
