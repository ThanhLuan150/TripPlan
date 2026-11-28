import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import SavedPost from "../../../src/models/SavedPost.js";

const id = () => new mongoose.Types.ObjectId();

describe("SavedPost", () => {
    it("requires a user and a trip", () => {
        const { errors } = new SavedPost({}).validateSync();

        expect(errors.userId).toBeDefined();
        expect(errors.tripId).toBeDefined();
    });

    it("is valid with both ids and gets a creation date", () => {
        const saved = new SavedPost({ tripId: id(), userId: id() });

        expect(saved.validateSync()).toBeUndefined();
        expect(saved.createdAt).toBeInstanceOf(Date);
    });

    it("has a unique (user, trip) index so a post cannot be saved twice", () => {
        const unique = SavedPost.schema.indexes().find(([fields]) => fields.tripId && fields.userId);

        expect(unique[1].unique).toBe(true);
    });

    it("indexes (user, newest first) for the saved list", () => {
        expect(SavedPost.schema.indexes().some(([fields]) => fields.userId === 1 && fields.createdAt === -1)).toBe(true);
    });
});
