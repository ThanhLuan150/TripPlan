import { Router } from "express";
import adminController from "../controllers/adminController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

// Everything here is for administrators only.
router.use(authenticate, requireRole("admin"));

router.get("/dashboard", adminController.dashboard);
router.get("/alerts", adminController.alerts);

router.get("/users", adminController.listUsers);                       // 1000 newest accounts
router.post("/users", adminController.createUser);                      // { fullname, username, email, password, phone?, role? } — active account
router.post("/users/bulk-status", adminController.bulkUpdateUsers);   // { ids, status, suspendReason? }: skips what cannot change
router.get("/users/:id", adminController.getUser);                     // account + trips, challenges, activity
router.patch("/users/:id", adminController.updateUser);                // { fullname?, email?, phone?, role?, status?, suspendReason? } — not your own account
router.delete("/users/:id", adminController.deleteUser);               // soft delete: the account can no longer sign in

router.get("/trips", adminController.listTrips);
router.get("/trips/:id", adminController.getTrip);                      // trip + its days
router.delete("/trips/:id", adminController.deleteTrip);               // soft delete: gone from the user's list too

router.get("/challenges", adminController.listChallenges);
router.patch("/challenges/:id", adminController.updateChallenge);      // { nameLocation?, challengeSummary?, points? }

router.delete("/challenges/:id", adminController.deleteChallenge);    // removes the challenge and its progress
router.get("/roles", adminController.roles);                          // { members: { user, admin }, permissions }
router.get("/ai", adminController.aiOverview);
router.get("/reports", adminController.reports);                       // ?period=7d|30d|90d
router.get("/logs", adminController.listLogs);

router.get("/moderation", adminController.listModeration);
router.patch("/moderation/:id", adminController.decideModeration);     // { status: "approved" | "rejected" }

router.get("/videos", adminController.listVideos);
router.post("/videos", adminController.createVideo);
router.patch("/videos/:id", adminController.updateVideo);
router.delete("/videos/:id", adminController.deleteVideo);

router.get("/showcase", adminController.listShowcase);                // pictures of the home page of the app
router.post("/showcase", adminController.createShowcase);               // { kind: "banner"|"suggestion", imageUrl, title?, location?, status?, sortOrder? }
router.patch("/showcase/:id", adminController.updateShowcase);
router.delete("/showcase/:id", adminController.deleteShowcase);

router.get("/announcements", adminController.listAnnouncements);
router.post("/announcements", adminController.createAnnouncement);
router.patch("/announcements/:id", adminController.updateAnnouncement);
router.delete("/announcements/:id", adminController.deleteAnnouncement);

router.get("/settings", adminController.getSettings);
router.put("/settings", adminController.saveSettings);                 // { appName?, supportEmail?, hotline? }

export default router;
