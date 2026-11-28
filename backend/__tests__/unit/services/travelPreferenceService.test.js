import { beforeEach, describe, expect, it, vi } from "vitest";
import travelPreferenceService, { MAX_NOTES_LENGTH } from "../../../src/services/travelPreferenceService.js";
import userRepository from "../../../src/repositories/userRepository.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn(), updateById: vi.fn() } }));

const USER = "64b000000000000000000001";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("get", () => {
    it("returns an empty set for an account without preferences", async () => {
        userRepository.findById.mockResolvedValue({ _id: USER });
        await expect(travelPreferenceService.get(USER)).resolves.toEqual({ preferences: { categories: [], notes: "", updatedAt: null } });
        expect(userRepository.findById).toHaveBeenCalledWith(USER);
    });

    it("returns the stored preferences in a stable category order", async () => {
        const updatedAt = new Date("2026-03-01");
        userRepository.findById.mockResolvedValue({ travelPreferences: { categories: ["food", "nature"], notes: "ít người", updatedAt } });
        const { preferences } = await travelPreferenceService.get(USER);
        expect(preferences).toEqual({ categories: ["nature", "food"], notes: "ít người", updatedAt });
    });
});

describe("validate", () => {
    const { validate } = travelPreferenceService;

    it("keeps only known categories, deduplicated and ordered, and trims the notes", () => {
        expect(validate({ categories: ["food", "nature", "food"], notes: "  yên tĩnh  " })).toEqual({ categories: ["nature", "food"], notes: "yên tĩnh" });
    });

    it("accepts one field alone", () => {
        expect(validate({ notes: "x" })).toEqual({ notes: "x" });
        expect(validate({ categories: [] })).toEqual({ categories: [] });
    });

    it.each([
        [null],
        [[]],
        ["nature"],
        [{}],
        [{ categories: "nature" }],
        [{ categories: [1] }],
        [{ categories: ["beach"] }],
        [{ notes: 5 }],
        [{ notes: "x".repeat(MAX_NOTES_LENGTH + 1) }],
    ])("rejects %j", (body) => {
        expect(() => validate(body)).toThrowError(expect.objectContaining({ status: 400 }));
    });

    it("accepts notes of exactly the maximum length", () => {
        expect(validate({ notes: "x".repeat(MAX_NOTES_LENGTH) }).notes).toHaveLength(MAX_NOTES_LENGTH);
    });
});

describe("save", () => {
    it("stores the preferences on the caller's own account", async () => {
        userRepository.findById.mockResolvedValue({ _id: USER });
        userRepository.updateById.mockResolvedValue({});

        const result = await travelPreferenceService.save(USER, { categories: ["culture", "food"], notes: "chợ đêm" });

        expect(userRepository.updateById).toHaveBeenCalledWith(USER, {
            travelPreferences: { categories: ["food", "culture"], notes: "chợ đêm", updatedAt: expect.any(Date) },
        });
        expect(result.preferences).toMatchObject({ categories: ["food", "culture"], notes: "chợ đêm" });
    });

    it("updates only what was sent and keeps the rest", async () => {
        userRepository.findById.mockResolvedValue({ travelPreferences: { categories: ["nature"], notes: "biển" } });

        await travelPreferenceService.save(USER, { categories: ["shopping"] });
        expect(userRepository.updateById.mock.calls[0][1].travelPreferences).toMatchObject({ categories: ["shopping"], notes: "biển" });

        await travelPreferenceService.save(USER, { notes: "núi" });
        expect(userRepository.updateById.mock.calls[1][1].travelPreferences).toMatchObject({ categories: ["nature"], notes: "núi" });
    });

    it("refuses to save an empty set (delete is the way to clear)", async () => {
        userRepository.findById.mockResolvedValue({ travelPreferences: { categories: ["nature"], notes: "" } });
        await expect(travelPreferenceService.save(USER, { categories: [] })).rejects.toMatchObject({ status: 400 });
        expect(userRepository.updateById).not.toHaveBeenCalled();
    });

    it("rejects invalid input before touching the database", async () => {
        await expect(travelPreferenceService.save(USER, { categories: ["beach"] })).rejects.toMatchObject({ status: 400 });
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it("answers 404 for an unknown account", async () => {
        userRepository.findById.mockResolvedValue(null);
        await expect(travelPreferenceService.save(USER, { notes: "x" })).rejects.toMatchObject({ status: 404 });
    });
});

describe("clear", () => {
    it("removes the preferences of the caller", async () => {
        userRepository.updateById.mockResolvedValue({ _id: USER });
        const result = await travelPreferenceService.clear(USER);
        expect(userRepository.updateById).toHaveBeenCalledWith(USER, { $unset: { travelPreferences: 1 } });
        expect(result.preferences).toEqual({ categories: [], notes: "", updatedAt: null });
    });

    it("answers 404 for an unknown account", async () => {
        userRepository.updateById.mockResolvedValue(null);
        await expect(travelPreferenceService.clear(USER)).rejects.toMatchObject({ status: 404 });
    });
});

describe("promptSection", () => {
    it("is empty without preferences, so the AI works as before", async () => {
        userRepository.findById.mockResolvedValue({});
        await expect(travelPreferenceService.promptSection(USER)).resolves.toBe("");
        userRepository.findById.mockResolvedValue({ travelPreferences: { categories: [], notes: "" } });
        await expect(travelPreferenceService.promptSection(USER)).resolves.toBe("");
        userRepository.findById.mockResolvedValue(null);
        await expect(travelPreferenceService.promptSection(USER)).resolves.toBe("");
    });

    it("lists the categories and the note, as data that never beats the request", async () => {
        userRepository.findById.mockResolvedValue({ travelPreferences: { categories: ["nature", "food"], notes: 'thích """yên tĩnh"""' } });
        const section = await travelPreferenceService.promptSection(USER);
        expect(section).toContain("thiên nhiên");
        expect(section).toContain("ẩm thực");
        expect(section).not.toContain("văn hóa");
        expect(section).toContain("'''yên tĩnh'''");
        expect(section).toContain("ƯU TIÊN yêu cầu ở trên");
    });

    it("never fails the AI request when the preferences cannot be read", async () => {
        userRepository.findById.mockRejectedValue(new Error("db down"));
        await expect(travelPreferenceService.promptSection(USER)).resolves.toBe("");
    });
});
