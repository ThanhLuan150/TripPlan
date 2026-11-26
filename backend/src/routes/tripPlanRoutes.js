import { Router } from "express";
import tripPlanController from "../controllers/tripPlanController.js";
import tripNoteController from "../controllers/tripNoteController.js";
import authenticate from "../middleware/auth.js";
import requireRole from "../middleware/requireRole.js";
import logActivity from "../middleware/logActivity.js";
import { ownNote, ownTrip, validTripId } from "../middleware/ownership.js";
import { apiLimiter } from "../middleware/rateLimit.js";

const router = Router();

// rate limited before anything else (sign-in checks, database access)
router.use(apiLimiter);

router.use(authenticate, requireRole("user", "admin"));

router.post("/", tripPlanController.generatePlans);                      // role: user|admin — AI suggestions, nothing saved
router.post("/save-trip", logActivity("createTrip", (req) => req.body?.nameTrip), tripPlanController.saveTrip);                  // role: user|admin — saves the chosen plan for req.user
router.get("/get-trip", tripPlanController.listTrips);                   // role: user|admin — own trips
router.get("/get-trip/:id", ownTrip, tripPlanController.getTripDetail);  // role: user|admin + owner of the trip
router.get("/favorites", tripPlanController.listFavoriteTrips);          // role: user|admin — own favorite trips (deleted trips left out)
router.post("/:id/favorite", ownTrip, tripPlanController.addFavoriteTrip);  // role: user|admin + owner of the trip — idempotent
router.delete("/:id/favorite", validTripId, tripPlanController.removeFavoriteTrip); // role: user|admin — removes only the caller's own favorite
router.post("/:id/duplicate", ownTrip, logActivity("createTrip", (req) => `${req.trip?.nameTrip} (duplicate)`), tripPlanController.duplicateTrip); // role: user|admin + owner of the trip — copy owned by req.user
router.get("/:id/export-pdf", ownTrip, tripPlanController.exportTripPdf); // role: user|admin + owner of the trip — read only, PDF download
router.get("/:id/share", ownTrip, tripPlanController.getShareStatus);    // role: user|admin + owner of the trip
router.post("/:id/share", ownTrip, tripPlanController.enableShare);      // role: user|admin + owner of the trip — idempotent
router.delete("/:id/share", ownTrip, tripPlanController.disableShare);   // role: user|admin + owner of the trip — revokes the link
router.get("/:id/visibility", ownTrip, tripPlanController.getVisibility);   // role: user|admin + owner of the trip
router.put("/:id/visibility", ownTrip, tripPlanController.setVisibility);   // role: user|admin + owner of the trip — { visibility: "public" | "private" }
router.get("/:id/notes", ownTrip, tripNoteController.listNotes);         // role: user|admin + owner of the trip — only the caller's own notes
router.post("/:id/notes", ownTrip, tripNoteController.createNote);       // role: user|admin + owner of the trip — { content }
router.put("/:id/notes/:noteId", ownTrip, ownNote, tripNoteController.updateNote);    // role: user|admin + owner of the trip and of the note — { content }
router.delete("/:id/notes/:noteId", ownTrip, ownNote, tripNoteController.deleteNote); // role: user|admin + owner of the trip and of the note
router.post("/:id/ai-edit", ownTrip, tripPlanController.proposeAiEdit);         // role: user|admin + owner of the trip — { instruction }; AI proposal, NOTHING is saved
router.post("/:id/ai-edit/apply", ownTrip, tripPlanController.applyAiEdit);     // role: user|admin + owner of the trip — { proposalId }; saves the stored proposal the user accepted
router.delete("/:id/ai-edit/:proposalId", ownTrip, tripPlanController.discardAiEdit); // role: user|admin + owner of the trip — Reject: forgets the proposal
router.delete("/:id", ownTrip, tripPlanController.deleteTrip);           // role: user|admin + owner of the trip — soft delete
router.get("/location/:id", ownTrip, tripPlanController.getTripLocations); // role: user|admin + owner of the trip

export default router;
