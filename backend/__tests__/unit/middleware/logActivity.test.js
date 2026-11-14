import { beforeEach, describe, expect, it, vi } from "vitest";
import activityLogService from "../../../src/services/activityLogService.js";
import logActivity from "../../../src/middleware/logActivity.js";
import { mockReq, mockRes } from "../../helpers/http.js";

vi.mock("../../../src/services/activityLogService.js", () => ({ default: { record: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

// a response that calls its "finish" listener when ended
const finishing = (statusCode) => {
    const res = { ...mockRes(), statusCode, on: vi.fn() };
    return { res, finish: () => res.on.mock.calls.find(([event]) => event === "finish")[1]() };
};

describe("logActivity", () => {
    it("lets the request go on, and records it after a success", () => {
        const next = vi.fn();
        const { res, finish } = finishing(200);
        const req = mockReq({ user: { _id: "u1" }, ip: "9.9.9.9", body: { nameTrip: "Huế" } });

        logActivity("createTrip", (r) => r.body.nameTrip)(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(activityLogService.record).not.toHaveBeenCalled();

        finish();
        expect(activityLogService.record).toHaveBeenCalledWith({
            actor: req.user,
            actorName: undefined,
            action: "createTrip",
            target: "Huế",
            ip: "9.9.9.9",
        });
    });

    it("records the typed username when nobody is signed in yet", () => {
        const { res, finish } = finishing(201);

        logActivity("login")(mockReq({ body: { username: "lan" } }), res, vi.fn());
        finish();

        expect(activityLogService.record).toHaveBeenCalledWith(expect.objectContaining({ actorName: "lan", target: "" }));
    });

    it("records nothing when the request failed", () => {
        const { res, finish } = finishing(403);

        logActivity("login")(mockReq(), res, vi.fn());
        finish();

        expect(activityLogService.record).not.toHaveBeenCalled();
    });
});
