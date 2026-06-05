import { Request, Response, NextFunction } from "express";
import { Participant } from "../models/participant.model";
import { Participant as ParticipantModel } from "../models/participant.model";
import { Expense } from "../models/expense.model";

async function resolveTripIdFromRequest(req: Request): Promise<string | null> {
  // Look for common places where tripId may appear
  const maybeTripId = (req.params && (req.params.tripId || req.params.id || req.params.participantId)) || req.body?.tripId;

  if (maybeTripId) return maybeTripId as string;

  // if expense id provided in params.id or req.params.id, fetch expense to get tripId
  const expenseId = req.params?.id || req.params?.expenseId || req.body?.expenseId;
  if (expenseId) {
    const expense = await Expense.findById(expenseId).lean();
    return expense?.tripId?.toString() || null;
  }

  // if participantId provided, fetch participant
  const participantId = req.params?.participantId || req.body?.participantId;
  if (participantId) {
    const participant = await ParticipantModel.findById(participantId).lean();
    return participant?.tripId?.toString() || null;
  }

  return null;
}

export async function requireTripMembership(tripId: string, userId: any) {
  const participant = await Participant.findOne({ tripId, userId, status: "accepted" }).lean();
  return participant;
}

export async function requireAcceptedParticipant(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const tripId = await resolveTripIdFromRequest(req);
    if (!tripId) return res.status(400).json({ message: "tripId not provided" });

    const participant = await Participant.findOne({ tripId, userId: req.currentUser._id, status: "accepted" });
    if (!participant) return res.status(403).json({ message: "Forbidden" });

    // attach participant to request for downstream use
    (req as any).participant = participant;
    next();
  } catch (err) {
    console.error("requireAcceptedParticipant error", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function requireTripAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const tripId = await resolveTripIdFromRequest(req);
    if (!tripId) return res.status(400).json({ message: "tripId not provided" });

    const participant = await Participant.findOne({ tripId, userId: req.currentUser._id, role: "admin", status: "accepted" });
    if (!participant) return res.status(403).json({ message: "Admin privileges required" });

    (req as any).participant = participant;
    next();
  } catch (err) {
    console.error("requireTripAdmin error", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default {
  requireTripMembership,
  requireAcceptedParticipant,
  requireTripAdmin,
};
