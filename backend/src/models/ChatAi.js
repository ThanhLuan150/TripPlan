import mongoose from "mongoose";

// A conversation with the AI assistant; messages are in Question / Response.
const ChatAiSchema = mongoose.Schema({
    title: String,
    userId: { type: mongoose.Schema.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    // last message time, used to sort the history
    updatedAt: { type: Date, default: Date.now },
});

const ChatAi = mongoose.model("ChatAi", ChatAiSchema);

export default ChatAi;
