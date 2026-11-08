import firebase from "firebase-admin";
import serviceAccount from "./serverviceAccountKey.json"assert { type: "json" };

firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
})
export { firebase }