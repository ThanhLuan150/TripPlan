// HTTP-level tests of destination reviews: public reading, the 1-5 scale, one review per
// destination, the average, and that only the author can edit or delete a review.
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({ default: { findById: vi.fn(), updateById: vi.fn() } }));
vi.mock("../../src/repositories/destinationReviewRepository.js", () => ({
    default: {
        findById: vi.fn(), findByUser: vi.fn(), create: vi.fn(), updateById: vi.fn(), deleteById: vi.fn(),
        listByDestination: vi.fn(), countByDestination: vi.fn(), summarize: vi.fn(),
    },
}));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: repo } = await import("../../src/repositories/destinationReviewRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const ME = "64b000000000000000000001";
const OTHER = "64b000000000000000000002";
const DEST = "Hà Giang";
const auth = (id = ME) => `Bearer ${generateAccessToken({ _id: id })}`;
const account = (id, username) => ({ _id: id, username, isActive: "active", role: "user", lastActiveAt: new Date(), refreshToken: generateRefreshToken({ _id: id }) });

let reviews; // in-memory collection standing in for the repository
let nextId;

const average = (destination) => {
    const rows = reviews.filter((r) => r.destination === destination);
    return rows.length ? { average: rows.reduce((sum, r) => sum + r.rating, 0) / rows.length, count: rows.length } : { average: null, count: 0 };
};

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    const accounts = { [ME]: account(ME, "me"), [OTHER]: account(OTHER, "other") };
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    reviews = [];
    nextId = 1;
    repo.findById.mockImplementation(async (id) => reviews.find((r) => r._id === id) ?? null);
    repo.findByUser.mockImplementation(async (userId, destination) => reviews.find((r) => r.userId === String(userId) && r.destination === destination) ?? null);
    repo.create.mockImplementation(async (data) => {
        const review = { _id: `64b0000000000000000000e${nextId++}`, createdAt: new Date(), updatedAt: new Date(), ...data, userId: String(data.userId) };
        reviews.push(review);
        return review;
    });
    repo.updateById.mockImplementation(async (id, changes) => Object.assign(reviews.find((r) => r._id === id), changes));
    repo.deleteById.mockImplementation(async (id) => {
        reviews = reviews.filter((r) => r._id !== id);
    });
    repo.listByDestination.mockImplementation(async (destination, skip, limit) =>
        reviews.filter((r) => r.destination === destination).reverse().slice(skip, skip + limit)
            .map((r) => ({ ...r, userId: { _id: r.userId, username: r.userId === ME ? "me" : "other", email: "secret@x.y" } })));
    repo.countByDestination.mockImplementation(async (destination) => reviews.filter((r) => r.destination === destination).length);
    repo.summarize.mockImplementation(async (destination) => average(destination));
});

const post = (body, id = ME) => request(app).post("/destination-reviews").set("Authorization", auth(id)).send(body);
const list = (query = { destination: DEST }, token) => {
    const req = request(app).get("/destination-reviews").query(query);
    return token ? req.set("Authorization", token) : req;
};

describe("creating a review", () => {
    it("a signed-in user creates a valid review and gets the new average", async () => {
        const res = await post({ destination: DEST, rating: 4, content: "Cảnh đẹp" }).expect(201);

        expect(res.body.review).toMatchObject({ destination: DEST, rating: 4, content: "Cảnh đẹp", mine: true });
        expect(res.body.summary).toEqual({ average: 4, count: 1 });
        expect(reviews[0].userId).toBe(ME);
    });

    it("the average follows every new review (accurate to one decimal)", async () => {
        await post({ destination: DEST, rating: 5, content: "a" }).expect(201);
        await post({ destination: DEST, rating: 4, content: "b" }, OTHER).expect(201);

        const read = await list().expect(200);
        expect(read.body.summary).toEqual({ average: 4.5, count: 2 });
    });

    it("requires signing in", async () => {
        await request(app).post("/destination-reviews").send({ destination: DEST, rating: 4, content: "x" }).expect(401);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it("answers 404 for a destination that does not exist", async () => {
        await post({ destination: "Atlantis", rating: 4, content: "x" }).expect(404);
        await post({ rating: 4, content: "x" }).expect(404);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it.each([[0], [6], [4.5], ["abc"], [null], [undefined]])("rejects the rating %j with 400", async (rating) => {
        await post({ destination: DEST, rating, content: "x" }).expect(400);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it.each([[""], ["   "], [undefined], [12], ["a".repeat(1001)]])("rejects the comment %j with 400", async (content) => {
        await post({ destination: DEST, rating: 4, content }).expect(400);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it("refuses a second review of the same destination with 409 (edit it instead)", async () => {
        await post({ destination: DEST, rating: 4, content: "first" }).expect(201);
        await post({ destination: DEST, rating: 1, content: "again" }).expect(409);

        expect(reviews).toHaveLength(1);
        expect(reviews[0].content).toBe("first");
    });

    it("the same user can still review a different destination", async () => {
        await post({ destination: DEST, rating: 4, content: "a" }).expect(201);
        await post({ destination: "Hà Nội", rating: 3, content: "b" }).expect(201);

        expect(reviews).toHaveLength(2);
    });
});

describe("reading the reviews", () => {
    beforeEach(async () => {
        await post({ destination: DEST, rating: 5, content: "mine" }).expect(201);
        await post({ destination: DEST, rating: 3, content: "theirs" }, OTHER).expect(201);
    });

    it("anyone can read them without signing in, with the average, and nobody is marked as mine", async () => {
        const res = await list().expect(200);

        expect(res.body).toMatchObject({ destination: DEST, total: 2, summary: { average: 4, count: 2 }, myReview: null });
        expect(res.body.items.map((item) => item.mine)).toEqual([false, false]);
        expect(res.headers["cache-control"]).toBe("no-store");
    });

    it("a signed-in user gets their own review marked and its id", async () => {
        const res = await list(undefined, auth()).expect(200);

        expect(res.body.myReview).toMatchObject({ _id: reviews[0]._id, mine: true, content: "mine" });
        expect(res.body.items.find((item) => item.content === "mine").mine).toBe(true);
        expect(res.body.items.find((item) => item.content === "theirs").mine).toBe(false);
    });

    it("shows only the public name of the authors, never an e-mail or a password", async () => {
        const res = await list().expect(200);

        expect(JSON.stringify(res.body)).not.toContain("secret@x.y");
        expect(Object.keys(res.body.items[0].author).sort()).toEqual(["_id", "image", "username"]);
    });

    it("pages the reviews", async () => {
        const res = await list({ destination: DEST, page: 2, limit: 1 }).expect(200);

        expect(res.body).toMatchObject({ page: 2, limit: 1, total: 2 });
        expect(res.body.items).toHaveLength(1);
    });

    it("answers an empty list and no average for a destination without reviews", async () => {
        const res = await list({ destination: "Hà Nội" }).expect(200);

        expect(res.body).toMatchObject({ total: 0, items: [], summary: { average: null, count: 0 } });
    });

    it("answers 404 for an unknown destination, a missing one and a non-text one", async () => {
        await list({ destination: "Atlantis" }).expect(404);
        await list({}).expect(404);
        await request(app).get("/destination-reviews?destination[$ne]=x").expect(404);
    });
});

describe("editing and deleting", () => {
    let id;
    beforeEach(async () => {
        id = (await post({ destination: DEST, rating: 5, content: "mine" }).expect(201)).body.review._id;
    });

    it("the author edits the rating and the comment and the average is updated", async () => {
        const res = await request(app).put(`/destination-reviews/${id}`).set("Authorization", auth()).send({ rating: 2, content: "changed" }).expect(200);

        expect(res.body.review).toMatchObject({ rating: 2, content: "changed" });
        expect(res.body.summary).toEqual({ average: 2, count: 1 });
    });

    it("somebody else cannot edit or delete the review (403) and nothing changes", async () => {
        await request(app).put(`/destination-reviews/${id}`).set("Authorization", auth(OTHER)).send({ rating: 1 }).expect(403);
        await request(app).delete(`/destination-reviews/${id}`).set("Authorization", auth(OTHER)).expect(403);

        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({ rating: 5, content: "mine" });
    });

    it("the destination and the author can never be changed through an edit", async () => {
        await request(app).put(`/destination-reviews/${id}`).set("Authorization", auth()).send({ rating: 3, destination: "Hà Nội", userId: OTHER }).expect(200);

        expect(reviews[0]).toMatchObject({ destination: DEST, userId: ME, rating: 3 });
    });

    it("rejects an invalid edit with 400 and an empty one too", async () => {
        await request(app).put(`/destination-reviews/${id}`).set("Authorization", auth()).send({ rating: 9 }).expect(400);
        await request(app).put(`/destination-reviews/${id}`).set("Authorization", auth()).send({}).expect(400);
    });

    it("the author deletes the review and the average goes back to none", async () => {
        const res = await request(app).delete(`/destination-reviews/${id}`).set("Authorization", auth()).expect(200);

        expect(res.body.summary).toEqual({ average: null, count: 0 });
        expect(reviews).toHaveLength(0);
        // and may write a new one afterwards
        await post({ destination: DEST, rating: 3, content: "again" }).expect(201);
    });

    it("answers 404 for an unknown or malformed review id", async () => {
        await request(app).put("/destination-reviews/64b0000000000000000000ff").set("Authorization", auth()).send({ rating: 1 }).expect(404);
        await request(app).delete("/destination-reviews/not-an-id").set("Authorization", auth()).expect(404);
    });

    it("requires signing in", async () => {
        await request(app).put(`/destination-reviews/${id}`).send({ rating: 1 }).expect(401);
        await request(app).delete(`/destination-reviews/${id}`).expect(401);
        expect(reviews).toHaveLength(1);
    });
});
