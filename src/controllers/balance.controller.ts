import { Request, Response } from "express";
import { calculateMinimalSettlements, calculateTripBalances } from "../services/balance.service";

export const getTripBalances = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const balances = await calculateTripBalances(tripId);
    res.status(200).json(balances);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTripSettlements = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const data = await calculateMinimalSettlements(tripId);
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};