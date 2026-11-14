import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocationFromNameLocation, getProvinceFromCoordinates } from "../../../src/utils/geocode.js";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const HERE = "https://autosuggest.search.hereapi.com/v1/autosuggest";
const OSM = "https://nominatim.openstreetmap.org/search";

describe("getLocationFromNameLocation", () => {
    beforeEach(() => {
        axios.get.mockReset();
        vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("asks HERE for the place in its province, biased to Vietnam", async () => {
        axios.get.mockResolvedValue({ data: { items: [{ position: { lat: 1, lng: 2 } }] } });

        await getLocationFromNameLocation("Hồ Xuân Hương", "Lâm Đồng");

        expect(axios.get).toHaveBeenCalledWith(HERE, {
            params: expect.objectContaining({ apikey: "test-here-key", q: "Hồ Xuân Hương,Lâm Đồng", lang: "vi-VN", politicalView: "VNM" }),
        });
    });

    it("returns the first HERE item that has a position", async () => {
        axios.get.mockResolvedValue({
            data: {
                items: [
                    { title: "a query suggestion, no position" },
                    { position: { lat: 11.94, lng: 108.44 }, address: { label: "Hồ Xuân Hương, Đà Lạt" } },
                ],
            },
        });

        await expect(getLocationFromNameLocation("Hồ Xuân Hương", "Lâm Đồng")).resolves.toEqual({
            latitude: 11.94,
            longitude: 108.44,
            location: "Hồ Xuân Hương, Đà Lạt",
        });
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it("falls back to OpenStreetMap when HERE finds nothing", async () => {
        axios.get.mockImplementation(async (url) =>
            url === HERE ? { data: { items: [{ title: "no position" }] } } : { data: [{ lat: "11.94", lon: "108.44", display_name: "Hồ Xuân Hương, Đà Lạt" }] },
        );

        await expect(getLocationFromNameLocation("Hồ Xuân Hương", "Lâm Đồng")).resolves.toEqual({
            latitude: 11.94,
            longitude: 108.44,
            location: "Hồ Xuân Hương, Đà Lạt",
        });
        expect(axios.get).toHaveBeenLastCalledWith(
            OSM,
            expect.objectContaining({ params: expect.objectContaining({ q: "Hồ Xuân Hương, Lâm Đồng", countrycodes: "vn" }), headers: expect.objectContaining({ "User-Agent": expect.any(String) }) }),
        );
    });

    it("falls back to OpenStreetMap, and says why, when HERE refuses the key", async () => {
        axios.get.mockImplementation(async (url) => {
            if (url === HERE) {
                throw Object.assign(new Error("Request failed with status code 401"), { response: { status: 401 } });
            }
            return { data: [{ lat: "21.03", lon: "105.85", display_name: "Hà Nội" }] };
        });

        await expect(getLocationFromNameLocation("Hồ Hoàn Kiếm", "")).resolves.toMatchObject({ latitude: 21.03, longitude: 105.85 });
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining("HERE_API_KEY is not valid"));
        expect(axios.get).toHaveBeenLastCalledWith(OSM, expect.objectContaining({ params: expect.objectContaining({ q: "Hồ Hoàn Kiếm" }) }));
    });

    it("on OpenStreetMap tries the place alone when the province does not find it, and writes TP Hồ Chí Minh as Hồ Chí Minh", async () => {
        axios.get.mockImplementation(async (url, options) => {
            if (url === HERE) {
                return { data: { items: [] } };
            }
            return { data: options.params.q === "VinWonders Phú Quốc" ? [{ lat: "10.33", lon: "103.85", display_name: "VinWonders" }] : [] };
        });

        await expect(getLocationFromNameLocation("VinWonders Phú Quốc", "Kiên Giang")).resolves.toMatchObject({ latitude: 10.33 });
        const queries = axios.get.mock.calls.filter(([url]) => url === OSM).map(([, options]) => options.params.q);
        expect(queries).toEqual(["VinWonders Phú Quốc, Kiên Giang", "VinWonders Phú Quốc"]);

        axios.get.mockClear();
        await getLocationFromNameLocation("Nhà thờ Đức Bà", "TP Hồ Chí Minh");
        expect(axios.get.mock.calls.find(([url]) => url === OSM)[1].params.q).toBe("Nhà thờ Đức Bà, Hồ Chí Minh");
    });

    it("returns undefined when nobody knows the place", async () => {
        axios.get.mockResolvedValue({ data: {} });
        await expect(getLocationFromNameLocation("???", "")).resolves.toBeUndefined();

        axios.get.mockImplementation(async (url) => (url === HERE ? { data: { items: [] } } : { data: [{}] }));
        await expect(getLocationFromNameLocation("???", "")).resolves.toBeUndefined();
    });

    it("never throws: when every service fails the answer is undefined", async () => {
        axios.get.mockRejectedValue(new Error("Network Error"));

        await expect(getLocationFromNameLocation("Đà Lạt", "Lâm Đồng")).resolves.toBeUndefined();
        expect(console.log).toHaveBeenCalledWith("Network Error");
    });

    describe("getProvinceFromCoordinates", () => {
        const HERE_REV = "https://revgeocode.search.hereapi.com/v1/revgeocode";
        const OSM_REV = "https://nominatim.openstreetmap.org/reverse";

        it("asks HERE first, with the key on the server side", async () => {
            axios.get.mockResolvedValue({ data: { items: [{ address: { county: "Quận 1" } }] } });

            await expect(getProvinceFromCoordinates(10.77, 106.7)).resolves.toBe("Quận 1");

            expect(axios.get).toHaveBeenCalledWith(HERE_REV, expect.objectContaining({ params: expect.objectContaining({ apikey: "test-here-key", at: "10.77,106.7", lang: "vi" }) }));
        });

        it("falls back to OpenStreetMap when HERE refuses the key or knows nothing", async () => {
            axios.get.mockImplementation(async (url) => {
                if (url === HERE_REV) {
                    throw new Error("Request failed with status code 401");
                }
                return { data: { address: { state: "Thành phố Hồ Chí Minh" } } };
            });

            await expect(getProvinceFromCoordinates(10.77, 106.7)).resolves.toBe("Thành phố Hồ Chí Minh");
            expect(axios.get).toHaveBeenLastCalledWith(OSM_REV, expect.objectContaining({ params: expect.objectContaining({ lat: 10.77, lon: 106.7 }) }));

            axios.get.mockImplementation(async (url) => (url === HERE_REV ? { data: { items: [] } } : { data: { address: { county: "Huyện X" } } }));
            await expect(getProvinceFromCoordinates(1, 2)).resolves.toBe("Huyện X");
        });

        it("gives undefined when nobody knows, and never throws", async () => {
            axios.get.mockImplementation(async (url) => (url === HERE_REV ? { data: {} } : { data: {} }));
            await expect(getProvinceFromCoordinates(0, 0)).resolves.toBeUndefined();

            axios.get.mockRejectedValue(new Error("Network Error"));
            await expect(getProvinceFromCoordinates(0, 0)).resolves.toBeUndefined();
        });
    });
});
