import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake @google/genai: every chat created by the code shares `sendMessage`.
const { create, sendMessage } = vi.hoisted(() => {
    const sendMessage = vi.fn();
    return { sendMessage, create: vi.fn(() => ({ sendMessage })) };
});

vi.mock("@google/genai", () => ({
    GoogleGenAI: class {
        constructor() {
            this.chats = { create };
        }
    },
    HarmBlockThreshold: { BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE" },
    HarmCategory: {
        HARM_CATEGORY_HARASSMENT: "HARASSMENT",
        HARM_CATEGORY_HATE_SPEECH: "HATE_SPEECH",
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "SEXUALLY_EXPLICIT",
        HARM_CATEGORY_DANGEROUS_CONTENT: "DANGEROUS_CONTENT",
    },
}));

const { startChat, getResponseText } = await import("../../../src/utils/gemini.js");
const { default: HttpError } = await import("../../../src/utils/HttpError.js");

// MODEL_NAME=model-a, MODEL_FALLBACKS="model-b, model-c" (vitest.config.js)
const usedModels = () => create.mock.calls.map(([options]) => options.model);

const apiError = (message, status) => Object.assign(new Error(message), { status });

describe("startChat().sendMessage", () => {
    beforeEach(() => {
        sendMessage.mockReset();
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    it("answers with the main model when it works", async () => {
        sendMessage.mockResolvedValueOnce({ text: "Xin chào" });

        const result = await startChat({ maxOutputTokens: 100 }).sendMessage("hi");

        expect(result).toEqual({ text: "Xin chào" });
        expect(usedModels()).toEqual(["model-a"]);
        expect(sendMessage).toHaveBeenCalledWith({ message: "hi" });
        expect(create.mock.calls[0][0]).toMatchObject({
            history: [],
            config: { maxOutputTokens: 100, httpOptions: { timeout: 60000 } },
        });
    });

    it("passes the conversation history and timeout through", async () => {
        sendMessage.mockResolvedValueOnce({ text: "ok" });
        const history = [{ role: "user", parts: [{ text: "trước đó" }] }];

        await startChat({ maxOutputTokens: 10, history, timeoutMs: 5 }).sendMessage("tiếp");

        expect(create.mock.calls[0][0]).toMatchObject({ history, config: { httpOptions: { timeout: 5 } } });
    });

    it("falls back to the next model when the main one is overloaded", async () => {
        sendMessage
            .mockRejectedValueOnce(apiError("The model is overloaded", 503))
            .mockResolvedValueOnce({ text: "from b" });

        const result = await startChat({ maxOutputTokens: 10 }).sendMessage("hi");

        expect(result).toEqual({ text: "from b" });
        expect(usedModels()).toEqual(["model-a", "model-b"]);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"model-a" is overloaded'));
    });

    it("throws 503 with the error code when every model fails", async () => {
        sendMessage.mockRejectedValue(apiError("RESOURCE_EXHAUSTED", 429));

        const error = await startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch((e) => e);

        expect(error).toBeInstanceOf(HttpError);
        expect(error.status).toBe(503);
        expect(error.body).toEqual({ code: "AI_QUOTA" });
        expect(usedModels()).toEqual(["model-a", "model-b", "model-c"]);
    });

    it.each([
        ["model gone (404)", apiError("models/x is not found", 404), "AI_MODEL_NOT_FOUND"],
        ["deadline", apiError("DEADLINE_EXCEEDED"), "AI_TIMEOUT"],
        ["aborted request", apiError("AbortError: aborted"), "AI_TIMEOUT"],
        ["internal error", apiError("INTERNAL", 500), "AI_BUSY"],
    ])("tries the fallbacks on a %s", async (label, err, code) => {
        sendMessage.mockRejectedValue(err);

        const error = await startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch((e) => e);

        expect(error.body.code).toBe(code);
        expect(create).toHaveBeenCalledTimes(3);
    });

    it.each([
        ["suspended project", apiError("CONSUMER_SUSPENDED"), "AI_KEY_SUSPENDED"],
        ["invalid key", apiError("API key not valid. Please pass a valid API key.", 400), "AI_KEY_INVALID"],
        ["permission denied", apiError("forbidden", 403), "AI_KEY_INVALID"],
        ["unknown failure", apiError("something   strange\nhappened"), "AI_ERROR"],
    ])("stops at once on a %s", async (label, err, code) => {
        sendMessage.mockRejectedValue(err);

        const error = await startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch((e) => e);

        expect(error.body.code).toBe(code);
        expect(create).toHaveBeenCalledTimes(1);
    });

    it("classifies a rejection that is not an Error", async () => {
        sendMessage.mockRejectedValue("socket hang up");

        const error = await startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch((e) => e);

        expect(error.body.code).toBe("AI_ERROR");
        expect(console.error).toHaveBeenCalledWith("[ai] socket hang up");
    });

    it("logs the model Google suggests when a model is retired", async () => {
        sendMessage.mockRejectedValue(apiError("model is no longer available, use models/gemini-next instead", 404));

        await startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch(() => {});

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Google suggests gemini-next"));
    });
});

describe("getResponseText", () => {
    it("returns the trimmed text", () => {
        expect(getResponseText({ text: "  hello \n" })).toBe("hello");
    });

    it("returns null and logs the reason when there is no text", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(getResponseText({ text: "", candidates: [{ finishReason: "SAFETY" }] })).toBeNull();
        expect(getResponseText({ promptFeedback: { blockReason: "OTHER" } })).toBeNull();
        expect(getResponseText(undefined)).toBeNull();

        expect(warn).toHaveBeenNthCalledWith(1, expect.stringContaining("SAFETY"));
        expect(warn).toHaveBeenNthCalledWith(2, expect.stringContaining("OTHER"));
        expect(warn).toHaveBeenNthCalledWith(3, expect.stringContaining("unknown reason"));
    });
});

describe("without API key / model", () => {
    it("reports AI_NOT_CONFIGURED", async () => {
        vi.resetModules();
        vi.doMock("../../../src/config/env.js", () => ({
            default: { geminiApiKey: undefined, geminiModel: undefined, geminiFallbacks: [] },
        }));
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const gemini = await import("../../../src/utils/gemini.js");

        const error = await gemini.startChat({ maxOutputTokens: 10 }).sendMessage("hi").catch((e) => e);

        expect(error.status).toBe(503);
        expect(error.body).toEqual({ code: "AI_NOT_CONFIGURED" });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("API_KEY_CHAT or MODEL_NAME missing"));
        vi.doUnmock("../../../src/config/env.js");
    });
});
