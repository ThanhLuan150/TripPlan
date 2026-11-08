// import { firebase } from "../firebase/index.js";

// const sendNotification = async () => {
//     try {
//         await firebase.messaging().send({
//             token: "e1SplqtlTXeKVCGIR-fHtk:APA91bH75TQP3Ds5mAMWZEWizEzfoeT6mbSYaULFY7sfNR3FmgyZ0qd7CunB9SDNSkj0bTVgC9iJE5XJVYSH9SWDy03wN0uiGMLT_9O5CuoVub5aM9WZ731-7o9slcW8VbNeOuv0JqRR",
//             notification: {
//                 title: "khanh",
//                 body: "khanhdeptrai"
//             }
//         })
//         console.log("send notification successfully");
//     } catch (error) {
//         console.log("send fail", error);
//     }
// }

// setTimeout(() => {
//     sendNotification();
// }, 2000);