import HttpError from "../utils/HttpError.js";

// Role check, after `authenticate`. Roles: "user" (default) and "admin".
//   router.delete("/:id", authenticate, requireRole("admin"), ...)
const requireRole = (...roles) => (req, res, next) => {
    const role = req.user?.role || "user";
    if (!roles.includes(role)) {
        return next(new HttpError(403, "Permission denied"));
    }
    next();
};

export default requireRole;
