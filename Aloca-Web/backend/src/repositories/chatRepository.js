import ChatAi from "../models/ChatAi.js";
import Question from "../models/Question.js";
import Response from "../models/Response.js";

const findOwned = (chatId, userId) => ChatAi.findOne({ _id: chatId, userId });

// most recently used first
const listByUser = (userId) => ChatAi.find({ userId }).sort({ updatedAt: -1, createdAt: -1 });

const touch = (chatAiId) => ChatAi.updateOne({ _id: chatAiId }, { updatedAt: new Date() });

const create = (data) => ChatAi.create(data);

const findQuestions = (chatAiId) => Question.find({ chatAiId }).sort({ createdAt: 1 });

const findResponses = (chatAiId) => Response.find({ chatAiId }).sort({ createdAt: 1 });

const saveQuestion = (chatAiId, content) => Question.create({ chatAiId, content });

const saveResponse = (chatAiId, content) => Response.create({ chatAiId, content });

const deleteWithMessages = async (chatAiId) => {
    await ChatAi.deleteOne({ _id: chatAiId });
    await Response.deleteMany({ chatAiId });
    await Question.deleteMany({ chatAiId });
};

export default {
    findOwned,
    listByUser,
    touch,
    create,
    findQuestions,
    findResponses,
    saveQuestion,
    saveResponse,
    deleteWithMessages,
};
