import { beforeEach, describe, expect, it, vi } from "vitest";
import postReportService from "../../../src/services/postReportService.js";
import contentRepository from "../../../src/repositories/contentRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import userRepository from "../../../src/repositories/userRepository.js";
import { REPORT_REASONS } from "../../../src/models/ContentReport.js";

vi.mock("../../../src/repositories/contentRepository.js", () => ({ default: { createReport: vi.fn(), reportExists: vi.fn() } }));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { findPublicById: vi.fn() } }));
vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn() } }));

const ME = "64b000000000000000000001";
const AUTHOR = "64b000000000000000000002";
const POST = "64b0000000000000000000a1";
const actor = { _id: ME };

beforeEach(() => {
    vi.resetAllMocks();
    tripPlanRepository.findPublicById.mockResolvedValue({ _id: POST, userId: AUTHOR, nameTrip: "Da Lat 3N2D", location: "Đà Lạt" });
    contentRepository.reportExists.mockResolvedValue(false);
    userRepository.findById.mockResolvedValue({ _id: AUTHOR, username: "author" });
});

describe("report a post", () => {
    it("stores the report in the shared ContentReport collection with the post, reporter and description", async () => {
        const result = await postReportService.report(actor, POST, { reason: "spam", description: "  Quảng cáo  " });

        expect(result).toEqual({ message: "Report sent successfully" });
        expect(contentRepository.createReport).toHaveBeenCalledWith({
            type: "post",
            reason: "spam",
            content: "Da Lat 3N2D - Đà Lạt",
            authorName: "author",
            reporterId: ME,
            targetId: POST,
            details: "Quảng cáo",
        });
    });

    it.each(REPORT_REASONS.filter((reason) => reason !== "other"))("accepts the reason %s without a description", async (reason) => {
        await expect(postReportService.report(actor, POST, { reason })).resolves.toEqual({ message: "Report sent successfully" });
        expect(contentRepository.createReport.mock.calls.at(-1)[0]).not.toHaveProperty("details");
    });

    it("never takes the reporter from the body", async () => {
        await postReportService.report(actor, POST, { reason: "spam", reporterId: AUTHOR });

        expect(contentRepository.createReport.mock.calls[0][0].reporterId).toBe(ME);
    });

    it("never says who reported: the answer holds only a message", async () => {
        const result = await postReportService.report(actor, POST, { reason: "spam" });

        expect(JSON.stringify(result)).not.toContain(ME);
        expect(Object.keys(result)).toEqual(["message"]);
    });

    it.each([[undefined], [""], ["boring"], [5], [{ $ne: "x" }], [["spam"]]])("rejects the reason %j", async (reason) => {
        await expect(postReportService.report(actor, POST, { reason })).rejects.toMatchObject({ status: 400 });
        expect(contentRepository.createReport).not.toHaveBeenCalled();
    });

    it("requires a description when the reason is other", async () => {
        for (const description of [undefined, "", "   "]) {
            await expect(postReportService.report(actor, POST, { reason: "other", description })).rejects.toMatchObject({ status: 400 });
        }
        await expect(postReportService.report(actor, POST, { reason: "other", description: "Offensive photos" })).resolves.toBeDefined();
    });

    it("rejects a description that is not text or is too long", async () => {
        await expect(postReportService.report(actor, POST, { reason: "spam", description: 5 })).rejects.toMatchObject({ status: 400 });
        await expect(postReportService.report(actor, POST, { reason: "spam", description: "a".repeat(501) })).rejects.toMatchObject({ status: 400 });
        await expect(postReportService.report(actor, POST, { reason: "spam", description: "a".repeat(500) })).resolves.toBeDefined();
    });

    it("answers 404 for a post that is private, deleted or unknown and stores nothing", async () => {
        tripPlanRepository.findPublicById.mockResolvedValue(null);

        await expect(postReportService.report(actor, POST, { reason: "spam" })).rejects.toMatchObject({ status: 404, message: "Post not found" });
        expect(contentRepository.createReport).not.toHaveBeenCalled();
    });

    it.each([["malformed id", "abc"], ["undefined id", undefined], ["object id", { $ne: "x" }]])("answers 404 for a %s without a query", async (_n, id) => {
        await expect(postReportService.report(actor, id, { reason: "spam" })).rejects.toMatchObject({ status: 404 });
        expect(tripPlanRepository.findPublicById).not.toHaveBeenCalled();
    });

    it("does not let the author report their own post", async () => {
        await expect(postReportService.report({ _id: AUTHOR }, POST, { reason: "spam" })).rejects.toMatchObject({ status: 400 });
        expect(contentRepository.createReport).not.toHaveBeenCalled();
    });

    it("answers 409 for a second report of the same post by the same user", async () => {
        contentRepository.reportExists.mockResolvedValue(true);

        await expect(postReportService.report(actor, POST, { reason: "spam" })).rejects.toMatchObject({ status: 409 });
        expect(contentRepository.reportExists).toHaveBeenCalledWith(ME, "post", POST);
        expect(contentRepository.createReport).not.toHaveBeenCalled();
    });

    it("answers 409 when two requests race and the unique index rejects the second", async () => {
        contentRepository.createReport.mockRejectedValue(Object.assign(new Error("dup"), { code: 11000 }));

        await expect(postReportService.report(actor, POST, { reason: "spam" })).rejects.toMatchObject({ status: 409 });
    });

    it("rethrows any other database error", async () => {
        contentRepository.createReport.mockRejectedValue(new Error("down"));

        await expect(postReportService.report(actor, POST, { reason: "spam" })).rejects.toThrow("down");
    });

    it("still stores the report when the author's account cannot be read", async () => {
        userRepository.findById.mockResolvedValue(null);

        await postReportService.report(actor, POST, { reason: "spam" });

        expect(contentRepository.createReport.mock.calls[0][0].authorName).toBe("");
    });
});
