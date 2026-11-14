// Schemas: defaults, required fields, enums, casting and hooks. Validation
// runs in memory; save() only needs a stubbed insertOne.
import { afterEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import User, { ROLES } from "../../../src/models/User.js";
import TripPlan from "../../../src/models/TripPlan.js";
import TripDay from "../../../src/models/TripDay.js";
import Challenge from "../../../src/models/Challenge.js";
import UserChallengeProgress from "../../../src/models/UserChallengeProgress.js";
import ChatAi from "../../../src/models/ChatAi.js";
import Question from "../../../src/models/Question.js";
import Response from "../../../src/models/Response.js";
import Notification from "../../../src/models/Notification.js";

const id = () => new mongoose.Types.ObjectId();
const validUser = (extra = {}) => new User({ username: "Traveler", email: "Lan@Example.com", password: "hash", ...extra });

afterEach(() => {
    vi.restoreAllMocks();
});

describe("User", () => {
    it("requires username, email and password", () => {
        const { errors } = new User({}).validateSync();

        expect(errors.username.message).toBe("Username is required field!");
        expect(errors.email.message).toBe("Email is required field!");
        expect(errors.password.message).toBe("Password is required field!");
    });

    it("stores username and email in lower case", () => {
        const user = validUser();

        expect(user.username).toBe("traveler");
        expect(user.email).toBe("lan@example.com");
        expect(user.validateSync()).toBeUndefined();
    });

    it("has safe defaults for a new account", () => {
        const user = validUser();

        expect(user.role).toBe("user");
        expect(user.isActive).toBe("notActive"); // until the email is confirmed
        expect(user.level).toBe(1);
        expect(user.experience).toBe(0);
        expect(user.image).toMatch(/^https:\/\//);
        expect(user.createdAt).toBeInstanceOf(Date);
    });

    it("only accepts the known roles", () => {
        expect(ROLES).toEqual(["user", "admin"]);
        expect(validUser({ role: "admin" }).validateSync()).toBeUndefined();
        expect(validUser({ role: "superadmin" }).validateSync().errors.role).toBeDefined();
    });

    it("uses the username as full name when none is given (pre-save hook)", async () => {
        vi.spyOn(User.collection, "insertOne").mockResolvedValue({ acknowledged: true });

        const user = validUser();
        await user.save();
        expect(user.fullname).toBe("traveler");

        const named = validUser({ fullname: "Lan Nguyễn" });
        await named.save();
        expect(named.fullname).toBe("Lan Nguyễn");
    });
});

describe("TripPlan / TripDay / Challenge", () => {
    it("keeps the existing collection names", () => {
        expect(TripPlan.modelName).toBe("Tripplan");
        expect(TripPlan.collection.collectionName).toBe("tripplans");
        expect(UserChallengeProgress.modelName).toBe("UserChallengProgress");
    });

    it("a trip is active by default", () => {
        expect(new TripPlan({ userId: id(), nameTrip: "x" }).status).toBe("active");
    });

    it("casts the trip day fields", () => {
        const day = new TripDay({ tripId: id(), day: "2", date: "2026-03-02", transportCost: "100000" });

        expect(day.day).toBe(2);
        expect(day.date).toBeInstanceOf(Date);
        expect(day.transportCost).toBe(100000);
        expect(new TripDay({ day: "two" }).validateSync().errors.day).toBeDefined();
    });

    it("stores challenge coordinates as strings and points as a number", () => {
        const challenge = new Challenge({ tripDayId: id(), latitude: 11.94, longitude: 108.44, points: "30" });

        expect(challenge.latitude).toBe("11.94");
        expect(challenge.longitude).toBe("108.44");
        expect(challenge.points).toBe(30);
    });
});

describe("UserChallengeProgress", () => {
    it("is not completed by default and has timestamps", () => {
        const progress = new UserChallengeProgress({ userId: id(), chaId: id() });

        expect(progress.completed).toBe(false);
        expect(UserChallengeProgress.schema.options.timestamps).toBe(true);
    });
});

describe("chat models", () => {
    it("a conversation gets creation and last-message times", () => {
        const chat = new ChatAi({ title: "Đà Lạt", userId: id() });

        expect(chat.createdAt).toBeInstanceOf(Date);
        expect(chat.updatedAt).toBeInstanceOf(Date);
    });

    it("questions and answers are dated", () => {
        expect(new Question({ chatAiId: id(), content: "Q" }).createdAt).toBeInstanceOf(Date);
        expect(new Response({ chatAiId: id(), content: "A" }).createdAt).toBeInstanceOf(Date);
    });

    it("rejects an invalid conversation id", () => {
        expect(new Question({ chatAiId: "nope" }).validateSync().errors.chatAiId).toBeDefined();
    });
});

describe("Notification", () => {
    it("is unread by default", () => {
        expect(new Notification({ tripDayId: id() }).isRead).toBe(false);
    });
});
