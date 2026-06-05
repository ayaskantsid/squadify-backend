import { Router } from "express";
import { createTrip, deleteTrip, getTripById, getTrips, updateTrip } from "../controllers/trip.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import resolveCurrentUser from "../middleware/user.middleware";
import { requireAcceptedParticipant, requireTripAdmin } from "../middleware/authorization.middleware";

const router = Router();

// All trip routes require authentication
router.use(authMiddleware);
router.use(resolveCurrentUser);

router.post("/", createTrip);
router.get("/", getTrips);
router.get("/:id", requireAcceptedParticipant, getTripById);
router.put("/:id", requireTripAdmin, updateTrip);
router.delete("/:id", requireTripAdmin, deleteTrip);

export default router;
