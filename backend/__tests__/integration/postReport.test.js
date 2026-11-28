// HTTP-level tests of reporting a post: the reasons, the description, one report per user per
// post, posts that do not exist, and that the reporter is never revealed.
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
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({ default: { findPublicById: vi.fn() } }));
vi.mock("../../src/repositories/contentRepository.js", () => ({ default: { createReport: vi.fn(), reportExists: vi.fn() } }));
vi.mock("../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: contentRepository } = await import("../../src/repositories/contentRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const ME = "64b000000000000000000001";
const AUTHOR = "64b000000000000000000002";
const POST = "64b0000000000000000000a1";
const auth = (id = ME) => `Bearer ${generateAccessToken({ _id: id })}`;
const account = (id, username) => ({ _id: id, username, isActive: "active", role: "user", refreshToken: generateRefreshToken({ _id: id }) });

let reports;

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    const accounts = { [ME]: account(ME, "reporter"), [AUTHOR]: account(AUTHOR, "author") };
    userRepository.findById.mockImplementation(async (id) => accounts[id] ?? null);
    userRepository.updateById.mockResolvedValue({});
    tripPlanRepository.findPublicById.mockImplementation(async (id) =>
        id === POST ? { _id: POST, userId: AUTHOR, nameTrip: "Da Lat", location: "Đà Lạt", visibility: "public", status: "active" } : null);
    reports = [];
    contentRepository.reportExists.mockImplementation(async (reporterId, type, targetId) =>
        reports.some((r) => r.reporterId === String(reporterId) && r.type === type && r.targetId === String(targetId)));
    contentRepository.createReport.mockImplementation(async (data) => {
        reports.push({ ...data, reporterId: String(data.reporterId), targetId: String(data.targetId) });
        return data;
    });
});

const report = (body = { reason: "spam" }, { id = ME, post = POST } = {}) =>
    request(app).post(`/public-trip/${post}/report`).set("Authorization", auth(id)).send(body);

describe("POST /public-trip/:id/report", () => {
    it("stores a valid report with the reason, the description, the post and the reporter", async () => {
        const res = await report({ reason: "inappropriate", description: "Offensive photos" }).expect(201);

        expect(res.body).toEqual({ message: "Report sent successfully" });
        expect(reports).toEqual([
            expect.objectContaining({ type: "post", reason: "inappropriate", details: "Offensive photos", reporterId: ME, targetId: POST, authorName: "author", content: "Da Lat - Đà Lạt" }),
        ]);
    });

    it.each(["spam", "inappropriate", "wrongLocation", "copyright", "misinformation"])("accepts the reason %s without a description", async (reason) => {
        await report({ reason }).expect(201);
        expect(reports[0].reason).toBe(reason);
    });

    it("reason other needs a description", async () => {
        await report({ reason: "other" }).expect(400);
        await report({ reason: "other", description: "   " }).expect(400);
        await report({ reason: "other", description: "Something else" }).expect(201);
    });

    it.each([[undefined], [""], ["boring"], [4], [{ $ne: "x" }]])("rejects the reason %j with 400", async (reason) => {
        await report({ reason }).expect(400);
        expect(reports).toHaveLength(0);
    });

    it("rejects a description that is not text or longer than 500 characters", async () => {
        await report({ reason: "spam", description: 7 }).expect(400);
        await report({ reason: "spam", description: "a".repeat(501) }).expect(400);
        expect(reports).toHaveLength(0);
    });

    it("answers 404 for a post that does not exist (or is private / deleted) and for a malformed id", async () => {
        await report({ reason: "spam" }, { post: "64b0000000000000000000ff" }).expect(404);
        await report({ reason: "spam" }, { post: "not-an-id" }).expect(404);
        expect(reports).toHaveLength(0);
    });

    it("refuses a second report of the same post by the same user with 409", async () => {
        await report().expect(201);
        const again = await report({ reason: "copyright" }).expect(409);

        expect(again.body.message).toMatch(/already reported/);
        expect(reports).toHaveLength(1);
    });

    it("two different users can report the same post", async () => {
        const other = "64b000000000000000000003";
        userRepository.findById.mockImplementation(async (id) => ({ ...account(id, "x") }));
        await report().expect(201);
        await report({ reason: "spam" }, { id: other }).expect(201);

        expect(reports).toHaveLength(2);
    });

    it("the author cannot report their own post", async () => {
        await report({ reason: "spam" }, { id: AUTHOR }).expect(400);
        expect(reports).toHaveLength(0);
    });

    it("requires signing in", async () => {
        await request(app).post(`/public-trip/${POST}/report`).send({ reason: "spam" }).expect(401);
        expect(reports).toHaveLength(0);
    });

    it("never reveals the reporter in the answer, in any error, or in the public post", async () => {
        const created = await report().expect(201);
        const duplicate = await report().expect(409);

        for (const body of [created.body, duplicate.body]) {
            const text = JSON.stringify(body);
            expect(text).not.toContain(ME);
            expect(text).not.toContain("reporter");
        }
    });

    it("the generic report route does not accept the post type (posts are checked by their own route)", async () => {
        await request(app).post("/reports").set("Authorization", auth()).send({ type: "post", reason: "spam", content: "x" }).expect(400);
        expect(contentRepository.createReport).not.toHaveBeenCalled();
    });
});
