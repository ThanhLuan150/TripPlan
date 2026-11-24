import { beforeEach, describe, expect, it, vi } from "vitest";
import tripShareService, { SHARE_TOKEN_PATTERN } from "../../../src/services/tripShareService.js";
import tripPlanRepository from "../../../src/repositories/tripPlanRepository.js";

vi.mock("../../../src/config/env.js", () => ({ default: { webUrl: "https://aloca.test" } }));
vi.mock("../../../src/repositories/tripPlanRepository.js", () => ({
    default: { enableShare: vi.fn(), disableShare: vi.fn(), findSharedByToken: vi.fn() },
}));
vi.mock("../../../src/repositories/tripDayRepository.js", () => ({ default: { findByTripId: vi.fn() } }));
vi.mock("../../../src/repositories/challengeRepository.js", () => ({ default: { findByTripDayId: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

describe("trip share links", () => {
    it("enabling creates an unguessable token and returns the full web link when WEB_URL is set", async () => {
        tripPlanRepository.enableShare.mockImplementation(async (id, token) => ({ shareEnabled: true, shareToken: token, sharePermission: "view" }));

        const res = await tripShareService.enableShare({ _id: "t1", shareEnabled: false });

        expect(res.shareToken).toMatch(SHARE_TOKEN_PATTERN);
        expect(res.shareUrl).toBe(`https://aloca.test/shared/${res.shareToken}`);
    });

    it("two links never share a token", async () => {
        tripPlanRepository.enableShare.mockImplementation(async (id, token) => ({ shareEnabled: true, shareToken: token }));
        const a = await tripShareService.enableShare({ _id: "t1" });
        const b = await tripShareService.enableShare({ _id: "t1" });
        expect(a.shareToken).not.toBe(b.shareToken);
    });

    it("a status of a trip that is not shared has no token and no url", async () => {
        const res = await tripShareService.getShareStatus({ shareEnabled: false, shareToken: "x".repeat(43) });
        expect(res).toMatchObject({ isShared: false, shareToken: null, shareUrl: null, permission: null });
    });

    it("an invalid token never reaches the database", async () => {
        await expect(tripShareService.getSharedTrip({ $ne: "x" })).rejects.toMatchObject({ status: 404 });
        expect(tripPlanRepository.findSharedByToken).not.toHaveBeenCalled();
    });
});
