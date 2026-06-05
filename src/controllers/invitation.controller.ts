import { Request, Response } from "express";
import { Invitation } from "../models/invitation.model";
import { Trip } from "../models/trip.model";
import { User } from "../models/user.model";
import { Participant } from "../models/participant.model";
import mongoose from "mongoose";

// Create or reinvite (admin only)
export const createInvitation = async (req: Request, res: Response) => {
  try {
    const { tripId, email } = req.body;
    if (!tripId || !email) return res.status(400).json({ message: "tripId and email required" });

    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    // check trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // ensure current user is admin
    const adminParticipant = await Participant.findOne({
      tripId,
      userId: currentUser._id,
      role: "admin",
      status: "accepted",
    });
    if (!adminParticipant) return res.status(403).json({ message: "Only trip admin can invite participants" });

    const emailLower = (email as string).toLowerCase();

    // upsert invitation: if exists for trip+email -> set status invited and update timestamps
    let invitation = await Invitation.findOne({ tripId, email: emailLower });
    if (invitation) {
      invitation.status = "invited";
      invitation.invitedBy = currentUser._id;
      await invitation.save();
    } else {
      invitation = await Invitation.create({
        tripId,
        email: emailLower,
        invitedBy: currentUser._id,
        status: "invited",
      });
    }

    return res.status(201).json({ message: "Invitation created", invitation });
  } catch (err: any) {
    console.error("createInvitation error", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Invitation already exists" });
    }
    return res.status(500).json({ error: err.message || err });
  }
};

// Get pending invitations for current user by email
export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const email = req.currentUser.email?.toLowerCase();
    if (!email) return res.status(400).json({ message: "User has no email" });

    const invitations = await Invitation.find({ email, status: "invited" })
      .populate("tripId", "name")
      .populate("invitedBy", "displayName email")
      .lean();

    const response = invitations.map((inv) => ({
      invitationId: inv._id,
      tripId: inv.tripId?._id,
      tripName: inv.tripId?.name,
      invitedBy: inv.invitedBy,
      status: inv.status,
    }));

    return res.json(response);
  } catch (err: any) {
    console.error("getPendingInvitations error", err);
    return res.status(500).json({ error: err.message || err });
  }
};

// Accept invitation
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.body;
    if (!invitationId) return res.status(400).json({ message: "invitationId required" });
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.email !== (currentUser.email || "").toLowerCase()) return res.status(403).json({ message: "Invitation does not belong to this user" });
    if (invitation.status !== "invited") return res.status(400).json({ message: "Invitation not in invited state" });

    // mark accepted
    invitation.status = "accepted";
    await invitation.save();

    // create participant membership if not exists
    const existing = await Participant.findOne({ tripId: invitation.tripId, userId: currentUser._id });
    if (!existing) {
      await Participant.create({
        tripId: invitation.tripId as mongoose.Types.ObjectId,
        userId: currentUser._id,
        role: "participant",
        status: "accepted",
        acceptedAt: new Date(),
      });
    } else if (existing.status !== "accepted") {
      existing.status = "accepted";
      existing.acceptedAt = new Date();
      await existing.save();
    }

    return res.json({ message: "Invitation accepted" });
  } catch (err: any) {
    console.error("acceptInvitation error", err);
    return res.status(500).json({ error: err.message || err });
  }
};

// Reject invitation
export const rejectInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.body;
    if (!invitationId) return res.status(400).json({ message: "invitationId required" });
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.email !== (currentUser.email || "").toLowerCase()) return res.status(403).json({ message: "Invitation does not belong to this user" });

    invitation.status = "rejected";
    await invitation.save();

    return res.json({ message: "Invitation rejected" });
  } catch (err: any) {
    console.error("rejectInvitation error", err);
    return res.status(500).json({ error: err.message || err });
  }
};

export default {
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
  rejectInvitation,
};
