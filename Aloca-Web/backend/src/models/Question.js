import mongoose from "mongoose";

const questionSchema = mongoose.Schema({
    chatAiId: { type: mongoose.Schema.ObjectId, ref: "ChatAi" },
    content: String,
    createdAt: { type: Date, default: Date.now }
})

const Question = mongoose.model("Question", questionSchema);

export default Question;
