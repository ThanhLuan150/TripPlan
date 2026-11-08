import axios from "axios";
import env from "../config/env.js";

// Looks up coordinates for a place name with the HERE autosuggest API.
// Returns { latitude, longitude, location } or undefined when nothing matches.
const getLocationFromNameLocation = async (nameLocation, province) => {
    try {
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
            return {
                latitude: item.position.lat,
                longitude: item.position.lng,
                location: item.address?.label,
            };
        }
        return undefined;
    } catch (err) {
        console.log(err.message);
        return undefined;
    }
};

export { getLocationFromNameLocation };
