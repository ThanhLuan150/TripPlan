import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import TripBudgetEstimate from "../../../src/models/TripBudgetEstimate.js";
import repo from "../../../src/repositories/tripBudgetEstimateRepository.js";

vi.mock("../../../src/models/TripBudgetEstimate.js", async (importOriginal) => {
    const original = await importOriginal();
    original.default.findOne = vi.fn();
    original.default.findOneAndUpdate = vi.fn();
    return original;
});

beforeEach(() => vi.clearAllMocks());

describe("tripBudgetEstimateRepository", () => {
    it("finds the estimate only for its trip and its user", () => {
        repo.findByTrip("t", "u");
        expect(TripBudgetEstimate.findOne).toHaveBeenCalledWith({ tripId: { $eq: "t" }, userId: { $eq: "u" } });
    });

    it("upserts one estimate per trip and user", () => {
        repo.save("t", "u", { total: 5 });

        const [filter, update, options] = TripBudgetEstimate.findOneAndUpdate.mock.calls[0];
        expect(filter).toEqual({ tripId: { $eq: "t" }, userId: { $eq: "u" } });
        expect(update.$set).toMatchObject({ total: 5 });
        expect(update.$set.updatedAt).toBeInstanceOf(Date);
        expect(update.$setOnInsert.createdAt).toBeInstanceOf(Date);
        expect(options).toEqual({ new: true, upsert: true });
    });
});

describe("TripBudgetEstimate model", () => {
    const id = () => new mongoose.Types.ObjectId();

    it("requires a trip, a user, travelers and a total", () => {
        const { errors } = new TripBudgetEstimate({}).validateSync();
        expect(errors.tripId).toBeDefined();
        expect(errors.userId).toBeDefined();
        expect(errors.travelers).toBeDefined();
        expect(errors.total).toBeDefined();
    });

    it("is marked as an estimate by default and rejects negative amounts or an unknown level", () => {
        const base = { tripId: id(), userId: id(), travelers: 2, total: 10, categories: [{ key: "food", amount: 10 }] };
        const ok = new TripBudgetEstimate(base);
        expect(ok.validateSync()).toBeUndefined();
        expect(ok.isEstimate).toBe(true);
        expect(ok.currency).toBe("VND");
        expect(ok.source).toBe("ai");

        expect(new TripBudgetEstimate({ ...base, categories: [{ key: "food", amount: -1 }] }).validateSync()).toBeDefined();
        expect(new TripBudgetEstimate({ ...base, spendingLevel: "x" }).validateSync()).toBeDefined();
        expect(new TripBudgetEstimate({ ...base, total: -1 }).validateSync()).toBeDefined();
    });

    it("has a unique index on trip + user", () => {
        const index = TripBudgetEstimate.schema.indexes().find(([fields]) => fields.tripId && fields.userId);
        expect(index[1]).toMatchObject({ unique: true });
    });
});
