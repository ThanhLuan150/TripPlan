import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { getTravelKeywords, checkTravelRelated } from "../helper/travel.js";
import ChatAi from "../models/chatAiModel.js";
import Question from "../models/questionModel.js";
import Response from "../models/responseModel.js";

import { configDotenv } from "dotenv";
configDotenv();

const runChat = async (req, res) => {
    try {
        const { idChat, message } = req.body;
        const userId = req.userData._id;

        const travelKeywords = getTravelKeywords(message);
        let chatAi = await ChatAi.findOne({ userId, _id: idChat });
        let checkNewChat = false;
            let history = null;
            if (!chatAi) {
                const title = extractTitle(message);
                chatAi = new ChatAi({ userId, title })
                checkNewChat = true
                await chatAi.save();
            }
            const genAI = new GoogleGenerativeAI(process.env.API_KEY_CHAT);
            const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });
            const generationConfig = {
                temperature: 1.5,
                topK: 20,
                topP: 0.5,
                maxOutputTokens: 2048,
            };
            const safetySettings = [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ];
            if (checkNewChat == false) {
                const responses = await Response.find({ chatAiId: chatAi._id });
                const questions = await Question.find({ chatAiId: chatAi._id });
                console.log(questions);
                if (responses.length != 0 && questions != 0) {
                    let mergedArray = [
                        ...questions.map((question) => ({ role: "user", parts: question.content, createdAt: question.createdAt })),
                        ...responses.map((response) => ({ role: "model", parts: response.content, createdAt: response.createdAt }))
                    ];
                    mergedArray.sort((a, b) => a.createdAt - b.createdAt);
                    let resultArray = mergedArray.map((res) => ({ role: res.role, parts: res.parts }));
                    history = resultArray
                }
            }
            const chat = model.startChat({
                generationConfig,
                safetySettings,
                history
            });

            const result = await chat.sendMessage(message);
            const response = result.response.candidates;
            const hasContent = response.some(item => item.content)
            if (!hasContent) {
                return res.status(200).json({ message: "Đã xảy ra lỗi trong quá trình gửi tin nhắn, thử lại", chatAi })
            }
            const ChatResponse = response[0].content.parts[0].text;
            const question = new Question({ chatAiId: chatAi._id, content: message })
            await question.save();
            const responseAi = new Response({ chatAiId: chatAi._id, content: ChatResponse })
            await responseAi.save();
            return res.status(200).json({ message: "Send message successfully", data: { chatAi, ChatResponse } })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const extractTitle = (message) => {
    const words = message.split(" ");
    const titleWords = words.slice(0, 3);
    const title = titleWords.join(" ");
    return title;
}

const getDataChat = async (req, res) => {
    try {
        const userId = req.userData._id;

        const dataChat = await ChatAi.find({ userId });
        return res.status(200).json({ message: "Successfully", data: dataChat })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ messages: "Internal Server Error" })
    }
}

const getDataChatDetail = async (req, res) => {
    try {
        const chatId = req.params.id;

        const questions = await Question.find({ chatAiId: chatId });
        const responses = await Response.find({ chatAiId: chatId });

        return res.status(200).json({ message: "Successfully", questions, responses })
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

const deleteChat = async (req, res) => {
    try {
        const chatId = req.params.id;
        const userId = req.userData._id;
        const checkChat = await ChatAi.findOne({ _id: chatId, userId })

        if (!checkChat) {
            return res.status(200).json({ message: "This conversation does not exist" })
        }
        await ChatAi.deleteOne({ _id: chatId });
        await Response.deleteMany({ chatId });
        await Question.deleteMany({ chatId });

        res.status(200).json({ message: "Conversation deleted successfully" });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" })
    }
}

export { runChat, getDataChat, getDataChatDetail, deleteChat };
