import { Router } from "express";
import { addExpense, deleteExpense, getExpenseById, getExpensesByTrip, updateExpense } from "../controllers/expense.controller";


const router = Router();

router.get("/trip/:tripId", getExpensesByTrip);
router.get("/:id", getExpenseById);
router.post("/", addExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

export default router;
