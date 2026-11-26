import { beforeEach, describe, expect, it, vi } from "vitest";
import destinationRecommendService from "../../../src/services/destinationRecommendService.js";
import contentService from "../../../src/services/contentService.js";
import HttpError from "../../../src/utils/HttpError.js";
import destinationSearchRepository from "../../../src/repositories/destinationSearchRepository.js";
import { getResponseText, startChat } from "../../../src/utils/gemini.js";

vi.mock("../../../src/services/contentService.js", () => ({ default: { getPublicHome: vi.fn(), listPublicVideos: vi.fn() } }));
vi.mock("../../../src/repositories/destinationSearchRepository.js", () => ({ default: { create: vi.fn(), trim: vi.fn() } }));
vi.mock("../../../src/utils/gemini.js", () => ({ startChat: vi.fn(), getResponseText: vi.fn() }));

const USER = "64b000000000000000000001";
const sendMessage = vi.fn();
const answer = (value) => getResponseText.mockReturnValue(typeof value === "string" ? value : JSON.stringify(value));
const item = (name, extra = {}) => ({ name, province: "Lâm Đồng", description: "Mô tả", reason: "Vì phù hợp", ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    startChat.mockReturnValue({ sendMessage });
    sendMessage.mockResolvedValue({});
    destinationSearchRepository.create.mockResolvedValue({ _id: "h1" });
    contentService.getPublicHome.mockResolvedValue({
        suggestions: [{ id: "s1", title: "Hồ Xuân Hương, Đà Lạt", location: "Lâm Đồng", imageUrl: "https://img/x.jpg" }],
    });
    contentService.listPublicVideos.mockResolvedValue([
        { id: "v1", title: "Đà Lạt 4K", location: "Lâm Đồng", youtubeLink: "https://y/1", thumbnail: "t" },
        { id: "v2", title: "Hạ Long", location: "Quảng Ninh", youtubeLink: "https://y/2", thumbnail: "t" },
    ]);
});

describe("normalizeInput", () => {
    const { normalizeInput } = destinationRecommendService;

    it("trims the fields and accepts interests as a list or a comma separated string", () => {
        expect(normalizeInput({ query: "  biển đẹp ", interests: [" ăn uống ", "ăn uống", ""], region: " Miền Trung ", budget: 5000000 })).toEqual({
            query: "biển đẹp",
            interests: ["ăn uống"],
            region: "Miền Trung",
            budget: "5000000",
        });
        expect(normalizeInput({ interests: "biển, núi" }).interests).toEqual(["biển", "núi"]);
    });

    it.each([
        [undefined],
        [{}],
        [{ query: "   ", interests: [] }],
        [{ query: "a".repeat(501) }],
        [{ query: "x", interests: 5 }],
        [{ query: "x", interests: Array.from({ length: 11 }, (_, i) => `s${i}`) }],
        [{ query: "x", region: "r".repeat(101) }],
        [{ query: "x", budget: -1 }],
        [{ query: "x", budget: { $gt: 1 } }],
        [{ query: "x", budget: "9".repeat(51) }],
    ])("rejects invalid input %j", (body) => {
        expect(() => normalizeInput(body)).toThrow(expect.objectContaining({ status: 400 }));
    });
});

describe("recommend", () => {
    it("sends the needs to the AI and returns complete suggestions, linking only places the app knows", async () => {
        answer("```json\n" + JSON.stringify({ recommendations: [item("Hồ Xuân Hương"), item("Thác Datanla", { province: "Lâm Đồng" })] }) + "\n```");

        const result = await destinationRecommendService.recommend(USER, { query: "Nơi mát mẻ", interests: ["thiên nhiên"], region: "Tây Nguyên", budget: "3 triệu" });

        const prompt = sendMessage.mock.calls[0][0];
        for (const text of ["Nơi mát mẻ", "thiên nhiên", "Tây Nguyên", "3 triệu", "Hồ Xuân Hương, Đà Lạt"]) {
            expect(prompt).toContain(text);
        }
        expect(result.recommendations).toHaveLength(2);
        const [known, unknown] = result.recommendations;
        expect(known).toMatchObject({ name: "Hồ Xuân Hương", description: "Mô tả", reason: "Vì phù hợp", inApp: true });
        expect(known.place).toMatchObject({ id: "s1", location: "Lâm Đồng", imageUrl: "https://img/x.jpg" });
        expect(known.place.videos.map((v) => v.id)).toEqual(["v1"]);
        // not in the app: kept as an unverified AI suggestion, never given invented data
        expect(unknown.inApp).toBe(false);
        expect(unknown.place).toBeUndefined();
    });

    it("keeps the request and the answer in the history of the user and returns its id", async () => {
        answer({ recommendations: [item("Hồ Xuân Hương")] });

        const result = await destinationRecommendService.recommend(USER, { query: " Nơi mát mẻ ", interests: ["núi"], region: "Lâm Đồng", budget: "3 triệu" });

        expect(result.historyId).toBe("h1");
        expect(destinationSearchRepository.create).toHaveBeenCalledWith({
            userId: USER,
            query: "Nơi mát mẻ",
            interests: ["núi"],
            region: "Lâm Đồng",
            budget: "3 triệu",
            recommendations: result.recommendations,
        });
        expect(destinationSearchRepository.trim).toHaveBeenCalledWith(USER, 30);
    });

    it("keeps nothing when the AI finds nothing or the request is invalid", async () => {
        answer({ recommendations: [] });
        const result = await destinationRecommendService.recommend(USER, { query: "x" });
        expect(result.historyId).toBeNull();
        await expect(destinationRecommendService.recommend(USER, { query: "" })).rejects.toMatchObject({ status: 400 });
        expect(destinationSearchRepository.create).not.toHaveBeenCalled();
    });

    it("matches a province name and ignores accents and case", async () => {
        answer({ recommendations: [item("lam dong")] });
        const result = await destinationRecommendService.recommend(USER, { query: "x" });
        expect(result.recommendations[0].inApp).toBe(true);
    });

    it("drops incomplete and repeated suggestions and keeps at most 5", async () => {
        answer({
            recommendations: [item("A1"), item("a1"), item("B", { reason: "" }), item("", {}), null, ...["C", "D", "E", "F", "G"].map((n) => item(n))],
        });
        const { recommendations } = await destinationRecommendService.recommend(USER, { query: "x" });
        expect(recommendations.map((r) => r.name)).toEqual(["A1", "C", "D", "E", "F"]);
    });

    it("answers with an empty list and a message when the AI finds nothing suitable", async () => {
        answer({ recommendations: [] });
        const result = await destinationRecommendService.recommend(USER, { query: "x" });
        expect(result.recommendations).toEqual([]);
        expect(result.message).toMatch(/No suitable/);
    });

    it("answers with an empty list when every suggestion is incomplete", async () => {
        answer({ recommendations: [{ name: "Chỉ có tên" }] });
        expect((await destinationRecommendService.recommend(USER, { query: "x" })).recommendations).toEqual([]);
    });

    it("does not call the AI for an invalid request", async () => {
        await expect(destinationRecommendService.recommend(USER, { query: "" })).rejects.toMatchObject({ status: 400 });
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it.each([
        ["no text", null],
        ["not JSON", "xin lỗi, tôi không biết"],
        ["no list", { foo: 1 }],
    ])("answers 502 AI_INVALID_RESPONSE when the AI returns %s", async (_name, value) => {
        getResponseText.mockReturnValue(value === null ? null : typeof value === "string" ? value : JSON.stringify(value));
        await expect(destinationRecommendService.recommend(USER, { query: "x" })).rejects.toMatchObject({ status: 502, body: { code: "AI_INVALID_RESPONSE" } });
    });

    it("lets an AI outage through", async () => {
        sendMessage.mockRejectedValue(new HttpError(503, "AI service unavailable", { code: "AI_BUSY" }));
        await expect(destinationRecommendService.recommend(USER, { query: "x" })).rejects.toMatchObject({ status: 503, body: { code: "AI_BUSY" } });
    });

    it("works when the app has no destinations yet", async () => {
        contentService.getPublicHome.mockResolvedValue({ suggestions: undefined });
        answer({ recommendations: [item("Sa Pa")] });
        const result = await destinationRecommendService.recommend(USER, { query: "x" });
        expect(result.recommendations[0].inApp).toBe(false);
        expect(sendMessage.mock.calls[0][0]).not.toContain("đã có sẵn trong ứng dụng");
    });
});
