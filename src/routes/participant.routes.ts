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
import { createInvitation } from "../controllers/invitation.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import resolveCurrentUser from "../middleware/user.middleware";
import { requireAcceptedParticipant, requireTripAdmin } from "../middleware/authorization.middleware";
import invitationRoutes from "./invitation.routes";

const router = Router();

// All participant routes require authentication
router.use(authMiddleware);
router.use(resolveCurrentUser);

// expose invitation endpoints under /api/participants/invitations
router.use("/invitations", invitationRoutes);

// Invite user to trip (admin only) — use invitation workflow
router.post("/invite", requireTripAdmin, createInvitation);

// Get all participants for a trip
router.get("/trip/:tripId", requireAcceptedParticipant, getParticipantsByTrip);

// Get single participant
router.get("/:id", getParticipantById);


// Remove participant from trip (admin only)
router.delete("/:participantId", requireTripAdmin, removeParticipant);

export default router;
