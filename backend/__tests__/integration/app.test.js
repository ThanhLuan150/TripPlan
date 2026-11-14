// HTTP-level tests of the whole Express app (routing, auth, roles, ownership,
// upload, error format). Only the database layer and external services are
// replaced by mocks, so no MongoDB / Gemini / HERE / Gmail is needed.
import { Readable } from "node:stream";
import bcrypt from "bcrypt";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/db.js", () => ({
    default: vi.fn(),
    connectDatabaseWithRetry: vi.fn(),
    isDatabaseConnected: vi.fn(),
    isDatabaseDown: vi.fn(),
    describeDbError: (err) => err.message,
}));
vi.mock("../../src/repositories/userRepository.js", () => ({
    default: {
        findById: vi.fn(),
        findByUsername: vi.fn(),
        findByEmail: vi.fn(),
        updateById: vi.fn(),
        topByExperience: vi.fn(),
    },
}));
vi.mock("../../src/repositories/tripPlanRepository.js", () => ({
    default: { findActiveByUser: vi.fn(), findOwnedById: vi.fn() },
}));
vi.mock("../../src/repositories/challengeProgressRepository.js", () => ({
    default: { rankingThisWeek: vi.fn(), rankingThisMonth: vi.fn(), findOne: vi.fn() },
}));
vi.mock("../../src/repositories/imageRepository.js", () => ({
    default: { save: vi.fn(), findById: vi.fn(), openDownloadStream: vi.fn() },
}));
vi.mock("../../src/utils/mailer.js", () => ({ sendVerificationCodeEmail: vi.fn() }));

const { default: app } = await import("../../src/app.js");
const db = await import("../../src/config/db.js");
const { default: userRepository } = await import("../../src/repositories/userRepository.js");
const { default: tripPlanRepository } = await import("../../src/repositories/tripPlanRepository.js");
const { default: challengeProgressRepository } = await import("../../src/repositories/challengeProgressRepository.js");
const { default: imageRepository } = await import("../../src/repositories/imageRepository.js");
const { generateAccessToken, generateRefreshToken } = await import("../../src/utils/jwt.js");

const USER_ID = "64b000000000000000000001";
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
let passwordHash;

const user = (extra = {}) => {
    const data = {
        _id: USER_ID,
        username: "traveler",
        email: "traveler@example.com",
        password: passwordHash,
        isActive: "active",
        role: "user",
        refreshToken: generateRefreshToken({ _id: USER_ID }),
        ...extra,
    };
    return { ...data, toObject: () => ({ ...data }) };
};
const auth = (id = USER_ID) => `Bearer ${generateAccessToken({ _id: id })}`;

beforeAll(async () => {
    passwordHash = await bcrypt.hash("secret123", 4);
});

beforeEach(() => {
    vi.resetAllMocks();
    db.isDatabaseConnected.mockReturnValue(true);
    db.isDatabaseDown.mockReturnValue(false);
    userRepository.findById.mockResolvedValue(user());
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("platform", () => {
    it("GET /health reports the database state", async () => {
        await request(app).get("/health").expect(200, { status: "ok", db: "connected" });

        db.isDatabaseConnected.mockReturnValue(false);
        await request(app).get("/health").expect(503, { status: "degraded", db: "disconnected" });
    });

    it("answers 503 at once while the database is down", async () => {
        db.isDatabaseDown.mockReturnValue(true);

        await request(app).get("/rankings/weekly").expect(503, { message: "Database unavailable" });
        expect(challengeProgressRepository.rankingThisWeek).not.toHaveBeenCalled();
    });

    it("answers unknown routes with a JSON 404", async () => {
        await request(app).get("/nope").expect(404, { message: "Not found: GET /nope" });
    });

    it("answers a malformed JSON body with 400", async () => {
        await request(app)
            .post("/auth/login")
            .set("Content-Type", "application/json")
            .send('{"username": ')
            .expect(400, { message: "Invalid JSON body" });
    });

    it("allows cross-origin calls and exposes the refreshed token header", async () => {
        const res = await request(app).get("/health").set("Origin", "https://web.example.com");

        expect(res.headers["access-control-allow-origin"]).toBe("*");
        expect(res.headers["access-control-expose-headers"]).toBe("Authorization");
    });
});

describe("auth routes", () => {
    it("POST /auth/login returns a token and the public profile", async () => {
        userRepository.findByUsername.mockResolvedValue(user());
        userRepository.updateById.mockImplementation(async () => user());

        const res = await request(app).post("/auth/login").send({ username: "Traveler", password: "secret123" }).expect(200);

        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(res.body.data).toMatchObject({ username: "traveler", email: "traveler@example.com" });
        expect(res.body.data).not.toHaveProperty("password");
        expect(res.body.data).not.toHaveProperty("refreshToken");
    });

    it("POST /auth/login with a wrong password is 401", async () => {
        userRepository.findByUsername.mockResolvedValue(user());

        await request(app).post("/auth/login").send({ username: "traveler", password: "nope" }).expect(401, { message: "Incorrect password" });
    });

    it("POST /auth/register reports which field is taken", async () => {
        userRepository.findByEmail.mockResolvedValue(user());

        await request(app)
            .post("/auth/register")
            .send({ username: "other", email: "traveler@example.com", password: "123456", confirmPassword: "123456" })
            .expect(401, { message: "Username or email already exist", field: "email" });
    });
});

describe("protected routes", () => {
    it("require a token", async () => {
        await request(app).get("/trip-plan/get-trip").expect(401, { message: "Your token not found" });
        await request(app).get("/chat").expect(401);
        await request(app).post("/challenge/checkProgress").expect(401);
    });

    it("return the signed-in user's data", async () => {
        tripPlanRepository.findActiveByUser.mockResolvedValue([{ nameTrip: "Đà Lạt" }]);

        const res = await request(app).get("/trip-plan/get-trip").set("Authorization", auth()).expect(200);

        expect(res.body).toEqual({ message: "Get Trip Successfully", dataTrip: [{ nameTrip: "Đà Lạt" }] });
        expect(tripPlanRepository.findActiveByUser).toHaveBeenCalledWith(USER_ID);
    });

    it("refuse a role outside user / admin", async () => {
        userRepository.findById.mockResolvedValue(user({ role: "guest" }));

        await request(app).get("/trip-plan/get-trip").set("Authorization", auth()).expect(403, { message: "Permission denied" });
    });

    it("hide other users' trips behind a 404", async () => {
        tripPlanRepository.findOwnedById.mockResolvedValue(null);

        await request(app)
            .get("/trip-plan/get-trip/64b0000000000000000000ff")
            .set("Authorization", auth())
            .expect(404, { message: "Data Trip not found!" });
        expect(tripPlanRepository.findOwnedById).toHaveBeenCalledWith("64b0000000000000000000ff", USER_ID);
    });

    it("send a new access token in the response header when it expired", async () => {
        const jwt = (await import("jsonwebtoken")).default;
        const expired = jwt.sign({ userId: USER_ID, exp: Math.floor(Date.now() / 1000) - 5 }, process.env.ACCESS_TOKEN_SECRET);
        tripPlanRepository.findActiveByUser.mockResolvedValue([]);

        const res = await request(app).get("/trip-plan/get-trip").set("Authorization", `Bearer ${expired}`).expect(200);

        expect(res.headers.authorization).toMatch(/^Bearer .+/);
    });

    it("POST /user/:id never lets a user delete someone else", async () => {
        userRepository.updateById.mockResolvedValue({ _id: USER_ID });

        await request(app).post("/user/64b0000000000000000000ff").set("Authorization", auth()).expect(200);

        expect(userRepository.updateById).toHaveBeenCalledWith(USER_ID, { isActive: "delete" });
    });
});

describe("public rankings", () => {
    it("GET /rankings/* need no token", async () => {
        challengeProgressRepository.rankingThisWeek.mockResolvedValue([{ fullname: "Lan", points: 90 }]);
        challengeProgressRepository.rankingThisMonth.mockResolvedValue([]);
        userRepository.topByExperience.mockResolvedValue([]);

        const res = await request(app).get("/rankings/weekly").expect(200);
        expect(res.body.dataRanks).toEqual([{ fullname: "Lan", points: 90 }]);

        await request(app).get("/rankings/monthly").expect(200);
        await request(app).get("/rankings/rankingUserHighest").expect(200);
        expect(userRepository.topByExperience).toHaveBeenCalledWith(100);
    });
});

describe("images", () => {
    it("POST /upload/image stores a real image and returns its URL", async () => {
        imageRepository.save.mockResolvedValue("img1");

        const res = await request(app)
            .post("/upload/image")
            .set("Authorization", auth())
            .attach("image", PNG, { filename: "photo.png", contentType: "image/png" })
            .expect(201);

        expect(res.body).toMatchObject({ id: "img1", url: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+\/files\/img1$/) });
    });

    it("POST /upload/image refuses a non-image type", async () => {
        const res = await request(app)
            .post("/upload/image")
            .set("Authorization", auth())
            .attach("image", Buffer.from("hello"), { filename: "notes.txt", contentType: "text/plain" })
            .expect(400);

        expect(res.body.code).toBe("IMAGE_TYPE");
    });

    it("POST /upload/image refuses a file over MAX_IMAGE_MB", async () => {
        const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]); // MAX_IMAGE_MB=1 in tests

        const res = await request(app)
            .post("/upload/image")
            .set("Authorization", auth())
            .attach("image", big, { filename: "big.png", contentType: "image/png" })
            .expect(413);

        expect(res.body.code).toBe("IMAGE_TOO_LARGE");
        expect(imageRepository.save).not.toHaveBeenCalled();
    });

    it("POST /upload/image reports a missing file and unexpected fields", async () => {
        let res = await request(app).post("/upload/image").set("Authorization", auth()).field("x", "y").expect(400);
        expect(res.body.code).toBe("IMAGE_MISSING");

        res = await request(app)
            .post("/upload/image")
            .set("Authorization", auth())
            .attach("photo", PNG, { filename: "p.png", contentType: "image/png" })
            .expect(400);
        expect(res.body.code).toBe("UPLOAD_ERROR");
    });

    it("POST /upload/image needs a token", async () => {
        await request(app).post("/upload/image").attach("image", PNG, "p.png").expect(401);
    });

    it("GET /files/:id streams the image with safe, cacheable headers", async () => {
        imageRepository.findById.mockResolvedValue({ _id: "img1", contentType: "image/png", length: PNG.length });
        imageRepository.openDownloadStream.mockReturnValue(Readable.from([PNG]));

        const res = await request(app).get("/files/img1").expect(200);

        expect(res.headers["content-type"]).toBe("image/png");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["cache-control"]).toContain("immutable");
        expect(Buffer.compare(res.body, PNG)).toBe(0);
    });

    it("GET /files/:id is 404 for unknown files or non-image content", async () => {
        imageRepository.findById.mockResolvedValue(null);
        await request(app).get("/files/missing").expect(404, { message: "File not found" });

        imageRepository.findById.mockResolvedValue({ _id: "x", contentType: "text/html", length: 10 });
        await request(app).get("/files/x").expect(404);
    });
});
