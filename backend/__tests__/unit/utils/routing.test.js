import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRoute } from "../../../src/utils/routing.js";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

beforeEach(() => axios.get.mockReset());

describe("getRoute", () => {
    it("asks OSRM for the driving route (longitude first) and returns it for a map", async () => {
        axios.get.mockResolvedValue({
            data: {
                code: "Ok",
                routes: [{
                    distance: 9712.4,
                    duration: 1480.2,
                    geometry: { coordinates: [[106.617, 10.796], [106.699, 10.777]] },
                    legs: [{ steps: [
                        { maneuver: { type: "depart", modifier: "right" }, name: "Hẻm 69", distance: 41.2 },
                        { maneuver: { type: "arrive" }, name: "", distance: 0 },
                        { name: "Không rõ", distance: 5 },
                    ] }],
                }],
            },
        });

        const route = await getRoute({ lat: 10.796, lng: 106.617 }, { lat: 10.777, lng: 106.699 });

        expect(axios.get).toHaveBeenCalledWith(
            "https://router.project-osrm.org/route/v1/driving/106.617,10.796;106.699,10.777",
            expect.objectContaining({ params: expect.objectContaining({ geometries: "geojson", steps: true }) }),
        );
        expect(route).toEqual({
            distance: 9712,
            duration: 1480,
            path: [[10.796, 106.617], [10.777, 106.699]],
            steps: [
                { type: "depart", modifier: "right", name: "Hẻm 69", distance: 41 },
                { type: "arrive", modifier: "", name: "", distance: 0 },
                { type: "continue", modifier: "", name: "Không rõ", distance: 5 },
            ],
        });
    });

    it("gives undefined when there is no road", async () => {
        axios.get.mockResolvedValue({ data: { code: "NoRoute", routes: [] } });
        await expect(getRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).resolves.toBeUndefined();

        axios.get.mockResolvedValue({ data: {} });
        await expect(getRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).resolves.toBeUndefined();
    });
});
