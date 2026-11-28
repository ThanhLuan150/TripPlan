import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import DestinationReview, { MAX_REVIEW_LENGTH } from "../../../src/models/DestinationReview.js";

const id = () => new mongoose.Types.ObjectId();
const valid = (extra = {}) => ({ destination: "Hà Giang", userId: id(), rating: 4, content: "Đẹp", ...extra });

describe("DestinationReview", () => {
    it("requires destination, user, rating and content", () => {
        const { errors } = new DestinationReview({}).validateSync();

        for (const field of ["destination", "userId", "rating", "content"]) {
            expect(errors[field]).toBeDefined();
        }
    });

    it("is valid and gets dates", () => {
        const review = new DestinationReview(valid());

        expect(review.validateSync()).toBeUndefined();
        expect(review.createdAt).toBeInstanceOf(Date);
        expect(review.updatedAt).toBeInstanceOf(Date);
    });

    it.each([0, 6, -1])("rejects a rating outside 1-5 (%s)", (rating) => {
        expect(new DestinationReview(valid({ rating })).validateSync().errors.rating).toBeDefined();
    });

    it.each([1, 5])("accepts the rating %s at the edge of the scale", (rating) => {
        expect(new DestinationReview(valid({ rating })).validateSync()).toBeUndefined();
    });

    it("limits the length of the comment", () => {
        const long = new DestinationReview(valid({ content: "a".repeat(MAX_REVIEW_LENGTH + 1) }));

        expect(long.validateSync().errors.content).toBeDefined();
    });

    it("has a unique (user, destination) index: one review per destination", () => {
        const unique = DestinationReview.schema.indexes().find(([fields]) => fields.userId && fields.destination);

        expect(unique[1].unique).toBe(true);
    });

    it("indexes (destination, newest first) for the list", () => {
        expect(DestinationReview.schema.indexes().some(([f]) => f.destination === 1 && f.createdAt === -1)).toBe(true);
    });
});
