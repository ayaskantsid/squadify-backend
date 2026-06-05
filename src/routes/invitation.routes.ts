import { Router } from "express";
import {
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
} from "../controllers/invitation.controller";
import resolveCurrentUser from "../middleware/user.middleware";

const router = Router();

// authMiddleware is applied globally in server.ts for /api
router.use(resolveCurrentUser);

router.post("/", createInvitation); // admin invites by email
router.get("/pending", getPendingInvitations); // current user's pending invites
router.patch("/accept", acceptInvitation);
router.patch("/reject", rejectInvitation);

export default router;
