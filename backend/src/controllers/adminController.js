import adminService from "../services/adminService.js";
import contentService from "../services/contentService.js";
import asyncHandler from "../utils/asyncHandler.js";

// Thin HTTP layer of the admin panel (every route needs the "admin" role).
const ok = (handler) => asyncHandler(async (req, res) => {
    res.status(200).json(await handler(req));
});

export default {
    dashboard: ok(() => adminService.dashboard()),
    alerts: ok(() => adminService.alerts()),

    listUsers: ok(() => adminService.listUsers()),
    getUser: ok((req) => adminService.getUser(req.params.id)),
    createUser: ok((req) => adminService.createUser(req.user, req.body)),
    updateUser: ok((req) => adminService.updateUser(req.user, req.params.id, req.body)),
    bulkUpdateUsers: ok((req) => adminService.bulkUpdateUsers(req.user, req.body)),
    deleteUser: ok((req) => adminService.updateUser(req.user, req.params.id, { status: "delete" })),

    listTrips: ok(() => adminService.listTrips()),
    getTrip: ok((req) => adminService.getTrip(req.params.id)),
    deleteTrip: ok((req) => adminService.deleteTrip(req.user, req.params.id)),

    listChallenges: ok(() => adminService.listChallenges()),
    updateChallenge: ok((req) => adminService.updateChallenge(req.user, req.params.id, req.body)),

    deleteChallenge: ok((req) => adminService.deleteChallenge(req.user, req.params.id)),
    roles: ok(() => adminService.roles()),
    aiOverview: ok(() => adminService.aiOverview()),
    reports: ok((req) => adminService.reports(req.query.period ?? "30d")),
    listLogs: ok(() => adminService.listLogs()),

    listModeration: ok(() => adminService.listReports()),
    decideModeration: ok((req) => adminService.decideReport(req.user, req.params.id, req.body?.status)),

    listVideos: ok(() => contentService.listVideos()),
    createVideo: ok((req) => contentService.createVideo(req.user, req.body)),
    updateVideo: ok((req) => contentService.updateVideo(req.user, req.params.id, req.body)),
    deleteVideo: ok((req) => contentService.deleteVideo(req.user, req.params.id)),

    listShowcase: ok(() => contentService.listShowcase()),
    createShowcase: ok((req) => contentService.createShowcase(req.user, req.body)),
    updateShowcase: ok((req) => contentService.updateShowcase(req.user, req.params.id, req.body)),
    deleteShowcase: ok((req) => contentService.deleteShowcase(req.user, req.params.id)),

    listAnnouncements: ok(() => contentService.listAnnouncements()),
    createAnnouncement: ok((req) => contentService.createAnnouncement(req.user, req.body)),
    updateAnnouncement: ok((req) => contentService.updateAnnouncement(req.user, req.params.id, req.body)),
    deleteAnnouncement: ok((req) => contentService.deleteAnnouncement(req.user, req.params.id)),

    getSettings: ok(() => contentService.getSettings()),
    saveSettings: ok((req) => contentService.saveSettings(req.user, req.body)),
};
