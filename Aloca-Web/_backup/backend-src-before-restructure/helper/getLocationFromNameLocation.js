import axios from "axios";
export const getLocationFromNameLocation = async (nameLocation, province) => {
    try {
        const APIurl =
            `https://autosuggest.search.hereapi.com/v1/autosuggest?xnlp=CL_JSMv3.1.51.0&apikey=TYWNfgg1aUErbBEMMhjeeiX4uDup2tkboazOS0PY4BQ&at=52.5%2C13.4&lang=vi-VN&politicalView=VNM&limit=5&q=${nameLocation},${province}`;
            const res = await axios.get(APIurl);
        if (res.data.items && res.data.items.length > 0) {
            const latitude = res.data.items[0].position.lat;
            const longitude = res.data.items[0].position.lng;
            const location = res.data.items[0].address.label;
            return { latitude, longitude, location }
        }
        return
    }
    catch (err) {
        console.log(err);
    }
}