import axios from "axios";
import env from "../config/env.js";

// Looks up coordinates for a place name. HERE autosuggest first (when
// HERE_API_KEY is set and valid); when HERE has no answer or refuses the key,
// OpenStreetMap Nominatim (free, no key; its usage policy allows 1 request per
// second, see backfillLocations.js) is used instead.
// Returns { latitude, longitude, location } or undefined when nothing matches.

const fromHere = async (nameLocation, province) => {
    const res = await axios.get("https://autosuggest.search.hereapi.com/v1/autosuggest", {
        params: {
            xnlp: "CL_JSMv3.1.51.0",
            apikey: env.hereApiKey,
            // bias results to Vietnam (the old code used HERE's Berlin example point)
            at: "16.0583,105.7772",
            lang: "vi-VN",
            politicalView: "VNM",
            limit: 5,
            q: `${nameLocation},${province}`,
        },
    });
    const item = res.data.items?.find((i) => i.position) ?? res.data.items?.[0];
    if (item?.position) {
        return { latitude: item.position.lat, longitude: item.position.lng, location: item.address?.label };
    }
    return undefined;
};

const search = async (q) => {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q, format: "jsonv2", limit: 1, countrycodes: "vn", "accept-language": "vi" },
        headers: { "User-Agent": "Aloca-backend/1.0 (trip planner)" },
        timeout: 10000,
    });
    const item = res.data?.[0];
    if (item?.lat && item?.lon) {
        return { latitude: Number(item.lat), longitude: Number(item.lon), location: item.display_name };
    }
    return undefined;
};

// "TP Hồ Chí Minh" is "Hồ Chí Minh" on the map
const cleanProvince = (province) => String(province ?? "").replace(/^(TP\.?|Thành phố)\s+/i, "").trim();

// The place in its province first, then the name alone (many places are on an
// island or in a district the province name does not find).
const fromNominatim = async (nameLocation, province) => {
    const inProvince = [nameLocation, cleanProvince(province)].filter(Boolean).join(", ");
    return (await search(inProvince)) ?? (inProvince === nameLocation ? undefined : await search(nameLocation));
};

const getLocationFromNameLocation = async (nameLocation, province) => {
    if (env.hereApiKey) {
        try {
            const place = await fromHere(nameLocation, province);
            if (place) {
                return place;
            }
        } catch (err) {
            console.log(err.message);
            if (err.response?.status === 401) {
                console.log("[geo] HERE_API_KEY is not valid: using OpenStreetMap instead (create a key at https://platform.here.com)");
            }
        }
    }
    try {
        return await fromNominatim(nameLocation, province);
    } catch (err) {
        console.log(err.message);
        return undefined;
    }
};

// The province (or city) of a position: HERE reverse geocoding first, then
// OpenStreetMap. Returns the name, or undefined when none is known.
const provinceFromHere = async (latitude, longitude) => {
    const res = await axios.get("https://revgeocode.search.hereapi.com/v1/revgeocode", {
        params: { apikey: env.hereApiKey, at: `${latitude},${longitude}`, lang: "vi" },
        timeout: 10000,
    });
    const address = res.data?.items?.[0]?.address;
    return address?.county ?? address?.state ?? address?.city;
};

const provinceFromNominatim = async (latitude, longitude) => {
    const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat: latitude, lon: longitude, format: "jsonv2", zoom: 8, "accept-language": "vi" },
        headers: { "User-Agent": "Aloca-backend/1.0 (trip planner)" },
        timeout: 10000,
    });
    const address = res.data?.address;
    return address?.state ?? address?.county ?? address?.city;
};

const getProvinceFromCoordinates = async (latitude, longitude) => {
    if (env.hereApiKey) {
        try {
            const name = await provinceFromHere(latitude, longitude);
            if (name) {
                return name;
            }
        } catch (err) {
            console.log(err.message);
        }
    }
    try {
        return (await provinceFromNominatim(latitude, longitude)) || undefined;
    } catch (err) {
        console.log(err.message);
        return undefined;
    }
};

export { getLocationFromNameLocation, getProvinceFromCoordinates };
