import { createRequire } from "node:module";
import path from "node:path";
import PDFDocument from "pdfkit";

// DejaVu Sans covers Vietnamese; the 14 built-in PDF fonts do not.
const fontDir = path.join(path.dirname(createRequire(import.meta.url).resolve("dejavu-fonts-ttf/package.json")), "ttf");
const FONT_REGULAR = path.join(fontDir, "DejaVuSans.ttf");
const FONT_BOLD = path.join(fontDir, "DejaVuSans-Bold.ttf");

const LABELS = {
    vi: {
        dates: "Thời gian",
        location: "Địa điểm",
        cost: "Chi phí dự kiến",
        transport: "Di chuyển",
        food: "Ăn uống",
        other: "Khác",
        total: "Tổng",
        day: "Ngày",
        noPlan: "Chuyến đi này chưa có lịch trình.",
        noActivity: "Chưa có hoạt động.",
        page: "Trang",
        unnamed: "Chuyến đi",
    },
    en: {
        dates: "Dates",
        location: "Destination",
        cost: "Estimated cost",
        transport: "Transport",
        food: "Food",
        other: "Other",
        total: "Total",
        day: "Day",
        noPlan: "This trip has no itinerary yet.",
        noActivity: "No activities yet.",
        page: "Page",
        unnamed: "Trip",
    },
};

const COLOR = { text: "#0f172a", muted: "#64748b", accent: "#0d9488", line: "#cbd5e1" };

export const pdfLabels = (lang) => LABELS[lang] ?? LABELS.vi;

const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return "";
    }
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString("en-US")} VND`;

// File name made from the trip name: no characters a file system / header rejects.
export const pdfFileName = (nameTrip, lang) => {
    const clean = [...String(nameTrip ?? "")]
        .map((ch) => (ch.charCodeAt(0) < 32 ? " " : ch))
        .join("")
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
    return `${clean || pdfLabels(lang).unnamed}.pdf`;
};

// Activities keep the visiting order: the `order` the owner accepted from a route optimization first,
// then the places without one in the order they were saved (ids grow in creation order).
const byCreation = (a, b) => {
    const hasA = typeof a.order === "number";
    const hasB = typeof b.order === "number";
    if (hasA && hasB) {
        return a.order - b.order;
    }
    return hasA === hasB ? String(a._id).localeCompare(String(b._id)) : hasA ? -1 : 1;
};

// PDF (Buffer) of a trip as returned by tripService.getTripDetail().tripDatas.
// Only reads the data it is given.
export const buildTripPdf = (trip, lang = "vi") =>
    new Promise((resolve, reject) => {
        const t = pdfLabels(lang);
        const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true, info: { Title: trip.nameTrip || t.unnamed } });
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const bottom = () => doc.page.height - doc.page.margins.bottom;
        // start a new page when fewer than `needed` points are left
        const ensureSpace = (needed) => {
            if (doc.y + needed > bottom()) {
                doc.addPage();
            }
        };
        const rule = () => {
            doc.moveTo(doc.page.margins.left, doc.y)
                .lineTo(doc.page.width - doc.page.margins.right, doc.y)
                .strokeColor(COLOR.line)
                .lineWidth(0.7)
                .stroke();
            doc.moveDown(0.6);
        };

        try {
            doc.font(FONT_BOLD).fontSize(22).fillColor(COLOR.text).text(trip.nameTrip || trip.location || t.unnamed);
            doc.moveDown(0.3);
            doc.font(FONT_REGULAR).fontSize(11).fillColor(COLOR.muted);
            const range = [formatDate(trip.startDate), formatDate(trip.endDate)].filter(Boolean).join(" - ");
            if (trip.location) {
                doc.text(`${t.location}: ${trip.location}`);
            }
            if (range) {
                doc.text(`${t.dates}: ${range}`);
            }
            const totals = [trip.transportCostTotal, trip.foodCostTotal, trip.otherCostTotal];
            if (totals.some((n) => n !== undefined && n !== null)) {
                const sum = totals.reduce((s, n) => s + (Number(n) || 0), 0);
                doc.text(
                    `${t.cost}: ${t.transport} ${formatMoney(trip.transportCostTotal)} · ${t.food} ${formatMoney(trip.foodCostTotal)}` +
                        ` · ${t.other} ${formatMoney(trip.otherCostTotal)} · ${t.total} ${formatMoney(sum)}`,
                );
            }
            doc.moveDown(0.6);
            rule();

            const days = trip.dataTripDays ?? [];
            if (days.length === 0) {
                doc.font(FONT_REGULAR).fontSize(12).fillColor(COLOR.muted).text(t.noPlan);
            }

            days.forEach((day, index) => {
                ensureSpace(90); // heading + first activity stay together
                doc.moveDown(0.6);
                doc.font(FONT_BOLD).fontSize(14).fillColor(COLOR.accent);
                const when = [day.dayOfWeek, formatDate(day.date)].filter(Boolean).join(", ");
                doc.text(`${t.day} ${index + 1}${day.title ? `: ${day.title}` : ""}`);
                if (when) {
                    doc.font(FONT_REGULAR).fontSize(10).fillColor(COLOR.muted).text(when);
                }
                doc.moveDown(0.4);

                const activities = [...(day.challenges ?? [])].sort(byCreation);
                if (activities.length === 0) {
                    doc.font(FONT_REGULAR).fontSize(11).fillColor(COLOR.muted).text(t.noActivity);
                }
                activities.forEach((activity, n) => {
                    ensureSpace(48);
                    doc.font(FONT_BOLD).fontSize(11).fillColor(COLOR.text);
                    doc.text(`${n + 1}. ${activity.challengeSummary || activity.nameLocation || ""}`, { indent: 0 });
                    const place = activity.nameLocation || activity.location;
                    if (place) {
                        doc.font(FONT_REGULAR).fontSize(10).fillColor(COLOR.muted).text(place, { indent: 14 });
                    }
                    if (activity.nameLocation && activity.location && activity.location !== activity.nameLocation) {
                        doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR.muted).text(activity.location, { indent: 14 });
                    }
                    doc.moveDown(0.35);
                });

                ensureSpace(20);
                doc.font(FONT_REGULAR).fontSize(10).fillColor(COLOR.muted).text(
                    `${t.transport}: ${formatMoney(day.transportCost)} · ${t.food}: ${formatMoney(day.foodCost)} · ${t.other}: ${formatMoney(day.otherCost)}`,
                );
                doc.moveDown(0.4);
                rule();
            });

            // page numbers (needs bufferPages)
            const { count } = doc.bufferedPageRange();
            for (let i = 0; i < count; i++) {
                doc.switchToPage(i);
                const y = doc.page.height - doc.page.margins.bottom + 18;
                // text below the bottom margin would open a new page: lift the margin for this line
                const margin = doc.page.margins.bottom;
                doc.page.margins.bottom = 0;
                doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR.muted).text(`${t.page} ${i + 1}/${count}`, doc.page.margins.left, y, {
                    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
                    align: "center",
                });
                doc.page.margins.bottom = margin;
            }
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
