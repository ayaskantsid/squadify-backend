// token-based invites removed for MVP; invitations are stored in Invitation model
import { Request, Response } from "express";
import { Participant } from "../models/participant.model";
import { Trip } from "../models/trip.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import { sendInvitationAcceptedEmail } from "../services/mail.service";

// ✅ Invite a user to a trip (Admin only)
export const inviteParticipant = async (req: Request, res: Response) => {
  try {
    const { tripId, userEmail } = req.body;

    // Validate input
    if (!tripId || !userEmail) {
      return res.status(400).json({ message: "tripId and userEmail are required" });
    }

    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const currentUser = req.currentUser;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if current user is admin of this trip
    const adminParticipant = await Participant.findOne({
      userId: currentUser._id,
      tripId: tripId,
      role: "admin",
    });

    if (!adminParticipant) {
      return res
        .status(403)
        .json({ message: "Only trip admin can invite participants" });
    }

    // Find user by email (may or may not exist yet)
    const invitedUser = await User.findOne({ email: userEmail.toLowerCase() });

    const participantQuery: any = { tripId: tripId };
    if (invitedUser) {
      participantQuery.$or = [
        { userId: invitedUser._id },
        { email: invitedUser.email?.toLowerCase() },
      ];
    } else {
      participantQuery.email = userEmail.toLowerCase();
    }

    let participant = await Participant.findOne(participantQuery);

    const participantData: any = {
      tripId: tripId,
      role: "participant",
      status: "invited",
      invitedAt: new Date(),
      email: userEmail.toLowerCase(),
    };

    if (invitedUser) {
      participantData.userId = invitedUser._id;
    }

    if (participant) {
      if (participant.status === "accepted") {
        return res.status(400).json({ message: "User is already a participant" });
      }

      participant.status = "invited";
      participant.invitedAt = new Date();
      participant.acceptedAt = undefined;
      participant.declinedAt = undefined;
      participant.role = "participant";
      participant.email = userEmail.toLowerCase();
      if (invitedUser) {
        participant.userId = invitedUser._id;
      }

      await participant.save();
    } else {
      const participant = await Participant.create(participantData);

      res.status(201).json({
        message: "Invitation sent successfully",
        participant,
      });
    }
  } catch (err) {
    console.error("Error inviting participant:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Get all participants for a trip
export const getParticipantsByTrip = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const userParticipation = await Participant.findOne({
      userId: currentUser._id,
      tripId: tripId,
      status: "accepted",
    });

    if (!userParticipation) return res.status(403).json({ message: "Forbidden" });

    const participants = await Participant.find({ tripId: tripId }).populate(
      "userId",
      "displayName email phoneNumber"
    );

    if (participants.length === 0) {
      return res
        .status(404)
        .json({ message: "No participants found for this trip" });
    }

    res.status(200).json(participants);
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Get single participant
export const getParticipantById = async (req: Request, res: Response) => {
  try {
    const participant = await Participant.findById(req.params.id).populate(
      "userId",
      "displayName email phoneNumber"
    );
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }
    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Accept invitation
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Check if current user is the invited user
    if (!participant.userId || !participant.userId.equals(currentUser._id)) {
      return res
        .status(403)
        .json({ message: "You can only accept invitations for yourself" });
    }

    // Check if invitation is pending
    if (participant.status !== "invited") {
      return res
        .status(400)
        .json({ message: "Invitation is not in pending state" });
    }

    participant.status = "accepted";
    participant.acceptedAt = new Date();
    await participant.save();

    // Send acceptance notification email to trip creator
    try {
      const trip = await Trip.findById(participant.tripId);
      const tripCreator = await User.findById(trip?.createdBy);

      if (trip && tripCreator) {
        await sendInvitationAcceptedEmail({
          recipientEmail: tripCreator.email,
          recipientName: tripCreator.displayName || "Friend",
          acceptedByName: currentUser.displayName || "A participant",
          tripName: trip.name,
        });
      }
    } catch (emailError) {
      console.error("Failed to send acceptance notification email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    res.json({
      message: "Invitation accepted successfully",
      participant,
    });
  } catch (err) {
    console.error("Error accepting invitation:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Decline invitation
export const declineInvitation = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: "participantId is required" });
    }

    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const participant = await Participant.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Check if current user is the invited user
    if (!participant.userId || !participant.userId.equals(currentUser._id)) {
      return res
        .status(403)
        .json({ message: "You can only decline invitations for yourself" });
    }

    // Check if invitation is pending
    if (participant.status !== "invited") {
      return res
        .status(400)
        .json({ message: "Invitation is not in pending state" });
    }

    participant.status = "declined";
    participant.declinedAt = new Date();
    await participant.save();

    res.json({
      message: "Invitation declined successfully",
      participant,
    });
  } catch (err) {
    console.error("Error declining invitation:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Get pending invitations for current user
export const getPendingInvitations = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const pendingInvitations = await Participant.find({
      userId: currentUser._id,
      status: "invited",
    }).populate("tripId", "name description startDate endDate");

    res.json(pendingInvitations);
  } catch (err) {
    console.error("Error fetching pending invitations:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Remove participant from trip (Admin only)
export const removeParticipant = async (req: Request, res: Response) => {
  try {
    const { participantId } = req.params;

    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });
    const currentUser = req.currentUser;

    const participant = await Participant.findById(participantId);
    if (!participant) return res.status(404).json({ message: "Participant not found" });

    const adminParticipant = await Participant.findOne({
      userId: currentUser._id,
      tripId: participant.tripId,
      role: "admin",
      status: "accepted",
    });

    if (!adminParticipant) return res.status(403).json({ message: "Forbidden" });

    await Participant.findByIdAndDelete(participantId);
    res.json({ message: "Participant removed successfully" });
  } catch (err) {
    console.error("Error removing participant:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};
