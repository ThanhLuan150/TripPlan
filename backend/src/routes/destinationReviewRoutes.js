import { Router } from "express";
import destinationReviewController from "../controllers/destinationReviewController.js";
import authenticate from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import requireRole from "../middleware/requireRole.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (the readers are not signed in)
router.use(apiLimiter);

router.get("/", optionalAuth, destinationReviewController.list);                                       // no sign-in: ?destination=<province>&page&limit — reviews + average (+ myReview when signed in)
router.post("/", authenticate, requireRole("user", "admin"), destinationReviewController.create);      // role: user|admin — { destination, rating 1-5, content }; one review per destination
router.put("/:id", authenticate, requireRole("user", "admin"), destinationReviewController.update);    // role: user|admin + author of the review — { rating?, content? }
router.delete("/:id", authenticate, requireRole("user", "admin"), destinationReviewController.remove); // role: user|admin + author of the review

export default router;
