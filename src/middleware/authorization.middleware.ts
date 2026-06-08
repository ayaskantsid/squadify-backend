import { Request, Response, NextFunction } from "express";
import { Participant } from "../models/participant.model";
import { Participant as ParticipantModel } from "../models/participant.model";
import { Expense } from "../models/expense.model";

async function resolveTripIdFromRequest(req: Request): Promise<string | null> {
  // If the route explicitly provides tripId, use it.
  if (req.params?.tripId) {
    return req.params.tripId as string;
  }

  // For trip routes, params.id is the tripId.
  if (req.baseUrl?.includes("/api/trips") && req.params?.id) {
    return req.params.id as string;
  }

  // For expense routes, params.id is an expenseId, so resolve to tripId.
  if (req.baseUrl?.includes("/api/expenses") && req.params?.id) {
    const expense = await Expense.findById(req.params.id).lean();
    return expense?.tripId?.toString() || null;
  }

  // If body contains tripId, use it.
  if (req.body?.tripId) {
    return req.body.tripId as string;
  }

  // If participantId provided, fetch participant to get tripId.
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
