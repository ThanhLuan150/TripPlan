import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import ContentReport, { MAX_REPORT_DETAILS, REPORT_REASONS, REPORT_TYPES } from "../../../src/models/ContentReport.js";

const report = (extra = {}) => ({ type: "post", reason: "spam", content: "Da Lat", targetId: new mongoose.Types.ObjectId(), ...extra });

describe("ContentReport for posts", () => {
    it("knows the post type and the extra reasons", () => {
        expect(REPORT_TYPES).toContain("post");
        expect(REPORT_REASONS).toEqual(expect.arrayContaining(["spam", "inappropriate", "wrongLocation", "copyright", "misinformation", "other"]));
    });

    it("accepts a post report with the post id and the reporter's description", () => {
        const doc = new ContentReport(report({ details: "Wrong photos" }));

        expect(doc.validateSync()).toBeUndefined();
        expect(doc.status).toBe("pending");
    });

    it("rejects a reason that is not in the list and a description that is too long", () => {
        expect(new ContentReport(report({ reason: "boring" })).validateSync().errors.reason).toBeDefined();
        expect(new ContentReport(report({ details: "a".repeat(MAX_REPORT_DETAILS + 1) })).validateSync().errors.details).toBeDefined();
    });

    it("has a unique (type, target, reporter) index that only applies to reports with a target", () => {
        const [, options] = ContentReport.schema.indexes().find(([fields]) => fields.targetId && fields.reporterId);

        expect(options.unique).toBe(true);
        expect(options.partialFilterExpression).toEqual({ targetId: { $exists: true } });
    });
});
