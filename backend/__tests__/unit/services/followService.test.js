import { beforeEach, describe, expect, it, vi } from "vitest";
import followService from "../../../src/services/followService.js";
import followRepository from "../../../src/repositories/followRepository.js";
import userRepository from "../../../src/repositories/userRepository.js";

vi.mock("../../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn() } }));
vi.mock("../../../src/repositories/followRepository.js", () => ({
    default: { add: vi.fn(), remove: vi.fn(), exists: vi.fn(), countFollowers: vi.fn(), countFollowing: vi.fn() },
}));

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const actor = { _id: ME };
const account = (extra = {}) => ({ _id: OTHER, username: "other", fullname: "Other", isActive: "active", experience: 40, ...extra });

beforeEach(() => {
    vi.resetAllMocks();
    userRepository.findById.mockResolvedValue(account());
    followRepository.exists.mockResolvedValue(false);
    followRepository.countFollowers.mockResolvedValue(0);
    followRepository.countFollowing.mockResolvedValue(0);
});

describe("follow", () => {
    it("stores the relation of the caller and returns the new state and followers count", async () => {
        followRepository.exists.mockResolvedValue(true);
        followRepository.countFollowers.mockResolvedValue(5);

        const result = await followService.follow(actor, OTHER);

        expect(followRepository.add).toHaveBeenCalledWith(ME, OTHER);
        expect(result).toMatchObject({ following: true, followersCount: 5 });
    });

    it("refuses to follow yourself", async () => {
        userRepository.findById.mockResolvedValue(account({ _id: ME }));

        await expect(followService.follow(actor, ME)).rejects.toMatchObject({ status: 400 });
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it.each([["malformed id", "abc"], ["undefined id", undefined]])("answers 404 for a %s", async (_name, id) => {
        await expect(followService.follow(actor, id)).rejects.toMatchObject({ status: 404 });
        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it.each(["delete", "notActive"])("answers 404 for an account that is %s", async (isActive) => {
        userRepository.findById.mockResolvedValue(account({ isActive }));

        await expect(followService.follow(actor, OTHER)).rejects.toMatchObject({ status: 404 });
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("answers 404 when the account does not exist", async () => {
        userRepository.findById.mockResolvedValue(null);

        await expect(followService.follow(actor, OTHER)).rejects.toMatchObject({ status: 404 });
    });

    it("answers 403 for a suspended account", async () => {
        userRepository.findById.mockResolvedValue(account({ isActive: "suspended" }));

        await expect(followService.follow(actor, OTHER)).rejects.toMatchObject({ status: 403 });
        expect(followRepository.add).not.toHaveBeenCalled();
    });
});

describe("unfollow", () => {
    it("removes the relation and returns the new state", async () => {
        const result = await followService.unfollow(actor, OTHER);

        expect(followRepository.remove).toHaveBeenCalledWith(ME, OTHER);
        expect(result).toMatchObject({ following: false, followersCount: 0 });
    });

    it("checks the target too", async () => {
        userRepository.findById.mockResolvedValue(null);

        await expect(followService.unfollow(actor, OTHER)).rejects.toMatchObject({ status: 404 });
        expect(followRepository.remove).not.toHaveBeenCalled();
    });
});

describe("getProfile", () => {
    it("returns only public fields with the counts and whether the caller follows", async () => {
        userRepository.findById.mockResolvedValue(account({ email: "secret@x.com", phone: "123", address: "somewhere", password: "hash" }));
        followRepository.exists.mockResolvedValue(true);
        followRepository.countFollowers.mockResolvedValue(7);
        followRepository.countFollowing.mockResolvedValue(2);

        const { user } = await followService.getProfile(actor, OTHER);

        expect(user).toMatchObject({ id: OTHER, fullname: "Other", experience: 40, isSelf: false, following: true, followersCount: 7, followingCount: 2 });
        expect(user).not.toHaveProperty("email");
        expect(user).not.toHaveProperty("phone");
        expect(user).not.toHaveProperty("password");
        expect(followRepository.exists).toHaveBeenCalledWith(ME, OTHER);
    });

    it("marks the caller's own profile", async () => {
        userRepository.findById.mockResolvedValue(account({ _id: ME }));

        expect((await followService.getProfile(actor, ME)).user.isSelf).toBe(true);
    });

    it("resolves \"me\" to the caller", async () => {
        userRepository.findById.mockResolvedValue(account({ _id: ME }));
        followRepository.countFollowers.mockResolvedValue(3);

        const { user } = await followService.getProfile(actor, "me");

        expect(userRepository.findById).toHaveBeenCalledWith(ME);
        expect(user).toMatchObject({ id: ME, isSelf: true, followersCount: 3 });
    });

    it("does not accept \"me\" to follow", async () => {
        await expect(followService.follow(actor, "me")).rejects.toMatchObject({ status: 404 });
        expect(followRepository.add).not.toHaveBeenCalled();
    });

    it("falls back to the username and zero experience", async () => {
        userRepository.findById.mockResolvedValue(account({ fullname: undefined, experience: undefined }));

        expect((await followService.getProfile(actor, OTHER)).user).toMatchObject({ fullname: "other", experience: 0 });
    });

    it("answers 404 / 403 for missing or suspended accounts", async () => {
        userRepository.findById.mockResolvedValue(null);
        await expect(followService.getProfile(actor, OTHER)).rejects.toMatchObject({ status: 404 });
        userRepository.findById.mockResolvedValue(account({ isActive: "suspended" }));
        await expect(followService.getProfile(actor, OTHER)).rejects.toMatchObject({ status: 403 });
    });
});
