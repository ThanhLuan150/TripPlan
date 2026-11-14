// Thin HTTP controllers: each one passes the right request data to its
// service and answers 200 with the result (errors go to next()).
import { beforeEach, describe, expect, it, vi } from "vitest";
import challengeController from "../../../src/controllers/challengeController.js";
import chatController from "../../../src/controllers/chatController.js";
import rankingController from "../../../src/controllers/rankingController.js";
import tripPlanController from "../../../src/controllers/tripPlanController.js";
import userController from "../../../src/controllers/userController.js";
import challengeService from "../../../src/services/challengeService.js";
import chatService from "../../../src/services/chatService.js";
import tripService from "../../../src/services/tripService.js";
import userService from "../../../src/services/userService.js";
import userRepository from "../../../src/repositories/userRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import { callController, mockReq } from "../../helpers/http.js";

vi.mock("../../../src/services/challengeService.js", () => ({
    default: { checkProgress: vi.fn(), completeChallenge: vi.fn() },
}));
vi.mock("../../../src/services/chatService.js", () => ({
    default: { sendMessage: vi.fn(), listChats: vi.fn(), getChatDetail: vi.fn(), deleteChat: vi.fn() },
}));
vi.mock("../../../src/services/tripService.js", () => ({
    default: {
        generatePlans: vi.fn(),
        saveTrip: vi.fn(),
        listTrips: vi.fn(),
        getTripDetail: vi.fn(),
        deleteTrip: vi.fn(),
        getTripLocations: vi.fn(),
    },
}));
vi.mock("../../../src/services/userService.js", () => ({
    default: { updateProfile: vi.fn(), deleteAccount: vi.fn() },
}));
vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { topByExperience: vi.fn() } }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({
    default: { rankingThisMonth: vi.fn(), rankingThisWeek: vi.fn() },
}));

const user = { _id: "u1", role: "user" };
const trip = { _id: "t1" };
const chat = { _id: "c1" };
const progress = { _id: "p1", chaId: "cha1" };

beforeEach(() => {
    vi.resetAllMocks();
});

const expectOk = (res, body) => {
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(body);
};

describe("challengeController", () => {
    it("checkProgress checks the loaded progress against the user's position", async () => {
        challengeService.checkProgress.mockResolvedValue({ distance: 10 });
        const body = { chaId: "cha1", lat: 1, lng: 2 };

        const { res } = await callController(challengeController.checkProgress, mockReq({ user, challengeProgress: progress, body }));

        expect(challengeService.checkProgress).toHaveBeenCalledWith(progress, body);
        expectOk(res, { distance: 10 });
    });

    it("updateProgress completes the challenge for the signed-in user", async () => {
        challengeService.completeChallenge.mockResolvedValue({ message: "done" });
        const body = { chaId: "cha1", imageUrl: "http://img" };

        const { res } = await callController(challengeController.updateProgress, mockReq({ user, challengeProgress: progress, body }));

        expect(challengeService.completeChallenge).toHaveBeenCalledWith(progress, "u1", body);
        expectOk(res, { message: "done" });
    });
});

describe("chatController", () => {
    it("sendMessage", async () => {
        chatService.sendMessage.mockResolvedValue({ message: "sent" });
        const body = { message: "hi", idChat: null };

        const { res } = await callController(chatController.sendMessage, mockReq({ user, body }));

        expect(chatService.sendMessage).toHaveBeenCalledWith("u1", body);
        expectOk(res, { message: "sent" });
    });

    it("listChats", async () => {
        chatService.listChats.mockResolvedValue({ data: [] });

        const { res } = await callController(chatController.listChats, mockReq({ user }));

        expect(chatService.listChats).toHaveBeenCalledWith("u1");
        expectOk(res, { data: [] });
    });

    it("getChatDetail uses the conversation loaded by ownChat", async () => {
        chatService.getChatDetail.mockResolvedValue({ chat });

        const { res } = await callController(chatController.getChatDetail, mockReq({ user, chat }));

        expect(chatService.getChatDetail).toHaveBeenCalledWith(chat);
        expectOk(res, { chat });
    });

    it("deleteChat", async () => {
        chatService.deleteChat.mockResolvedValue({ message: "deleted" });

        const { res } = await callController(chatController.deleteChat, mockReq({ user, chat }));

        expect(chatService.deleteChat).toHaveBeenCalledWith("c1");
        expectOk(res, { message: "deleted" });
    });

    it("forwards errors", async () => {
        const failure = new Error("AI service unavailable");
        chatService.sendMessage.mockRejectedValue(failure);

        const { err } = await callController(chatController.sendMessage, mockReq({ user, body: {} }));
        expect(err).toBe(failure);
    });
});

describe("tripPlanController", () => {
    it.each([
        ["generatePlans", "generatePlans"],
        ["saveTrip", "saveTrip"],
    ])("%s passes the user id and the body", async (handler, method) => {
        tripService[method].mockResolvedValue({ message: "ok" });
        const body = { location: "Lâm Đồng" };

        const { res } = await callController(tripPlanController[handler], mockReq({ user, body }));

        expect(tripService[method]).toHaveBeenCalledWith("u1", body);
        expectOk(res, { message: "ok" });
    });

    it("listTrips", async () => {
        tripService.listTrips.mockResolvedValue({ dataTrip: [] });

        const { res } = await callController(tripPlanController.listTrips, mockReq({ user }));

        expect(tripService.listTrips).toHaveBeenCalledWith("u1");
        expectOk(res, { dataTrip: [] });
    });

    it("getTripDetail uses the trip loaded by ownTrip", async () => {
        tripService.getTripDetail.mockResolvedValue({ tripDatas: {} });

        await callController(tripPlanController.getTripDetail, mockReq({ user, trip }));

        expect(tripService.getTripDetail).toHaveBeenCalledWith(trip, "u1");
    });

    it.each([["deleteTrip"], ["getTripLocations"]])("%s uses the trip loaded by ownTrip", async (method) => {
        tripService[method].mockResolvedValue({ message: "ok" });

        const { res } = await callController(tripPlanController[method], mockReq({ user, trip }));

        expect(tripService[method]).toHaveBeenCalledWith(trip);
        expectOk(res, { message: "ok" });
    });
});

describe("rankingController (public, read-only)", () => {
    it("monthly", async () => {
        challengeProgressRepository.rankingThisMonth.mockResolvedValue([{ experience: 50 }]);

        const { res } = await callController(rankingController.monthly, mockReq());

        expectOk(res, { message: "Get Ranking Per Month Successfully", dataRanks: [{ experience: 50 }] });
    });

    it("weekly", async () => {
        challengeProgressRepository.rankingThisWeek.mockResolvedValue([]);

        const { res } = await callController(rankingController.weekly, mockReq());

        expectOk(res, { message: "Get Ranking Per Week Successfully", dataRanks: [] });
    });

    it("highest returns the top 100", async () => {
        userRepository.topByExperience.mockResolvedValue([]);

        const { res } = await callController(rankingController.highest, mockReq());

        expect(userRepository.topByExperience).toHaveBeenCalledWith(100);
        expectOk(res, { message: "Get the Highest Ranking User Successfully", dataRanks: [] });
    });
});

describe("userController", () => {
    it("updateProfile updates the signed-in user", async () => {
        userService.updateProfile.mockResolvedValue({ message: "ok" });
        const body = { fullname: "Lan" };

        const { res } = await callController(userController.updateProfile, mockReq({ user, body }));

        expect(userService.updateProfile).toHaveBeenCalledWith("u1", body);
        expectOk(res, { message: "ok" });
    });

    it("deleteAccount passes the actor and the :id", async () => {
        userService.deleteAccount.mockResolvedValue({ message: "deleted" });

        await callController(userController.deleteAccount, mockReq({ user, params: { id: "u2" } }));

        expect(userService.deleteAccount).toHaveBeenCalledWith(user, "u2");
    });
});
