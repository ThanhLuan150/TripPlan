// Pure helpers for ordering places by travel cost. Nothing here invents a distance: every number comes
// from coordinates or from the routing service the caller passes in.

const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

// A stored coordinate (a string in the database) -> number, or null when it is missing or not a position
export const toCoordinate = (value, limit) => {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

// { lat, lng } of a place, or null when either coordinate is missing/invalid (or both are 0: not a real place)
export const positionOf = (latitude, longitude) => {
    const lat = toCoordinate(latitude, 90);
    const lng = toCoordinate(longitude, 180);
    return lat === null || lng === null || (lat === 0 && lng === 0) ? null : { lat, lng };
};

// Straight-line distance in metres between two { lat, lng } (great circle, not a road distance)
export const haversine = (a, b) => {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
};

export const pathCost = (order, cost) => order.slice(1).reduce((sum, to, i) => sum + cost[order[i]][to], 0);

const MAX_EXACT = 11; // places after the fixed start: 2^11 * 11 * 11 steps at most

// Cheapest open path that starts at place 0 and visits every place once. cost[i][j] is the cost from i
// to j (may be asymmetric). Exact (Held-Karp) for small days, nearest neighbour + 2-opt for large ones.
export const bestOrder = (cost) => {
    const n = cost.length;
    if (n <= 2) {
        return Array.from({ length: n }, (_, i) => i);
    }
    return n - 1 <= MAX_EXACT ? exactOrder(cost) : heuristicOrder(cost);
};

const exactOrder = (cost) => {
    const m = cost.length - 1; // places 1..m are free
    const full = (1 << m) - 1;
    const best = Array.from({ length: 1 << m }, () => new Array(m).fill(Infinity));
    const prev = Array.from({ length: 1 << m }, () => new Array(m).fill(-1));
    for (let j = 0; j < m; j++) {
        best[1 << j][j] = cost[0][j + 1];
    }
    for (let mask = 1; mask <= full; mask++) {
        for (let j = 0; j < m; j++) {
            if (!(mask & (1 << j)) || best[mask][j] === Infinity) {
                continue;
            }
            for (let k = 0; k < m; k++) {
                if (mask & (1 << k)) {
                    continue;
                }
                const next = mask | (1 << k);
                const value = best[mask][j] + cost[j + 1][k + 1];
                // strict < keeps the earliest order on ties, so the result is deterministic
                if (value < best[next][k]) {
                    best[next][k] = value;
                    prev[next][k] = j;
                }
            }
        }
    }
    let last = 0;
    for (let j = 1; j < m; j++) {
        if (best[full][j] < best[full][last]) {
            last = j;
        }
    }
    const order = [];
    let mask = full;
    while (last !== -1) {
        order.push(last + 1);
        const before = prev[mask][last];
        mask &= ~(1 << last);
        last = before;
    }
    return [0, ...order.reverse()];
};

const heuristicOrder = (cost) => {
    const order = [0];
    const left = new Set(Array.from({ length: cost.length - 1 }, (_, i) => i + 1));
    while (left.size > 0) {
        const from = order[order.length - 1];
        const next = [...left].reduce((a, b) => (cost[from][b] < cost[from][a] ? b : a));
        order.push(next);
        left.delete(next);
    }
    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 1; i < order.length - 1; i++) {
            for (let j = i + 1; j < order.length; j++) {
                const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
                if (pathCost(candidate, cost) < pathCost(order, cost)) {
                    order.splice(0, order.length, ...candidate);
                    improved = true;
                }
            }
        }
    }
    return order;
};
