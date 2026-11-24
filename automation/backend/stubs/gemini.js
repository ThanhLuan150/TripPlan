import { external } from "./state.js";

export const startChat = () => ({
    sendMessage: async (message) => {
        external.prompts.push(typeof message === "string" ? message : JSON.stringify(message));
        const answer = external.aiQueue.length > 0 ? external.aiQueue.shift() : external.ai;
        if (answer?.error) {
            throw new Error(answer.error);
        }
        return answer;
    },
});

export const getResponseText = (response) => response?.text ?? null;
