import { beforeEach, describe, expect, it, vi } from "vitest";
import challengeService, { MAX_DISTANCE_METERS } from "../../../src/services/challengeService.js";
import challengeRepository from "../../../src/repositories/challengeRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import userRepository from "../../../src/repositories/userRepository.js";
import tripDayRepository from "../../../src/repositories/tripDayRepository.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import { getLocationFromNameLocation } from "../../../src/utils/geocode.js";

vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findById: vi.fn(), setImage: vi.fn(), setCoordinates: vi.fn() } }));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findById: vi.fn() } }));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { findById: vi.fn() } }));
vi.mock("../../../src/utils/geocode.js", () => ({ getLocationFromNameLocation: vi.fn() }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({ default: { markCompleted: vi.fn() } }));
vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { incrementExperience: vi.fn() } }));

const challenge = { _id: "cha1", latitude: 21.0288, longitude: 105.8525, points: 30 };
const progress = (completed = false) => ({ _id: "prog1", chaId: "cha1", completed });

beforeEach(() => {
    vi.resetAllMocks();
});

describe("checkProgress", () => {
    it("answers 404 when the challenge is gone", async () => {
        challengeRepository.findById.mockResolvedValue(null);
        await expect(challengeService.checkProgress(progress(), { lat: 1, lng: 1 })).rejects.toMatchObject({ status: 404 });
    });

    const unlocated = { ...challenge, latitude: undefined, longitude: undefined, nameLocation: "Hồ Xuân Hương", location: "Hồ Xuân Hương, Lâm Đồng", tripDayId: "day1" };

    it("looks the place up when the challenge has no coordinates, keeps them and checks the distance", async () => {
        challengeRepository.findById.mockResolvedValue(unlocated);
        tripDayRepository.findById.mockResolvedValue({ tripId: "trip1" });
        tripPlanRepository.findById.mockResolvedValue({ location: "Lâm Đồng" });
        getLocationFromNameLocation.mockResolvedValue({ latitude: 11.94, longitude: 108.44 });

        const result = await challengeService.checkProgress(progress(), { lat: 11.9401, lng: 108.44 });

        expect(getLocationFromNameLocation).toHaveBeenCalledWith("Hồ Xuân Hương", "Lâm Đồng");
        expect(challengeRepository.setCoordinates).toHaveBeenCalledWith("cha1", 11.94, 108.44);
        expect(result.message).toBe("Complete the challenge");
    });

    it("then tries the saved address alone, and works without the trip", async () => {
        challengeRepository.findById.mockResolvedValue(unlocated);
        tripDayRepository.findById.mockResolvedValue(null);
        getLocationFromNameLocation.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ latitude: 11.94, longitude: 108.44 });

        await challengeService.checkProgress(progress(), { lat: 11.94, lng: 108.44 });

        expect(getLocationFromNameLocation).toHaveBeenNthCalledWith(1, "Hồ Xuân Hương", "");
        expect(getLocationFromNameLocation).toHaveBeenNthCalledWith(2, "Hồ Xuân Hương, Lâm Đồng", "");
    });

    it("answers 400 when the challenge has no coordinates", async () => {
        challengeRepository.findById.mockResolvedValue({ ...unlocated, location: undefined });
        tripDayRepository.findById.mockResolvedValue(null);
        getLocationFromNameLocation.mockResolvedValue(undefined);
        await expect(challengeService.checkProgress(progress(), { lat: 1, lng: 1 })).rejects.toMatchObject({
            status: 400,
            message: "This challenge has no location",
        });
    });

    it("answers 400 without the user's position", async () => {
        challengeRepository.findById.mockResolvedValue(challenge);
        await expect(challengeService.checkProgress(progress(), { lat: 21 })).rejects.toMatchObject({
            status: 400,
            message: "Missing lat / lng",
        });
    });

    it(`accepts a user within ${MAX_DISTANCE_METERS} m`, async () => {
        challengeRepository.findById.mockResolvedValue(challenge);

        const result = await challengeService.checkProgress(progress(), { lat: 21.0295, lng: 105.8525 }); // ~78 m north

        expect(result.message).toBe("Complete the challenge");
        expect(result.distance).toBeLessThanOrEqual(MAX_DISTANCE_METERS);
    });

    it("refuses a user too far away and tells the distance", async () => {
        challengeRepository.findById.mockResolvedValue(challenge);

        const result = await challengeService.checkProgress(progress(), { lat: 21.0368, lng: 105.8342 }); // Lăng Bác, ~2 km

        expect(result.message).toBe("Please complete the mission at the location provided");
        expect(result.distance).toBeGreaterThan(1500);
    });
});

describe("completeChallenge", () => {
    it("answers 404 when the challenge is gone", async () => {
        challengeRepository.setImage.mockResolvedValue(null);
        await expect(challengeService.completeChallenge(progress(), "u1", { imageUrl: "x" })).rejects.toMatchObject({ status: 404 });
    });

    it("saves the photo and awards the points the first time", async () => {
        challengeRepository.setImage.mockResolvedValue(challenge);

        await challengeService.completeChallenge(progress(false), "u1", { imageUrl: "http://img/1" });

        expect(challengeRepository.setImage).toHaveBeenCalledWith("cha1", "http://img/1");
        expect(challengeProgressRepository.markCompleted).toHaveBeenCalledWith("prog1");
        expect(userRepository.incrementExperience).toHaveBeenCalledWith("u1", 30);
    });

    it("only replaces the photo when already completed (points once)", async () => {
        challengeRepository.setImage.mockResolvedValue(challenge);

        await challengeService.completeChallenge(progress(true), "u1", { imageUrl: "http://img/2" });

        expect(challengeRepository.setImage).toHaveBeenCalled();
        expect(challengeProgressRepository.markCompleted).not.toHaveBeenCalled();
        expect(userRepository.incrementExperience).not.toHaveBeenCalled();
    });

    it("awards 0 points when the challenge has none", async () => {
        challengeRepository.setImage.mockResolvedValue({ ...challenge, points: undefined });

        await challengeService.completeChallenge(progress(), "u1", { imageUrl: "x" });

        expect(userRepository.incrementExperience).toHaveBeenCalledWith("u1", 0);
    });
});
