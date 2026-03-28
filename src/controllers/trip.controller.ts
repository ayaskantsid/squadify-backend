import { Request, Response } from "express";
import { Trip } from "../models/trip.model";
import mongoose from "mongoose";
import { Expense } from "../models/expense.model";

export async function createTrip(req: Request, res: Response) {
  try {
    const { name, description, startDate, endDate } = req.body;

    const trip = await Trip.create({
      name,
      description,
      startDate,
      endDate,
      participants: [],
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

    const [trips, totalCount] = await Promise.all([
      Trip.find().skip(skip).limit(limit),
      Trip.countDocuments()
    ]);

    res.json({
      trips,
      totalCount,
      hasMore: skip + trips.length < totalCount
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || err });
  }
}

export async function getTripById(req: Request, res: Response) {
  try {
    const trip = await Trip.findById(req.params.id).populate('participants');
    if(trip) {
      const totalExpense = await Expense.aggregate([
        { $match: { tripId: new mongoose.Types.ObjectId(req.params.id) } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const total = totalExpense[0]?.total || 0;
      const noOfExpenses = await Expense.countDocuments({ tripId: req.params.id });
      res.status(200).json({
        ...trip.toObject(),
        totalExpense: total,
        noOfExpenses
      });
    } else {
      res.status(404).json({ message: "Trip not found" });
    }
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ message: "Internal server error", error: (error as Error).message });
  }
}

export async function updateTrip(req: Request, res: Response) {
  try {
    const tripId = req.params.id;
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
    const tripId = req.params.id;

    const trip = await Trip.findByIdAndDelete(tripId);
    if (trip) {
      res.status(200).json({ message: "Trip deleted successfully" });
    } else {
      res.status(404).json({ message: "Trip not found" });
    }
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
