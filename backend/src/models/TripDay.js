import mongoose from "mongoose";

const TripDaySchema = mongoose.Schema({
    tripId: { type: mongoose.Schema.ObjectId, ref: "Tripplan" },
    imageUrl: String,
    day: Number,
    dayOfWeek: String,
    date: Date,
    title: String,
    transportCost: Number,
    foodCost: Number,
    otherCost: Number
})

const TripDay = mongoose.model("TripDay", TripDaySchema);

export default TripDay;
