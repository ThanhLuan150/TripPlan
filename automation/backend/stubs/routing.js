import { external } from "./state.js";

export const getRoute = async () => {
    if (external.route?.error) {
        throw new Error(external.route.error);
    }
    return external.route;
};

// distances (m) and durations (s) between the places of a day: { distances, durations } (matrices),
// { error } for a service that is down, null for "no road" (the app then measures straight lines)
export const getRouteMatrix = async () => {
    if (external.routeMatrix?.error) {
        throw new Error(external.routeMatrix.error);
    }
    return external.routeMatrix ?? undefined;
};
