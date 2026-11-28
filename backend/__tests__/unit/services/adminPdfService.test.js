import { describe, expect, it } from "vitest";
import adminPdfService, { buildTablePdf, cleanTable, MAX_CELL, MAX_COLUMNS, MAX_ROWS, pdfName } from "../../../src/services/adminPdfService.js";

const body = (extra = {}) => ({ title: "Người dùng", columns: ["Tên", "Email"], rows: [["An", "an@example.com"]], ...extra });
const pages = (buffer) => (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("cleanTable", () => {
    it("accepts a title, columns and rows, turns numbers into text and defaults to Vietnamese", () => {
        expect(cleanTable(body({ rows: [["An", 5], [null, "x"]] }))).toEqual({
            title: "Người dùng",
            subtitle: "",
            columns: ["Tên", "Email"],
            rows: [["An", "5"], ["", "x"]],
            lang: "vi",
        });
        expect(cleanTable(body({ lang: "en", subtitle: "Filter: admin" }))).toMatchObject({ lang: "en", subtitle: "Filter: admin" });
        expect(cleanTable(body({ lang: "fr" })).lang).toBe("vi");
    });

    it.each([
        ["a missing title", { title: "" }],
        ["a title that is not text", { title: { a: 1 } }],
        ["no columns", { columns: [] }],
        ["columns that are not a list", { columns: "Tên" }],
        ["too many columns", { columns: Array.from({ length: MAX_COLUMNS + 1 }, (_, i) => String(i)) }],
        ["a column that is an object", { columns: [{ a: 1 }, "x"] }],
        ["rows that are not a list", { rows: "x" }],
        ["too many rows", { rows: Array.from({ length: MAX_ROWS + 1 }, () => ["a", "b"]) }],
        ["a row of the wrong length", { rows: [["only one"]] }],
        ["a row that is not a list", { rows: ["ab"] }],
        ["a cell that is an object", { rows: [["a", { $ne: 1 }]] }],
    ])("rejects %s with 400", (_name, extra) => {
        expect(() => cleanTable(body(extra))).toThrow(expect.objectContaining({ status: 400 }));
    });

    it("rejects a missing body", () => {
        expect(() => cleanTable()).toThrow(expect.objectContaining({ status: 400 }));
    });

    it("cuts long cells and drops control characters", () => {
        const table = cleanTable(body({ rows: [["a".repeat(MAX_CELL + 50), "x\u0000y"]] }));

        expect(table.rows[0][0]).toHaveLength(MAX_CELL);
        expect(table.rows[0][1]).toBe("x y");
    });
});

describe("pdfName", () => {
    it("keeps the title, drops characters a file system rejects, and has a fallback", () => {
        expect(pdfName("Người dùng")).toBe("Người dùng.pdf");
        expect(pdfName('a/b\\c:d*e?"f<g>h|i')).toBe("a b c d e f g h i.pdf");
        expect(pdfName("   ")).toBe("aloca.pdf");
        expect(pdfName("a".repeat(300)).length).toBeLessThanOrEqual(104);
    });
});

describe("buildTablePdf", () => {
    it("makes a real PDF with Vietnamese text", async () => {
        const buffer = await buildTablePdf(cleanTable(body({ rows: [["Nguyễn Văn Ánh", "anh@example.com"]] })));

        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
        expect(buffer.length).toBeGreaterThan(1000);
        expect(pages(buffer)).toBe(1);
    });

    it("makes a PDF for an empty table too", async () => {
        const buffer = await buildTablePdf(cleanTable(body({ rows: [] })));

        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("continues on more pages for many rows, and for rows with long text", async () => {
        const many = await buildTablePdf(cleanTable(body({ rows: Array.from({ length: 300 }, (_, i) => [`Người dùng ${i}`, `user${i}@example.com`]) })));
        const long = await buildTablePdf(cleanTable(body({ rows: Array.from({ length: 12 }, () => ["x ".repeat(120), "y ".repeat(120)]) })));

        expect(pages(many)).toBeGreaterThan(3);
        expect(pages(long)).toBeGreaterThan(1);
    });

    it("works in English and with many columns", async () => {
        const columns = Array.from({ length: MAX_COLUMNS }, (_, i) => `Column ${i}`);
        const buffer = await buildTablePdf(cleanTable({ title: "Report", lang: "en", columns, rows: [columns.map((_, i) => `value ${i}`)] }));

        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    });
});

describe("exportTable", () => {
    it("answers the file name and the PDF", async () => {
        const { filename, buffer } = await adminPdfService.exportTable(body());

        expect(filename).toBe("Người dùng.pdf");
        expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    });

    it("rejects an invalid table without building anything", async () => {
        await expect(adminPdfService.exportTable({ title: "x", columns: [], rows: [] })).rejects.toMatchObject({ status: 400 });
    });
});
