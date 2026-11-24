import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import FavoriteTrip from "../../../src/models/FavoriteTrip.js";

const id = () => new mongoose.Types.ObjectId();

describe("FavoriteTrip", () => {
    it("requires a user and a trip", () => {
        const { errors } = new FavoriteTrip({}).validateSync();

        expect(errors.userId).toBeDefined();
        expect(errors.tripId).toBeDefined();
    });

    it("is valid with both ids and gets a creation date", () => {
        const favorite = new FavoriteTrip({ userId: id(), tripId: id() });

        expect(favorite.validateSync()).toBeUndefined();
        expect(favorite.createdAt).toBeInstanceOf(Date);
    });

    it("has a unique (user, trip) index", () => {
        const unique = FavoriteTrip.schema.indexes().find(([fields]) => fields.userId && fields.tripId);

        expect(unique[1].unique).toBe(true);
    });
});
