import express from "express";
import { getTripBalances, getTripSettlements } from "../controllers/balance.controller";

const router = express.Router();

router.get("/:tripId", getTripBalances); // basic balances
router.get("/:tripId/settlements", getTripSettlements); // minimal settlements

export default router;
