import chatService from "../services/chatService.js";
import asyncHandler from "../utils/asyncHandler.js";

const sendMessage = asyncHandler(async (req, res) => {
    res.status(200).json(await chatService.sendMessage(req.user._id, req.body));
});

const listChats = asyncHandler(async (req, res) => {
    res.status(200).json(await chatService.listChats(req.user._id));
});

const getChatDetail = asyncHandler(async (req, res) => {
    res.status(200).json(await chatService.getChatDetail(req.chat));
});

const deleteChat = asyncHandler(async (req, res) => {
    res.status(200).json(await chatService.deleteChat(req.chat._id));
});

export default { sendMessage, listChats, getChatDetail, deleteChat };
