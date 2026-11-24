import { afterEach, describe, expect, it, vi } from "vitest";
import PDFDocument from "pdfkit";
import { buildTripPdf, pdfFileName, pdfLabels } from "../../../src/services/tripPdfService.js";

// Text written into the PDF, in order (the PDF stream itself is compressed / font-encoded).
const captureText = () => {
    const lines = [];
    const original = PDFDocument.prototype.text;
    vi.spyOn(PDFDocument.prototype, "text").mockImplementation(function (value, ...args) {
        if (typeof value === "string") {
            lines.push(value);
        }
        return original.call(this, value, ...args);
    });
    return lines;
};

const fullTrip = {
    _id: "t1",
    nameTrip: "Đà Lạt 3 ngày",
    location: "Lâm Đồng",
    startDate: "2026-03-02T00:00:00.000Z",
    endDate: "2026-03-04T00:00:00.000Z",
    transportCostTotal: 1000000,
    foodCostTotal: 2000000,
    otherCostTotal: 500000,
    dataTripDays: [
        {
            _id: "d0",
            day: 0,
            title: "Trung tâm Đà Lạt",
            dayOfWeek: "Thứ 2",
            date: "2026-03-02T00:00:00.000Z",
            transportCost: 100000,
            foodCost: 200000,
            otherCost: 0,
            challenges: [
                // stored out of order on purpose: the PDF follows the creation order (ids)
                { _id: "64b000000000000000000012", challengeSummary: "Ăn sáng", nameLocation: "Quán A", location: "Quán A, Đà Lạt" },
                { _id: "64b000000000000000000011", challengeSummary: "Chụp ảnh hồ Xuân Hương", nameLocation: "Hồ Xuân Hương", location: "Hồ Xuân Hương" },
            ],
        },
        { _id: "d1", day: 1, title: "Thung lũng", transportCost: 5, foodCost: 6, otherCost: 7, challenges: [] },
    ],
};

afterEach(() => vi.restoreAllMocks());

describe("buildTripPdf", () => {
    it("builds a valid PDF with the trip info, the days and the activities in order", async () => {
        const lines = captureText();

        const buffer = await buildTripPdf(fullTrip, "vi");

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
        expect(buffer.subarray(-6).toString()).toContain("%%EOF");
        const text = lines.join("\n");
        expect(text).toContain("Đà Lạt 3 ngày");
        expect(text).toContain("Địa điểm: Lâm Đồng");
        expect(text).toContain("02/03/2026 - 04/03/2026");
        expect(text).toContain("Tổng 3,500,000 VND");
        expect(text).toContain("Ngày 1: Trung tâm Đà Lạt");
        expect(text).toContain("Thứ 2, 02/03/2026");
        expect(text).toContain("Ngày 2: Thung lũng");
        expect(text).toContain("Chưa có hoạt động.");
        // order of the activities inside a day, and days in order
        expect(lines.indexOf("1. Chụp ảnh hồ Xuân Hương")).toBeGreaterThan(-1);
        expect(lines.indexOf("1. Chụp ảnh hồ Xuân Hương")).toBeLessThan(lines.indexOf("2. Ăn sáng"));
        expect(lines.indexOf("Ngày 1: Trung tâm Đà Lạt")).toBeLessThan(lines.indexOf("Ngày 2: Thung lũng"));
        expect(lines).toContain("Trang 1/1");
    });

    it("does not change the data it is given", async () => {
        const copy = structuredClone(fullTrip);

        await buildTripPdf(fullTrip);

        expect(fullTrip).toEqual(copy);
    });

    it("writes an English version on request", async () => {
        const lines = captureText();

        await buildTripPdf(fullTrip, "en");

        expect(lines.join("\n")).toContain("Destination: Lâm Đồng");
        expect(lines).toContain("Day 1: Trung tâm Đà Lạt");
    });

    it("says so when the trip has no itinerary (no days, missing fields)", async () => {
        const lines = captureText();

        const buffer = await buildTripPdf({ _id: "t2", location: "Huế" });

        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
        expect(lines).toContain("Huế"); // title falls back to the location
        expect(lines).toContain("Chuyến đi này chưa có lịch trình.");
        expect(lines.join("\n")).not.toContain("Chi phí dự kiến");
        expect(lines.join("\n")).not.toContain("Thời gian");
    });

    it("copes with a trip with nothing at all and with activities missing fields", async () => {
        const lines = captureText();

        const empty = await buildTripPdf({ dataTripDays: null });
        const sparse = await buildTripPdf({
            nameTrip: "T",
            startDate: "not a date",
            dataTripDays: [{ challenges: [{ _id: "a" }, { _id: "b", nameTrip: "x", nameLocation: "Chợ" }] }],
        });

        expect(empty.subarray(0, 5).toString()).toBe("%PDF-");
        expect(sparse.subarray(0, 5).toString()).toBe("%PDF-");
        expect(lines).toContain("Chuyến đi");
        expect(lines).toContain("2. Chợ");
    });

    it("flows a long trip onto several pages with page numbers", async () => {
        const lines = captureText();
        const days = Array.from({ length: 12 }, (_, i) => ({
            _id: `d${i}`,
            title: `Ngày ${i}`,
            challenges: Array.from({ length: 6 }, (_, j) => ({ _id: `c${i}-${j}`, challengeSummary: `Hoạt động ${j}`, nameLocation: `Nơi ${j}`, location: `Địa chỉ ${j}` })),
        }));

        const buffer = await buildTripPdf({ nameTrip: "Dài", dataTripDays: days });

        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
        expect(lines.some((line) => /^Trang 1\/([2-9]|\d{2})$/.test(line))).toBe(true);
    });

    it("rejects when the PDF cannot be built", async () => {
        vi.spyOn(PDFDocument.prototype, "text").mockImplementation(() => {
            throw new Error("boom");
        });

        await expect(buildTripPdf(fullTrip)).rejects.toThrow("boom");
    });
});

describe("pdfFileName", () => {
    it("uses the trip name and drops characters that are not allowed in file names", () => {
        expect(pdfFileName("Đà Lạt 3 ngày")).toBe("Đà Lạt 3 ngày.pdf");
        expect(pdfFileName('a/b\\c:d*e?"f<g>h|i\nj')).toBe("a b c d e f g h i j.pdf");
        expect(pdfFileName("x".repeat(300))).toBe(`${"x".repeat(100)}.pdf`);
    });

    it("falls back to a generic name when the trip has none", () => {
        expect(pdfFileName(undefined)).toBe("Chuyến đi.pdf");
        expect(pdfFileName("  ///  ", "en")).toBe("Trip.pdf");
    });
});

describe("pdfLabels", () => {
    it("defaults to Vietnamese", () => {
        expect(pdfLabels("fr")).toBe(pdfLabels("vi"));
        expect(pdfLabels("en").day).toBe("Day");
    });
});
