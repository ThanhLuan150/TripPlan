import { beforeEach, describe, expect, it, vi } from "vitest";
import geoController from "../../../src/controllers/geoController.js";
import { getProvinceFromCoordinates } from "../../../src/utils/geocode.js";
import { getRoute } from "../../../src/utils/routing.js";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/utils/geocode.js", () => ({ getProvinceFromCoordinates: vi.fn() }));
vi.mock("../../../src/utils/routing.js", () => ({ getRoute: vi.fn() }));

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

describe("geoController.route", () => {
    const query = { fromLat: "10.79", fromLng: "106.61", toLat: "10.77", toLng: "106.69" };

    it("answers the route between two positions", async () => {
        getRoute.mockResolvedValue({ distance: 9700, duration: 1400, path: [], steps: [] });

        const { res } = await callController(geoController.route, mockReq({ query }));

        expect(getRoute).toHaveBeenCalledWith({ lat: 10.79, lng: 106.61 }, { lat: 10.77, lng: 106.69 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ distance: 9700, duration: 1400, path: [], steps: [] });
    });

    it.each([[{}], [{ ...query, toLat: "abc" }], [{ ...query, fromLng: "181" }], [{ fromLat: "1", fromLng: "2" }]])("rejects %j", async (bad) => {
        const { err } = await callController(geoController.route, mockReq({ query: bad }));

        expect(err).toMatchObject({ status: 400 });
        expect(getRoute).not.toHaveBeenCalled();
    });

    it("answers 404 when there is no road, 503 when the route service fails", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        getRoute.mockResolvedValueOnce(undefined);
        expect((await callController(geoController.route, mockReq({ query }))).err).toMatchObject({ status: 404 });

        getRoute.mockRejectedValueOnce(new Error("timeout"));
        expect((await callController(geoController.route, mockReq({ query }))).err).toMatchObject({ status: 503 });
    });
});
