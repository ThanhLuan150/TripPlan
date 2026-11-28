import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import PostLike from "../../../src/models/PostLike.js";

const id = () => new mongoose.Types.ObjectId();

describe("PostLike", () => {
    it("requires a trip and a user", () => {
        const { errors } = new PostLike({}).validateSync();

        expect(errors.tripId).toBeDefined();
        expect(errors.userId).toBeDefined();
    });

    it("is valid with both ids and gets a creation date", () => {
        const like = new PostLike({ tripId: id(), userId: id() });

        expect(like.validateSync()).toBeUndefined();
        expect(like.createdAt).toBeInstanceOf(Date);
    });

    it("has a unique (trip, user) index so a like cannot be duplicated", () => {
        const unique = PostLike.schema.indexes().find(([fields]) => fields.tripId && fields.userId);

        expect(unique[1].unique).toBe(true);
    });

    it("indexes userId for per-user lookups", () => {
        expect(PostLike.schema.indexes().some(([fields]) => Object.keys(fields).join() === "userId")).toBe(true);
    });
});
