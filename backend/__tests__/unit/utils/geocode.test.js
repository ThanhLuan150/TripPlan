import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLocationFromNameLocation } from "../../../src/utils/geocode.js";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

describe("getLocationFromNameLocation", () => {
    beforeEach(() => {
        axios.get.mockReset();
    });

    it("asks HERE for the place in its province, biased to Vietnam", async () => {
        axios.get.mockResolvedValue({ data: { items: [] } });

        await getLocationFromNameLocation("Hồ Xuân Hương", "Lâm Đồng");

        expect(axios.get).toHaveBeenCalledWith(
            "https://autosuggest.search.hereapi.com/v1/autosuggest",
            {
                params: expect.objectContaining({
                    apikey: "test-here-key",
                    q: "Hồ Xuân Hương,Lâm Đồng",
                    lang: "vi-VN",
                    politicalView: "VNM",
                }),
            },
        );
    });

    it("returns the first item that has a position", async () => {
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
    });

    it("returns undefined when nothing matches", async () => {
        axios.get.mockResolvedValue({ data: { items: [{ title: "no position" }] } });
        await expect(getLocationFromNameLocation("???", "")).resolves.toBeUndefined();

        axios.get.mockResolvedValue({ data: {} });
        await expect(getLocationFromNameLocation("???", "")).resolves.toBeUndefined();
    });

    it("never throws: a HERE failure gives undefined", async () => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        axios.get.mockRejectedValue(new Error("Request failed with status code 401"));

        await expect(getLocationFromNameLocation("Đà Lạt", "Lâm Đồng")).resolves.toBeUndefined();
        expect(console.log).toHaveBeenCalledWith("Request failed with status code 401");
    });
});
