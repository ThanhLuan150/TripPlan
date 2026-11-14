import { beforeEach, describe, expect, it, vi } from "vitest";
import geoController from "../../../src/controllers/geoController.js";
import { getProvinceFromCoordinates } from "../../../src/utils/geocode.js";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/utils/geocode.js", () => ({ getProvinceFromCoordinates: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

describe("geoController.reverse", () => {
    it("answers the province of a position", async () => {
        getProvinceFromCoordinates.mockResolvedValue("Lâm Đồng");

        const { res } = await callController(geoController.reverse, mockReq({ query: { lat: "11.94", lng: "108.44" } }));

        expect(getProvinceFromCoordinates).toHaveBeenCalledWith(11.94, 108.44);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ province: "Lâm Đồng" });
    });

    it("answers null when no province is known", async () => {
        getProvinceFromCoordinates.mockResolvedValue(undefined);

        const { res } = await callController(geoController.reverse, mockReq({ query: { lat: "0", lng: "0" } }));

        expect(res.json).toHaveBeenCalledWith({ province: null });
    });

    it.each([
        [{}],
        [{ lat: "11.94" }],
        [{ lat: "abc", lng: "108" }],
        [{ lat: "91", lng: "0" }],
        [{ lat: "0", lng: "181" }],
        [{ lat: "Infinity", lng: "0" }],
    ])("rejects %j", async (query) => {
        const { err } = await callController(geoController.reverse, mockReq({ query }));

        expect(err).toMatchObject({ status: 400 });
        expect(getProvinceFromCoordinates).not.toHaveBeenCalled();
    });
});
