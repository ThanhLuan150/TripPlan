import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Follow from "../../../src/models/Follow.js";

const id = () => new mongoose.Types.ObjectId();

describe("Follow", () => {
    it("requires a follower and a followed account", () => {
        const { errors } = new Follow({}).validateSync();

        expect(errors.followerId).toBeDefined();
        expect(errors.followingId).toBeDefined();
    });

    it("is valid with both ids and gets a creation date", () => {
        const follow = new Follow({ followerId: id(), followingId: id() });

        expect(follow.validateSync()).toBeUndefined();
        expect(follow.createdAt).toBeInstanceOf(Date);
    });

    it("has a unique (follower, following) index so a relation cannot be duplicated", () => {
        const unique = Follow.schema.indexes().find(([fields]) => fields.followerId && fields.followingId);

        expect(unique[1].unique).toBe(true);
    });

    it("indexes followingId for follower counts", () => {
        expect(Follow.schema.indexes().some(([fields]) => Object.keys(fields).join() === "followingId")).toBe(true);
    });
});
