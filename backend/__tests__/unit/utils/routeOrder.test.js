import { describe, expect, it } from "vitest";
import { bestOrder, haversine, pathCost, positionOf, toCoordinate } from "../../../src/utils/routeOrder.js";

const line = (xs) => xs.map((a) => xs.map((b) => Math.abs(a - b)));

describe("coordinates", () => {
    it("reads stored string coordinates and rejects missing or impossible ones", () => {
        expect(toCoordinate("11.94", 90)).toBe(11.94);
        for (const bad of [undefined, null, "", "  ", "abc", "91"]) {
            expect(toCoordinate(bad, 90)).toBeNull();
        }
        expect(positionOf("11.9", "108.4")).toEqual({ lat: 11.9, lng: 108.4 });
        expect(positionOf("11.9", undefined)).toBeNull();
        expect(positionOf("0", "0")).toBeNull();
        expect(positionOf("100", "108")).toBeNull();
    });

    it("measures a straight-line distance in metres", () => {
        expect(haversine({ lat: 10, lng: 106 }, { lat: 10, lng: 106 })).toBe(0);
        // one degree of latitude is about 111 km
        expect(haversine({ lat: 10, lng: 106 }, { lat: 11, lng: 106 })).toBeGreaterThan(110000);
        expect(haversine({ lat: 10, lng: 106 }, { lat: 11, lng: 106 })).toBeLessThan(112000);
    });
});

describe("bestOrder", () => {
    it("keeps the first place as the start and visits every place once", () => {
        const order = bestOrder(line([0, 30, 10, 20]));
        expect(order).toEqual([0, 2, 3, 1]);
        expect(pathCost(order, line([0, 30, 10, 20]))).toBe(30);
    });

    it("returns a day with two places or fewer unchanged", () => {
        expect(bestOrder([])).toEqual([]);
        expect(bestOrder(line([0, 5]))).toEqual([0, 1]);
    });

    it("never costs more than the given order", () => {
        const cost = line([0, 50, 5, 40, 10, 30, 20]);
        const order = bestOrder(cost);
        expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(pathCost(order, cost)).toBeLessThanOrEqual(pathCost([0, 1, 2, 3, 4, 5, 6], cost));
    });

    it("uses the heuristic for big days and still returns every place once, cheaper than the input", () => {
        const xs = [0, ...Array.from({ length: 14 }, (_, i) => ((i * 7) % 14) + 1)];
        const cost = line(xs);
        const order = bestOrder(cost);
        expect([...order].sort((a, b) => a - b)).toEqual(xs.map((_, i) => i));
        expect(order[0]).toBe(0);
        expect(pathCost(order, cost)).toBeLessThanOrEqual(pathCost(xs.map((_, i) => i), cost));
    });
});
