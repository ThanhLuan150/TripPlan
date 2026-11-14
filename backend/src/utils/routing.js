import axios from "axios";

// Driving route between two positions from OSRM (OpenStreetMap data, no API key;
// the public server is for light use, so the route is asked for by the backend,
// behind the rate limit). Returns
//   { distance (m), duration (s), path: [[lat, lng], ...], steps: [{ type, modifier, name, distance }] }
// or undefined when there is no road between the two places.
export const getRoute = async (from, to) => {
    const res = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`,
        { params: { overview: "simplified", geometries: "geojson", steps: true }, timeout: 10000 },
    );
    const route = res.data?.routes?.[0];
    if (res.data?.code !== "Ok" || !route) {
        return undefined;
    }
    return {
        distance: Math.round(route.distance),
        duration: Math.round(route.duration),
        // GeoJSON is [lng, lat]; the map wants [lat, lng]
        path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        steps: route.legs
            .flatMap((leg) => leg.steps)
            .map((step) => ({
                type: step.maneuver?.type ?? "continue",
                modifier: step.maneuver?.modifier ?? "",
                name: step.name || "",
                distance: Math.round(step.distance),
            })),
    };
};
