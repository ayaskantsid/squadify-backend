import { Request, Response } from "express";
import { Trip } from "../models/trip.model";
import { Participant } from "../models/participant.model";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import { Expense } from "../models/expense.model";

export async function createTrip(req: Request, res: Response) {
  try {
    const { name, description, startDate, endDate } = req.body;
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const createdBy = req.currentUser._id as mongoose.Types.ObjectId;

    const trip = await Trip.create({
      name,
      description,
      startDate,
      endDate,
      createdBy,
    });

    // Add creator as admin participant with accepted status and email
    await Participant.create({
      userId: createdBy,
      tripId: trip._id,
      email: req.currentUser.email.toLowerCase(),
      role: "admin",
      status: "accepted",
      acceptedAt: new Date(),
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getTrips(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const user = req.currentUser;

    // Find all trips where user is an accepted participant
    const participantTrips = await Participant.find({
      userId: user._id,
      status: "accepted",
    }).populate("tripId");

    const trips = participantTrips
      .map((p) => p.tripId)
      .filter((trip) => trip !== null)
      .slice(skip, skip + limit);

    const totalCount = participantTrips.length;

    res.json({
      trips,
      totalCount,
      hasMore: skip + trips.length < totalCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
}

export async function getTripById(req: Request, res: Response) {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const user = req.currentUser;

    const participation = await Participant.findOne({
      userId: user._id,
      tripId: req.params.id,
      status: "accepted",
    });

    if (!participation) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const trip = await Trip.findById(req.params.id);
    if (trip) {
      const totalExpense = await Expense.aggregate([
        { $match: { tripId: new mongoose.Types.ObjectId(req.params.id) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const total = totalExpense[0]?.total || 0;
      const noOfExpenses = await Expense.countDocuments({ tripId: req.params.id });
      res.status(200).json({
        ...trip.toObject(),
        totalExpense: total,
        noOfExpenses,
      });
    } else {
      res.status(404).json({ message: "Trip not found" });
    }
  } catch (error) {
    console.error("Error fetching trip:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: (error as Error).message });
  }
}

export async function updateTrip(req: Request, res: Response) {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const user = req.currentUser;
    const tripId = req.params.id;

    // Check if user is admin and accepted
    const participation = await Participant.findOne({
      userId: user._id,
      tripId: tripId,
      role: "admin",
      status: "accepted",
    });

    if (!participation) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updatedTrip = req.body;
    const trip = await Trip.findByIdAndUpdate(tripId, updatedTrip, { new: true });

    if (trip) {
      res.status(200).json(trip);
    } else {
      res.status(404).json({ message: "Trip not found" });
    }
  } catch (error) {
    console.error("Error updating trip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteTrip(req: Request, res: Response) {
  try {
    if (!req.currentUser) return res.status(401).json({ message: "Unauthorized" });

    const user = req.currentUser;
    const tripId = req.params.id;

    const participation = await Participant.findOne({
      userId: user._id,
      tripId: tripId,
      role: "admin",
      status: "accepted",
    });

    if (!participation) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const trip = await Trip.findByIdAndDelete(tripId);
    if (trip) {
      // Clean up participant records
      await Participant.deleteMany({ tripId: tripId });
      res.status(200).json({ message: "Trip deleted successfully" });
    } else {
      res.status(404).json({ message: "Trip not found" });
    }
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
