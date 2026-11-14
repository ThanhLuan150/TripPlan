import { beforeEach, describe, expect, it, vi } from "vitest";
import chatService from "../../../src/services/chatService.js";
import chatRepository from "../../../src/repositories/chatRepository.js";
import { getResponseText, startChat } from "../../../src/utils/gemini.js";

vi.mock("../../../src/repositories/chatRepository.js", () => ({
    default: {
        findOwned: vi.fn(),
        findQuestions: vi.fn(),
        findResponses: vi.fn(),
        create: vi.fn(),
        saveQuestion: vi.fn(),
        saveResponse: vi.fn(),
        touch: vi.fn(),
        listByUser: vi.fn(),
        deleteWithMessages: vi.fn(),
    },
}));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const USER = "64b000000000000000000001";
const CHAT_ID = "64b0000000000000000000c1";
const sendMessage = vi.fn();
const at = (minute) => new Date(2026, 0, 1, 10, minute);

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({ raw: true });
    chatRepository.findQuestions.mockResolvedValue([]);
    chatRepository.findResponses.mockResolvedValue([]);
});

describe("sendMessage", () => {
    it("starts a new conversation titled after the first message", async () => {
        getResponseText.mockReturnValue("Đà Lạt rất đẹp vào tháng 12.");
        chatRepository.create.mockResolvedValue({ _id: CHAT_ID });

        const result = await chatService.sendMessage(USER, { message: "  Gợi ý   đi Đà Lạt " });

        expect(startChat).toHaveBeenCalledWith({ maxOutputTokens: 2048, history: null });
        expect(sendMessage).toHaveBeenCalledWith("  Gợi ý   đi Đà Lạt ");
        expect(chatRepository.findOwned).not.toHaveBeenCalled(); // no idChat
        expect(chatRepository.create).toHaveBeenCalledWith({ userId: USER, title: "Gợi ý đi Đà Lạt" });
        expect(chatRepository.saveQuestion).toHaveBeenCalledWith(CHAT_ID, "  Gợi ý   đi Đà Lạt ");
        expect(chatRepository.saveResponse).toHaveBeenCalledWith(CHAT_ID, "Đà Lạt rất đẹp vào tháng 12.");
        expect(chatRepository.touch).toHaveBeenCalledWith(CHAT_ID);
        expect(result).toEqual({
            message: "Send message successfully",
            data: { chatAi: { _id: CHAT_ID }, ChatResponse: "Đà Lạt rất đẹp vào tháng 12." },
        });
    });

    it("cuts a long title on a word, with an ellipsis", async () => {
        getResponseText.mockReturnValue("ok");
        chatRepository.create.mockResolvedValue({ _id: CHAT_ID });
        const message = "Lên kế hoạch du lịch Hà Giang ba ngày hai đêm cho nhóm bạn sinh viên ngân sách thấp";

        await chatService.sendMessage(USER, { message });

        const { title } = chatRepository.create.mock.calls[0][0];
        expect(title.endsWith("…")).toBe(true);
        expect(title.length).toBeLessThanOrEqual(61);
        expect(message.startsWith(title.slice(0, -1))).toBe(true);
        expect(message[title.length - 1]).toBe(" "); // cut right before a space
    });

    it("cuts a long title with no space at 60 characters", async () => {
        getResponseText.mockReturnValue("ok");
        chatRepository.create.mockResolvedValue({ _id: CHAT_ID });

        await chatService.sendMessage(USER, { message: "x".repeat(80) });

        expect(chatRepository.create.mock.calls[0][0].title).toBe(`${"x".repeat(60)}…`);
    });

    it("continues an own conversation with its history in order", async () => {
        const chat = { _id: CHAT_ID };
        chatRepository.findOwned.mockResolvedValue(chat);
        chatRepository.findQuestions.mockResolvedValue([
            { content: "Q1", createdAt: at(1) },
            { content: "Q2", createdAt: at(3) },
        ]);
        chatRepository.findResponses.mockResolvedValue([{ content: "A1", createdAt: at(2) }]);
        getResponseText.mockReturnValue("A2");

        await chatService.sendMessage(USER, { idChat: CHAT_ID, message: "Q3" });

        expect(chatRepository.findOwned).toHaveBeenCalledWith(CHAT_ID, USER);
        expect(startChat.mock.calls[0][0].history).toEqual([
            { role: "user", parts: [{ text: "Q1" }] },
            { role: "model", parts: [{ text: "A1" }] },
            { role: "user", parts: [{ text: "Q2" }] },
        ]);
        expect(chatRepository.create).not.toHaveBeenCalled();
        expect(chatRepository.saveQuestion).toHaveBeenCalledWith(CHAT_ID, "Q3");
    });

    it("does not look up an invalid conversation id", async () => {
        getResponseText.mockReturnValue("ok");
        chatRepository.create.mockResolvedValue({ _id: CHAT_ID });

        await chatService.sendMessage(USER, { idChat: "../../etc", message: "hi" });

        expect(chatRepository.findOwned).not.toHaveBeenCalled();
        expect(chatRepository.create).toHaveBeenCalled();
    });

    it("saves nothing when the AI gives no answer", async () => {
        getResponseText.mockReturnValue(null);

        const result = await chatService.sendMessage(USER, { message: "hi" });

        expect(result).toEqual({ message: expect.stringContaining("Đã xảy ra lỗi"), chatAi: null });
        expect(chatRepository.create).not.toHaveBeenCalled();
        expect(chatRepository.saveQuestion).not.toHaveBeenCalled();
    });

    it("lets AI errors (HttpError 503) propagate", async () => {
        sendMessage.mockRejectedValue(Object.assign(new Error("AI service unavailable"), { status: 503 }));
        await expect(chatService.sendMessage(USER, { message: "hi" })).rejects.toMatchObject({ status: 503 });
    });
});

describe("listChats / getChatDetail / deleteChat", () => {
    it("lists the user's conversations", async () => {
        chatRepository.listByUser.mockResolvedValue([{ _id: CHAT_ID }]);

        await expect(chatService.listChats(USER)).resolves.toEqual({ message: "Successfully", data: [{ _id: CHAT_ID }] });
        expect(chatRepository.listByUser).toHaveBeenCalledWith(USER);
    });

    it("returns the conversation as one ordered timeline plus the raw lists", async () => {
        const questions = [{ content: "Q1", createdAt: at(1) }];
        const responses = [{ content: "A1", createdAt: at(2) }];
        chatRepository.findQuestions.mockResolvedValue(questions);
        chatRepository.findResponses.mockResolvedValue(responses);

        const result = await chatService.getChatDetail({ _id: CHAT_ID });

        expect(result.messages).toEqual([
            { role: "user", text: "Q1", createdAt: at(1) },
            { role: "model", text: "A1", createdAt: at(2) },
        ]);
        expect(result.questions).toBe(questions);
        expect(result.responses).toBe(responses);
    });

    it("deletes the conversation with its messages", async () => {
        await expect(chatService.deleteChat(CHAT_ID)).resolves.toEqual({ message: "Conversation deleted successfully" });
        expect(chatRepository.deleteWithMessages).toHaveBeenCalledWith(CHAT_ID);
    });
});
