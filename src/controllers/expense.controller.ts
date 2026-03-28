import { Request, Response } from "express";
import { Expense } from "../models/expense.model";
import { Trip } from "../models/trip.model";
import { Participant } from "../models/participant.model";

/**
 * @route   GET /api/expenses/:tripId
 * @desc    Get all expenses for a given trip
 */
export const getExpensesByTrip = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    if (!tripId) {
      return res.status(400).json({ error: "Trip ID is required." });
    }

    const expenses = await Expense.find({ tripId: tripId })
      .populate("paidBy", "name")
      .populate("splits.participantId", "name")
      .exec();

    if(expenses.length === 0) {
      return res.status(404).json({ message: "No expenses found for this trip" });
    } else {
        return res.status(200).json(expenses);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 💡 Get details of a single expense by ID
 */
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Expense ID is required." });
    }

    const expense = await Expense.findById(id)
      .populate("paidBy", "name")
      .populate("splits.participantId", "name");

    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.status(200).json({
      message: "Expense details fetched successfully.",
      data: expense,
    });
  } catch (err: any) {
    console.error("Error fetching expense:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

/**
 * @route   POST /api/expenses
 * @desc    Add a new expense
 * @body    { tripId, paidBy, description, amount, splits }
 */
export const addExpense = async (req: Request, res: Response) => {
  try {
    const { tripId, paidBy, description, amount, splits, expenseDate } = req.body;

    if (!tripId || !paidBy || !amount || !expenseDate) {
      return res.status(400).json({ error: "tripId, paidBy, amount, and expenseDate are required." });
    }

    const formattedExpenseDate = expenseDate ? new Date(expenseDate) : new Date();
    if (isNaN(formattedExpenseDate.getTime())) {
        return res.status(400).json({ error: "Invalid expenseDate format." });
    }

    let finalSplits = splits;

    // 🟡 If no splits provided → perform equal split among all participants
    if (!splits || splits.length === 0) {
      const participants = await Participant.find({ tripId: tripId });
      if (!participants || participants.length === 0) {
        return res.status(400).json({ error: "No participants found for this trip." });
      }

      const equalShare = Number((amount / participants.length).toFixed(2));

      finalSplits = participants.map((p) => ({
        participantId: p._id,
        share: equalShare,
      }));
    } else {
      // 🟢 If custom splits provided → validate total sum
      const totalShare = splits.reduce((sum: number, s: any) => sum + Number(s.share), 0);
      if (Number(totalShare.toFixed(2)) !== Number(amount.toFixed(2))) {
        return res.status(400).json({
          error: `Total of custom splits (${totalShare}) does not match expense amount (${amount}).`,
        });
      }
    }

    // ✅ Create the expense
    const expense = await Expense.create({
      tripId,
      paidBy,
      description,
      amount,
      splits: finalSplits,
      expenseDate: formattedExpenseDate,
    });

    if (expense) {
        res.status(201).json({
          message: "Expense added successfully.",
          data: expense,
        });
    } else {
        res.status(500).json({ message: "Failed to add expense." });
    }

  } catch (err: any) {
    console.error("Error adding expense:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update an existing expense
 */
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const expense = await Expense.findByIdAndUpdate(id, updates, { new: true })
      .populate("paidBy", "name")
      .populate("splits.participantId", "name")
      .exec();

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.status(200).json({ message: "Expense updated successfully", expense });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete an expense
 */
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
