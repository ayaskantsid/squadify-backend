import { Router } from "express";
import { addExpense, deleteExpense, getExpenseById, getExpensesByTrip, updateExpense } from "../controllers/expense.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import resolveCurrentUser from "../middleware/user.middleware";
import { requireAcceptedParticipant } from "../middleware/authorization.middleware";

const router = Router();

router.use(authMiddleware);
router.use(resolveCurrentUser);

router.get("/trip/:tripId", requireAcceptedParticipant, getExpensesByTrip);
router.get("/:id", requireAcceptedParticipant, getExpenseById);
router.post("/", requireAcceptedParticipant, addExpense);
router.put("/:id", requireAcceptedParticipant, updateExpense);
router.delete("/:id", requireAcceptedParticipant, deleteExpense);

export default router;
