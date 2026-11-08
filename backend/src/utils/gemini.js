import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";
import env from "../config/env.js";
import HttpError from "./HttpError.js";

// Google's current Gemini SDK (@google/genai). The old @google/generative-ai
// 0.2.x could not call today's models.
//
// MODEL_NAME is tried first, then each model of MODEL_FALLBACKS (comma
// separated) when Google answers "overloaded", "timed out", "quota reached"
// or "model not available" - Flash models are often busy on the free tier.

const safetySettings = [
    HarmCategory.HARM_CATEGORY_HARASSMENT,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }));

const models = [...new Set([env.geminiModel, ...env.geminiFallbacks].filter(Boolean))];

if (!env.geminiApiKey || models.length === 0) {
    console.warn("[ai] API_KEY_CHAT or MODEL_NAME missing in .env: chat and trip generation will not work");
}

let client = null;
const getClient = () => {
    client ??= new GoogleGenAI({ apiKey: env.geminiApiKey });
    return client;
};

// Errors worth trying the next model for
const TRY_NEXT = new Set(["AI_BUSY", "AI_TIMEOUT", "AI_QUOTA", "AI_MODEL_NOT_FOUND"]);

// Turns a Gemini failure into a code (sent to the web app) and a short,
// actionable reason (for the server log).
const classify = (err, model) => {
    const text = err?.message ?? String(err);
    const status = err?.status;
    if (!env.geminiApiKey || models.length === 0) {
        return { code: "AI_NOT_CONFIGURED", hint: "set API_KEY_CHAT and MODEL_NAME in .env" };
    }
    if (/CONSUMER_SUSPENDED|has been suspended/i.test(text)) {
        return { code: "AI_KEY_SUSPENDED", hint: "the Google project of API_KEY_CHAT is suspended: create a new key at https://aistudio.google.com/apikey" };
    }
    if (/API_KEY_INVALID|API key not valid|API key expired/i.test(text)) {
        return { code: "AI_KEY_INVALID", hint: "API_KEY_CHAT is not a valid Gemini API key" };
    }
    if (status === 404 || /NOT_FOUND|no longer available|not supported for generateContent/i.test(text)) {
        const suggested = text.match(/use models\/([\w.-]+)/)?.[1];
        return { code: "AI_MODEL_NOT_FOUND", hint: `model "${model}" is not available${suggested ? ` (Google suggests ${suggested})` : ""}` };
    }
    if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(text)) {
        return { code: "AI_QUOTA", hint: `quota / rate limit reached for "${model}" (free tier limits: https://ai.google.dev/gemini-api/docs/rate-limits)` };
    }
    if (status === 504 || /DEADLINE_EXCEEDED|timed? ?out|AbortError|aborted/i.test(text)) {
        return { code: "AI_TIMEOUT", hint: `"${model}" did not answer in time` };
    }
    if (status === 503 || status === 500 || /UNAVAILABLE|high demand|overloaded|INTERNAL/i.test(text)) {
        return { code: "AI_BUSY", hint: `"${model}" is overloaded right now` };
    }
    if (status === 403 || /PERMISSION_DENIED/i.test(text)) {
        return { code: "AI_KEY_INVALID", hint: "Gemini refused the API key (permission denied)" };
    }
    return { code: "AI_ERROR", hint: text.replace(/\s+/g, " ").slice(0, 300) };
};

// Starts a chat session. history: [{ role: "user" | "model", parts: [{ text }] }]
// sendMessage(text) resolves with the response of the first model that
// answers, or throws HttpError 503 { message, code } when none does.
const startChat = ({ maxOutputTokens, history = null, timeoutMs = 60000 }) => ({
    sendMessage: async (message) => {
        let failure = classify(new Error("no model configured"), "");
        for (const model of models) {
            const chat = getClient().chats.create({
                model,
                history: history ?? [],
                config: {
                    temperature: 1.5,
                    topK: 20,
                    topP: 0.5,
                    maxOutputTokens,
                    safetySettings,
                    httpOptions: { timeout: timeoutMs },
                },
            });
            try {
                return await chat.sendMessage({ message });
            } catch (err) {
                failure = classify(err, model);
                console.error(`[ai] ${failure.hint}`);
                if (!TRY_NEXT.has(failure.code)) {
                    break;
                }
            }
        }
        throw new HttpError(503, "AI service unavailable", { code: failure.code });
    },
});

// Text of the answer, or null when Gemini returned none (blocked by the
// safety settings, cut off, ...).
const getResponseText = (response) => {
    const text = response?.text?.trim();
    if (!text) {
        const reason = response?.candidates?.[0]?.finishReason ?? response?.promptFeedback?.blockReason;
        console.warn(`[ai] Gemini returned no text (${reason ?? "unknown reason"})`);
        return null;
    }
    return text;
};

export { startChat, getResponseText };
