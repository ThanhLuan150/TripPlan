import axios from "axios"

const getImagesFromLocation = async (location) => {
    const apiKey = "AIzaSyDzCjkgIHZj9SLGd82U4bIzuoMhkowG4Ds";
    const response = await axios.get(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${location}&inputtype=textquery&fields=photos,formatted_address,name,rating,opening_hours&key=${apiKey}`);
    const placeData = response.data;
    console.log(placeData);
    if (placeData.candidates && placeData.candidates.length > 0) {
        const photoReference = placeData.candidates[0].photos[0].photo_reference;
        const imageURL = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;
        console.log(imageURL);
        return imageURL;
    }
    else {
        return "https://lh3.googleusercontent.com/places/ANXAkqFOoSfKpwgYDbKEncagjRw2_hPd8ON_FZsw1BXs6g9nR0zhHe70lio2PF5yr1LL9fYP8ZkisXjRjGvuwf70M2mvRfTVwc7kPko=s1600-w400";
    }
};

export { getImagesFromLocation };