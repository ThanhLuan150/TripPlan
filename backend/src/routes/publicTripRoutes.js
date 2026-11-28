import { Router } from "express";
import publicTripController from "../controllers/publicTripController.js";
import postLikeController from "../controllers/postLikeController.js";
import tripPostController from "../controllers/tripPostController.js";
import savedPostController from "../controllers/savedPostController.js";
import authenticate from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// limited per IP before touching the database (the readers are not signed in)
router.use(apiLimiter);

router.get("/", optionalAuth, publicTripController.listPublicTrips);   // no sign-in: cards of public trips (+ likesCount, liked when signed in), ?page&limit
router.get("/:id", optionalAuth, publicTripController.getPublicTrip);  // no sign-in: public trips only, read only (+ likesCount, liked when signed in)
router.post("/:id/copy", authenticate, requireRole("user", "admin"), logActivity("createTrip", (req) => `copy of public trip ${req.params.id}`), publicTripController.copyPublicTrip); // role: user|admin — private copy owned by req.user

router.post("/:id/like", authenticate, requireRole("user", "admin"), postLikeController.like);     // role: user|admin — like a public post (no duplicate, idempotent)
router.delete("/:id/like", authenticate, requireRole("user", "admin"), postLikeController.unlike); // role: user|admin — remove the caller's own like (idempotent)

router.post("/:id/save", authenticate, requireRole("user", "admin"), savedPostController.save);     // role: user|admin — save a public post to read later (no duplicate, idempotent)
router.delete("/:id/save", authenticate, requireRole("user", "admin"), savedPostController.unsave); // role: user|admin — remove the caller's own saved post (idempotent)

router.post("/:id/report", authenticate, requireRole("user", "admin"), tripPostController.reportPost); // role: user|admin — { reason, description? }; report a public post (one per user, never your own)

export default router;
