import mongoose from "mongoose";
import chatRepository from "../repositories/chatRepository.js";
import { startChat, getResponseText } from "../utils/gemini.js";

const ERROR_MESSAGE = "Đã xảy ra lỗi trong quá trình gửi tin nhắn, thử lại";
const TITLE_LENGTH = 60;

// Title of a new conversation: the start of the first message, cut on a word
const extractTitle = (message) => {
    const text = message.replace(/\s+/g, " ").trim();
    if (text.length <= TITLE_LENGTH) {
        return text;
    }
    const cut = text.slice(0, TITLE_LENGTH);
    return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : TITLE_LENGTH)}…`;
};

// Questions and answers of a conversation as one timeline:
// [{ role: "user" | "model", text, createdAt }]
const loadMessages = async (chatAiId) => {
    const [questions, responses] = await Promise.all([
        chatRepository.findQuestions(chatAiId),
        chatRepository.findResponses(chatAiId),
    ]);
    return [
        ...questions.map((q) => ({ role: "user", text: q.content, createdAt: q.createdAt })),
        ...responses.map((r) => ({ role: "model", text: r.content, createdAt: r.createdAt })),
    ].sort((a, b) => a.createdAt - b.createdAt);
};

const sendMessage = async (userId, { idChat, message }) => {
    let chatAi = mongoose.isValidObjectId(idChat) ? await chatRepository.findOwned(idChat, userId) : null;
    const history = chatAi
        ? (await loadMessages(chatAi._id)).map(({ role, text }) => ({ role, parts: [{ text }] }))
        : null;

    const chat = startChat({ maxOutputTokens: 2048, history: history?.length ? history : null });
    const result = await chat.sendMessage(message);
    const ChatResponse = getResponseText(result);
    if (ChatResponse === null) {
        return { message: ERROR_MESSAGE, chatAi };
    }
    // the conversation is only created once the AI has answered, so failed
    // first messages do not leave empty conversations in the history
    chatAi ??= await chatRepository.create({ userId, title: extractTitle(message) });
    await chatRepository.saveQuestion(chatAi._id, message);
    await chatRepository.saveResponse(chatAi._id, ChatResponse);
    await chatRepository.touch(chatAi._id);
    return { message: "Send message successfully", data: { chatAi, ChatResponse } };
};

const listChats = async (userId) => ({
    message: "Successfully",
    data: await chatRepository.listByUser(userId),
});

// `messages` is the ordered timeline; `questions` / `responses` are kept for
// older clients.
const getChatDetail = async (chat) => {
    const [questions, responses, messages] = await Promise.all([
        chatRepository.findQuestions(chat._id),
        chatRepository.findResponses(chat._id),
        loadMessages(chat._id),
    ]);
    return { message: "Successfully", chat, messages, questions, responses };
};

const deleteChat = async (chatAiId) => {
    await chatRepository.deleteWithMessages(chatAiId);
    return { message: "Conversation deleted successfully" };
};

export default { sendMessage, listChats, getChatDetail, deleteChat };
