import { beforeEach, describe, expect, it, vi } from "vitest";

const models = vi.hoisted(() => ({
    User: { aggregate: vi.fn() },
    UserChallengeProgress: { aggregate: vi.fn() },
}));
vi.mock("../../../src/models/User.js", () => ({ default: models.User }));
vi.mock("../../../src/models/UserChallengeProgress.js", () => ({ default: models.UserChallengeProgress }));

const { default: userRepository } = await import("../../../src/repositories/userRepository.js");
const { default: progressRepository } = await import("../../../src/repositories/challengeProgressRepository.js");

beforeEach(() => vi.resetAllMocks());

describe("rankings are for travellers only", () => {
    it("the highest-score ranking leaves out administrators and accounts that cannot sign in", async () => {
        models.User.aggregate.mockResolvedValue([]);

        await userRepository.topByExperience(100);

        const [pipeline] = models.User.aggregate.mock.calls[0];
        expect(pipeline[0]).toEqual({ $match: { isActive: "active", role: { $ne: "admin" } } });
    });

    it.each(["rankingThisWeek", "rankingThisMonth"])("%s leaves out administrators and blocked accounts", async (name) => {
        models.UserChallengeProgress.aggregate.mockResolvedValue([]);

        await progressRepository[name]();

        const [pipeline] = models.UserChallengeProgress.aggregate.mock.calls[0];
        expect(pipeline).toContainEqual({ $match: { "user.role": { $ne: "admin" }, "user.isActive": "active" } });
        // the filter runs before the scores are summed
        const filter = pipeline.findIndex((stage) => stage.$match?.["user.role"]);
        expect(filter).toBeLessThan(pipeline.findIndex((stage) => stage.$group));
    });
});
