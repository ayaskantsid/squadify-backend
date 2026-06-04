import { Router } from "express";
import {
  inviteParticipant,
  getParticipantsByTrip,
  getParticipantById,
  acceptInvitation,
  declineInvitation,
  getPendingInvitations,
  removeParticipant,
} from "../controllers/participant.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import resolveCurrentUser from "../middleware/user.middleware";
import { requireAcceptedParticipant, requireTripAdmin } from "../middleware/authorization.middleware";

const router = Router();

// All participant routes require authentication
router.use(authMiddleware);
router.use(resolveCurrentUser);

// Invite user to trip (admin only)
router.post("/invite", requireTripAdmin, inviteParticipant);

// Get all participants for a trip
router.get("/trip/:tripId", requireAcceptedParticipant, getParticipantsByTrip);

// Get pending invitations for current user (must come BEFORE /:id route)
router.get("/invitations/pending", getPendingInvitations);

// Get single participant
router.get("/:id", getParticipantById);

// Accept invitation
router.patch("/accept", acceptInvitation);

// Decline invitation
router.patch("/decline", declineInvitation);

// Remove participant from trip (admin only)
router.delete("/:participantId", requireTripAdmin, removeParticipant);

export default router;
