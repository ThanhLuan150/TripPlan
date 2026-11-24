// What the stubs answer, steered by the tests through POST /__test/external.
// (Shared through globalThis: the runner and the stubs are separate modules.)
export const external = (globalThis.__aloca ??= {
    // answer of the AI: { text } or {} (no answer) or { error: "message" } (the call fails)
    ai: { text: "OK" },
    // answers used one after the other before falling back to `ai`
    aiQueue: [],
    // every message sent to the AI
    prompts: [],
    // answer of the route service: an object, null (no route) or { error: "message" }
    route: null,
    // answer of the province lookup
    province: null,
    // where every challenge is: the Han river bridge, Da Nang
    place: { latitude: 16.0611, longitude: 108.2278 },
    // codes "e-mailed" to users
    mails: [],
});
