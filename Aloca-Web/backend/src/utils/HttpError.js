// Error with an HTTP status. Throw it from services / repositories and the
// errorHandler middleware turns it into `res.status(status).json({ message, ...body })`.
export default class HttpError extends Error {
    constructor(status, message, body = {}) {
        super(message);
        this.status = status;
        this.body = body;
    }
}
