import { createRequire } from "node:module";
import path from "node:path";
import PDFDocument from "pdfkit";
import HttpError from "../utils/HttpError.js";

// PDF of a table of the admin panel (users, activity log, report). The web app sends what is on screen
// (title, columns, rows) and gets a PDF back, so the file matches the filters the admin chose. DejaVu Sans
// covers Vietnamese; the 14 built-in PDF fonts do not.
const fontDir = path.join(path.dirname(createRequire(import.meta.url).resolve("dejavu-fonts-ttf/package.json")), "ttf");
const FONT_REGULAR = path.join(fontDir, "DejaVuSans.ttf");
const FONT_BOLD = path.join(fontDir, "DejaVuSans-Bold.ttf");

const COLOR = { text: "#0f172a", muted: "#64748b", accent: "#0d9488", line: "#cbd5e1", zebra: "#f1f5f9", headBg: "#e2e8f0" };

export const MAX_ROWS = 2000;
export const MAX_COLUMNS = 16;
export const MAX_CELL = 300;
const LABELS = { vi: { page: "Trang", rows: "dòng", generated: "Xuất lúc", empty: "Không có dữ liệu." }, en: { page: "Page", rows: "rows", generated: "Exported", empty: "No data." } };

const text = (value, max, field) => {
    if (typeof value !== "string" && typeof value !== "number") {
        throw new HttpError(400, `${field} must be text`);
    }
    // eslint-disable-next-line no-control-regex
    return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").slice(0, max);
};

// Checks what the client sent: bounded sizes, only text and numbers.
export const cleanTable = (body = {}) => {
    const title = text(body.title ?? "", 200, "title");
    if (!title.trim()) {
        throw new HttpError(400, "title is required");
    }
    if (!Array.isArray(body.columns) || body.columns.length === 0 || body.columns.length > MAX_COLUMNS) {
        throw new HttpError(400, `columns must be a list of 1 to ${MAX_COLUMNS} names`);
    }
    if (!Array.isArray(body.rows) || body.rows.length > MAX_ROWS) {
        throw new HttpError(400, `rows must be a list of at most ${MAX_ROWS} rows`);
    }
    const columns = body.columns.map((column) => text(column, 80, "column"));
    const rows = body.rows.map((row) => {
        if (!Array.isArray(row) || row.length !== columns.length) {
            throw new HttpError(400, "every row needs one value per column");
        }
        return row.map((value) => text(value ?? "", MAX_CELL, "cell"));
    });
    return {
        title,
        subtitle: body.subtitle === undefined ? "" : text(body.subtitle, 300, "subtitle"),
        columns,
        rows,
        lang: body.lang === "en" ? "en" : "vi",
    };
};

// Column widths in proportion to the longest text of each column (bounded), summing to `total`.
const widthsOf = (columns, rows, total) => {
    const weights = columns.map((name, i) => {
        const longest = rows.slice(0, 200).reduce((max, row) => Math.max(max, row[i].length), name.length);
        return Math.min(Math.max(longest, 6), 36);
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map((weight) => (weight / sum) * total);
};

// File name made from the title: no characters a file system / header rejects.
export const pdfName = (title) => {
    const clean = [...String(title)]
        .map((ch) => (ch.charCodeAt(0) < 32 ? " " : ch))
        .join("")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
    return `${clean || "aloca"}.pdf`;
};

// PDF (Buffer) of a validated table: A4 landscape, header repeated on every page, page numbers.
export const buildTablePdf = ({ title, subtitle, columns, rows, lang }) =>
    new Promise((resolve, reject) => {
        const t = LABELS[lang];
        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true, info: { Title: title } });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        try {
            const left = doc.page.margins.left;
            const total = doc.page.width - left - doc.page.margins.right;
            const bottom = () => doc.page.height - doc.page.margins.bottom;
            const widths = widthsOf(columns, rows, total);
            const PAD = 4;
            const FONT = 8;

            const rowHeight = (cells, font) => {
                doc.font(font).fontSize(FONT);
                return Math.max(...cells.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - PAD * 2 }))) + PAD * 2;
            };
            const drawRow = (cells, y, height, { bold = false, fill } = {}) => {
                if (fill) {
                    doc.rect(left, y, total, height).fill(fill);
                }
                doc.fillColor(COLOR.text).font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(FONT);
                let x = left;
                cells.forEach((cell, i) => {
                    doc.text(cell, x + PAD, y + PAD, { width: widths[i] - PAD * 2 });
                    x += widths[i];
                });
            };
            const drawHeader = () => {
                const height = rowHeight(columns, FONT_BOLD);
                drawRow(columns, doc.y, height, { bold: true, fill: COLOR.headBg });
                doc.y += height;
            };

            doc.font(FONT_BOLD).fontSize(18).fillColor(COLOR.accent).text(title, left, doc.y, { width: total });
            doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR.muted);
            if (subtitle) {
                doc.text(subtitle, { width: total });
            }
            doc.text(`${t.generated}: ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${rows.length} ${t.rows}`, { width: total });
            doc.moveDown(0.6);

            if (rows.length === 0) {
                doc.font(FONT_REGULAR).fontSize(11).fillColor(COLOR.muted).text(t.empty);
            } else {
                drawHeader();
                rows.forEach((row, index) => {
                    const height = rowHeight(row, FONT_REGULAR);
                    if (doc.y + height > bottom()) {
                        doc.addPage();
                        drawHeader();
                    }
                    drawRow(row, doc.y, height, { fill: index % 2 === 1 ? COLOR.zebra : undefined });
                    doc.y += height;
                });
            }

            // page numbers (needs bufferPages); text below the bottom margin would open a page, so lift the margin
            const { count } = doc.bufferedPageRange();
            for (let i = 0; i < count; i++) {
                doc.switchToPage(i);
                const margin = doc.page.margins.bottom;
                doc.page.margins.bottom = 0;
                doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR.muted).text(`${t.page} ${i + 1}/${count}`, left, doc.page.height - margin + 14, { width: total, align: "center" });
                doc.page.margins.bottom = margin;
            }
            doc.end();
        } catch (error) {
            reject(error);
        }
    });

// body of the request -> { filename, buffer }
const exportTable = async (body) => {
    const table = cleanTable(body);
    return { filename: pdfName(table.title), buffer: await buildTablePdf(table) };
};

export default { exportTable };
