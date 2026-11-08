import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
    apiKey: "AIzaSyBG-zolcYgCP7S_ebLiAR8Jwb-t6wnBGEU",
    authDomain: "aloca-415007.firebaseapp.com",
    projectId: "aloca-415007",
    storageBucket: "aloca-415007.appspot.com",
    messagingSenderId: "895725137815",
    appId: "1:895725137815:web:9403cede372d38b56c1ed2",
    measurementId: "G-KMJYXYRRQD"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { storage, db };