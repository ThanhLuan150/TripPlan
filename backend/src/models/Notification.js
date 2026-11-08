import mongoose from "mongoose";

const NotificationSchema = mongoose.Schema({
    tripDayId: { type: mongoose.Schema.ObjectId, ref: "TripDay" },
    notificationDate: Date,
    isRead: { type: Boolean, default: false }
})

const Notification = mongoose.model("Notification", NotificationSchema);

export default Notification;