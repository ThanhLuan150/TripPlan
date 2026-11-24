import { external } from "./state.js";

export const getRoute = async () => {
    if (external.route?.error) {
        throw new Error(external.route.error);
    }
    return external.route;
};
