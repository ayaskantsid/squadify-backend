import { Request, Response } from "express";
import { Participant } from "../models/participant.model";
import { Trip } from "../models/trip.model";
import mongoose from "mongoose";

// ✅ Create a new participant and link to trip
export const createParticipant = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ message: "Trip ID is required" });
    }

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Create participant
    const participant = await Participant.create({ name, phone, email, tripId });

    // Add participant to trip (if not already added)
    if (!trip.participants.includes(participant._id as mongoose.Types.ObjectId)) {
      trip.participants.push(participant._id as mongoose.Types.ObjectId);
      await trip.save();
    }

    res.status(201).json({
      message: "Participant created successfully",
      participant,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Get all participants for a trip
export const getParticipantsByTrip = async (req: Request, res: Response) => {
  try {
    
    const { tripId } = req.params;

    const participants = await Participant.find({ tripId: tripId });
    if(participants.length === 0) {
      return res.status(404).json({ message: "No participants found for this trip" });
    } else {
        return res.status(200).json(participants);
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Get single participant
export const getParticipantById = async (req: Request, res: Response) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }
    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Update participant details
export const updateParticipant = async (req: Request, res: Response) => {
  try {
    const participant = await Participant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }
    res.json(participant);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

// ✅ Delete participant and remove from trip
export const deleteParticipant = async (req: Request, res: Response) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) {
      return res.status(404).json({ message: "Participant not found" });
    }

    // Remove participant from trip
    await Trip.findByIdAndUpdate(participant.tripId, {
      $pull: { participants: participant._id },
    });

    await participant.deleteOne();
    res.json({ message: "Participant deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
