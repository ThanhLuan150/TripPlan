import contentRepository from "../repositories/contentRepository.js";

// Writes one entry of the activity log. Never throws: logging must not break
// the request it describes.
const record = async ({ actor, actorName, action, target = "", ip = "", level = "info" }) => {
    try {
        await contentRepository.createLog({
            actorId: actor?._id,
            actorName: actorName ?? actor?.fullname ?? actor?.username ?? "",
            action,
            target: String(target ?? "").slice(0, 200),
            ip,
            level,
        });
    } catch (err) {
        console.error(`[activity-log] ${err.message}`);
    }
};

export default { record };
