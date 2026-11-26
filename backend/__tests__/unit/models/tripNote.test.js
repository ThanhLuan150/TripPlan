import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import TripNote from "../../../src/models/TripNote.js";

const id = () => new mongoose.Types.ObjectId();

describe("TripNote", () => {
    it("requires a trip, a user and a content", () => {
        const { errors } = new TripNote({}).validateSync();

        expect(errors.tripId).toBeDefined();
        expect(errors.userId).toBeDefined();
        expect(errors.content).toBeDefined();
    });

    it("is valid with the three fields and gets its dates", () => {
        const note = new TripNote({ tripId: id(), userId: id(), content: "  Bring a coat  " });

        expect(note.validateSync()).toBeUndefined();
        expect(note.content).toBe("Bring a coat");
        expect(note.createdAt).toBeInstanceOf(Date);
        expect(note.updatedAt).toBeInstanceOf(Date);
    });

    it("limits the content to 2000 characters", () => {
        const long = new TripNote({ tripId: id(), userId: id(), content: "a".repeat(2001) }).validateSync();
        const ok = new TripNote({ tripId: id(), userId: id(), content: "a".repeat(2000) }).validateSync();

        expect(long.errors.content).toBeDefined();
        expect(ok).toBeUndefined();
    });

    it("indexes the notes of a trip of a user", () => {
        const index = TripNote.schema.indexes().find(([fields]) => fields.tripId && fields.userId);

        expect(index).toBeDefined();
    });
});
