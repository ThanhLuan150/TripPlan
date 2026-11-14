import { vi } from "vitest";

// Minimal Express req / res doubles for middleware and controller tests.

export const mockReq = (overrides = {}) => ({
    headers: {},
    params: {},
    body: {},
    method: "GET",
    originalUrl: "/",
    ...overrides,
});

export const mockRes = () => {
    const res = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    res.setHeader = vi.fn(() => res);
    res.set = vi.fn(() => res);
    return res;
};

// Runs a middleware and resolves with what it passed to next() (undefined on
// success, the error otherwise). Works for asyncHandler-wrapped middleware too.
export const runMiddleware = (middleware, req, res = mockRes()) =>
    new Promise((resolve, reject) => {
        try {
            middleware(req, res, (err) => resolve(err));
        } catch (err) {
            reject(err);
        }
    });

// Calls an asyncHandler-wrapped controller and resolves once it has answered
// (res.json) or passed an error to next(): { res, err }.
export const callController = (handler, req, res = mockRes()) =>
    new Promise((resolve) => {
        const json = res.json;
        res.json = vi.fn((body) => {
            json(body);
            resolve({ res, err: undefined });
            return res;
        });
        handler(req, res, (err) => resolve({ res, err }));
    });

// A Mongoose-like document: plain data plus toObject()
export const doc = (data) => ({ ...data, toObject: () => ({ ...data }) });
