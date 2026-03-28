import { Router} from "express";
import { createParticipant, getParticipantsByTrip, getParticipantById, updateParticipant, deleteParticipant } from "../controllers/participant.controller";

const router = Router();

router.get("/trip/:tripId", getParticipantsByTrip);
router.get("/:id", getParticipantById);
router.post("/", createParticipant);
router.put("/:id", updateParticipant);
router.delete("/:id", deleteParticipant);

export default router;
