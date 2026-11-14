import activityLogService from "../services/activityLogService.js";

// Records an activity-log entry once the request has been answered with a
// success. `describe(req)` gives the target shown in the log (a trip name...).
//   router.post("/save-trip", authenticate, logActivity("createTrip", (req) => req.body.nameTrip), ...)
const logActivity = (action, describe = () => "") => (req, res, next) => {
    res.on("finish", () => {
        if (res.statusCode >= 400) {
            return;
        }
        activityLogService.record({
            actor: req.user,
            // the sign-in request has no user yet: log the name that was typed
            actorName: req.user ? undefined : req.body?.username,
            action,
            target: describe(req),
            ip: req.ip,
        });
    });
    next();
};

export default logActivity;
