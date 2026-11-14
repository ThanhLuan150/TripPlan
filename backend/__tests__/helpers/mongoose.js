import { vi } from "vitest";

// A Mongoose query double: the chain methods return the query itself and
// awaiting it gives `result`.
export const query = (result) => {
    const q = {};
    for (const method of ["select", "sort", "limit", "skip", "lean"]) {
        q[method] = vi.fn(() => q);
    }
    q.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
    return q;
};
