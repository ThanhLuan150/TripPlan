import { external } from "./state.js";

// Every place is on the Han river bridge, so check-in tests know where to stand.
export const getLocationFromNameLocation = async (name) => ({
    location: `${name}, Da Nang`,
    latitude: external.place.latitude,
    longitude: external.place.longitude,
});

export const getProvinceFromCoordinates = async () => external.province ?? undefined;
