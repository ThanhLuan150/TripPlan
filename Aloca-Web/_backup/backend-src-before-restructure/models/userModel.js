import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required field!"],
        unique: true,
        lowercase: true
    },
    fullname: String,
    address: String,
    fcmToken: String,
    email: {
        type: String,
        required: [true, "Email is required field!"],
        unique: true,
        lowercase: true
    },
    image: {
        type: String,
        default: "https://cdn.sforum.vn/sforum/wp-content/uploads/2023/10/avatar-trang-67.jpg"
    },
    backgroundImage: {
        type: String,
        default: "https://png.pngtree.com/thumb_back/fh260/background/20210915/pngtree-geometric-pattern-white-gold-minimalist-creative-background-image_879782.jpg"
    },
    phone: {
        type: String
    },
    city: { type: String },
    level: {
        type: Number,
        default: 1
    },
    experience:
    {
        type: Number,
        default: 0,
    },

    password: {
        type: String,
        required: [true, "Password is required field!"],
    },
    code: String,
    isActive: { type: String, default: "notActive" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    role: {
        type: String,
        default: "user"
    },
    refreshToken: String,
})





UserSchema.pre("save", function (next) {
    if (!this.fullname) {
        this.fullname = this.username;
    }
    next();
})

const User = mongoose.model("User", UserSchema);


export default User;
