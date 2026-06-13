import { Router } from "express";
import { addExpense, deleteExpense, getExpenseById, getExpensesByTrip, updateExpense, scanReceipt, getScanReceiptQuota } from "../controllers/expense.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import resolveCurrentUser from "../middleware/user.middleware";
import { requireAcceptedParticipant } from "../middleware/authorization.middleware";
import { uploadReceiptMiddleware } from "../middleware/upload.middleware";
import { scanRateLimit } from "../middleware/scan-rate-limit.middleware";

const router = Router();

router.use(authMiddleware);
router.use(resolveCurrentUser);

// ⚠️ Must be registered before /:id to avoid route conflict
// Lightweight quota check — does NOT consume a scan
router.get("/scan-receipt/quota", getScanReceiptQuota);
// Pipeline: upload file → check rate limits → scan with Gemini
router.post("/scan-receipt", uploadReceiptMiddleware, scanRateLimit, scanReceipt);

router.get("/trip/:tripId", requireAcceptedParticipant, getExpensesByTrip);
router.get("/:id", requireAcceptedParticipant, getExpenseById);
router.post("/", requireAcceptedParticipant, addExpense);
router.put("/:id", requireAcceptedParticipant, updateExpense);
router.delete("/:id", requireAcceptedParticipant, deleteExpense);

export default router;
