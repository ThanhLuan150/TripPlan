import { beforeEach, describe, expect, it, vi } from "vitest";
import { ownChallenge, ownChat, ownTrip } from "../../../src/middleware/ownership.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";
import chatRepository from "../../../src/repositories/chatRepository.js";
import challengeProgressRepository from "../../../src/repositories/challengeProgressRepository.js";
import { mockReq, runMiddleware } from "../../helpers/http.js";

vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({ default: { findOwnedById: vi.fn() } }));
vi.mock("../../../src/repositories/chatRepository.js", () => ({ default: { findOwned: vi.fn() } }));
vi.mock("../../../src/repositories/challengeProgressRepository.js", () => ({ default: { findOne: vi.fn() } }));

const user = { _id: "64b000000000000000000001" };
const validId = "64b0000000000000000000aa";

const cases = [
    {
        name: "ownTrip",
        middleware: ownTrip,
        finder: () => tripPlanRepository.findOwnedById,
        req: (id) => mockReq({ user, params: { id } }),
        loadedAs: "trip",
        message: "Data Trip not found!",
    },
    {
        name: "ownChat",
        middleware: ownChat,
        finder: () => chatRepository.findOwned,
        req: (id) => mockReq({ user, params: { id } }),
        loadedAs: "chat",
        message: "This conversation does not exist",
    },
    {
        name: "ownChallenge",
        middleware: ownChallenge,
        finder: () => challengeProgressRepository.findOne,
        req: (chaId) => mockReq({ user, body: { chaId } }),
        loadedAs: "challengeProgress",
        message: "Challenge not found",
    },
];

describe.each(cases)("$name", ({ middleware, finder, req: makeReq, loadedAs, message }) => {
    beforeEach(() => {
        finder().mockReset();
    });

    it("loads the resource of the user onto req", async () => {
        const resource = { _id: validId };
        finder().mockResolvedValue(resource);
        const req = makeReq(validId);

        const err = await runMiddleware(middleware, req);

        expect(err).toBeUndefined();
        expect(req[loadedAs]).toBe(resource);
        // the query is always scoped to the signed-in user
        expect(finder().mock.calls[0]).toContain(user._id);
    });

    it("answers 404 when it belongs to someone else / does not exist", async () => {
        finder().mockResolvedValue(null);

        const err = await runMiddleware(middleware, makeReq(validId));
        expect(err).toMatchObject({ status: 404, message });
    });

    it("answers 404 for an invalid id without querying the database", async () => {
        const err = await runMiddleware(middleware, makeReq("not-an-id"));

        expect(err).toMatchObject({ status: 404, message });
        expect(finder()).not.toHaveBeenCalled();
    });
});
