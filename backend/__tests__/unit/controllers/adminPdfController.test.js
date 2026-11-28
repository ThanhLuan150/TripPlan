import { beforeEach, describe, expect, it, vi } from "vitest";
import { callController, mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../src/services/adminService.js", () => ({ default: {} }));
vi.mock("../../../src/services/contentService.js", () => ({ default: {} }));
vi.mock("../../../src/services/adminPdfService.js", () => ({ default: { exportTable: vi.fn() } }));

const { default: adminController } = await import("../../../src/controllers/adminController.js");
const { default: adminPdfService } = await import("../../../src/services/adminPdfService.js");

beforeEach(() => vi.resetAllMocks());

describe("adminController.exportPdf", () => {
    it("sends the PDF of the table as a download", async () => {
        const buffer = Buffer.from("%PDF-");
        adminPdfService.exportTable.mockResolvedValue({ filename: "Người dùng.pdf", buffer });
        const res = mockRes();
        res.attachment = vi.fn();
        res.send = vi.fn(() => res);
        const body = { title: "Người dùng", columns: ["a"], rows: [["b"]] };

        await new Promise((resolve) => {
            res.send = vi.fn(() => {
                resolve();
                return res;
            });
            adminController.exportPdf(mockReq({ body }), res, resolve);
        });

        expect(adminPdfService.exportTable).toHaveBeenCalledWith(body);
        expect(res.attachment).toHaveBeenCalledWith("Người dùng.pdf");
        expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it("passes a validation error on", async () => {
        const error = Object.assign(new Error("bad"), { status: 400 });
        adminPdfService.exportTable.mockRejectedValue(error);

        const { err } = await callController(adminController.exportPdf, mockReq({ body: {} }));

        expect(err).toBe(error);
    });
});
