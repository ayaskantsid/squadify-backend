import { Request, Response } from "express";
import { Expense } from "../models/expense.model";
import { Trip } from "../models/trip.model";
import { Participant } from "../models/participant.model";
import { scanReceiptWithAI } from "../services/ai.service";

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
      .populate({
        path: "paidBy",
        populate: {
          path: "userId",
          select: "displayName email"
        }
      })
      .populate("splits.participantId", "name")
      .lean()
      .exec();

    if(expenses.length === 0) {
      return res.status(404).json({ message: "No expenses found for this trip" });
    }

    const response = expenses.map((expense) => {
      const paidBy = expense.paidBy as any;
      const user = paidBy?.userId as any;
      return {
        ...expense,
        paidBy: {
          _id: paidBy?._id,
          displayName: user?.displayName || null,
          email: user?.email || null,
        },
      };
    });

    return res.status(200).json(response);
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
      .populate({
        path: "paidBy",
        populate: {
          path: "userId",
          select: "displayName email"
        }
      })
      .populate("splits.participantId", "name");

    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    const expenseData = expense.toObject();
    const paidBy = expenseData.paidBy as any;
    const user = paidBy?.userId as any;
    expenseData.paidBy = {
      _id: paidBy?._id,
      displayName: user?.displayName || null,
      email: user?.email || null,
    } as any;

    res.status(200).json({
      message: "Expense details fetched successfully.",
      data: expenseData,
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
 *
 * Uses findById + expense.save() instead of findByIdAndUpdate so that:
 *  1. The pre('save') validation hook actually runs.
 *  2. Splits are recalculated whenever the amount changes or no splits are sent.
 *  3. Custom splits are validated against the (new) amount before saving.
 */
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, amount, paidBy, splits, expenseDate } = req.body;

    // 1️⃣ Fetch the existing document so we can mutate and re-save
    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // 2️⃣ Apply scalar field updates only when explicitly provided
    if (description !== undefined) expense.description = description;
    if (paidBy !== undefined) expense.paidBy = paidBy;
    if (expenseDate !== undefined) {
      const parsed = new Date(expenseDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid expenseDate format." });
      }
      expense.expenseDate = parsed;
    }

    // 3️⃣ Determine the effective amount (new or existing)
    const effectiveAmount = amount !== undefined ? Number(amount) : expense.amount;
    if (amount !== undefined) expense.amount = effectiveAmount;

    // 4️⃣ Recalculate / validate splits
    if (!splits || splits.length === 0) {
      // No splits sent → regenerate equal split across all trip participants
      const participants = await Participant.find({ tripId: expense.tripId });
      if (!participants || participants.length === 0) {
        return res.status(400).json({ error: "No participants found for this trip." });
      }
      const equalShare = Number((effectiveAmount / participants.length).toFixed(2));
      expense.splits = participants.map((p) => ({
        participantId: p._id,
        share: equalShare,
      })) as any;
    } else {
      // Custom splits sent → validate they sum to the effective amount
      const totalShare = splits.reduce((sum: number, s: any) => sum + Number(s.share), 0);
      if (Math.abs(totalShare - effectiveAmount) > 0.01) {
        return res.status(400).json({
          error: `Total of custom splits (${totalShare}) does not match expense amount (${effectiveAmount}).`,
        });
      }
      expense.splits = splits;
    }

    // 5️⃣ Save — triggers pre('save') hook for final validation
    await expense.save();

    // 6️⃣ Re-fetch with populated fields for the response
    const populated = await Expense.findById(id)
      .populate("paidBy", "name")
      .populate("splits.participantId", "name")
      .exec();

    res.status(200).json({ message: "Expense updated successfully", expense: populated });
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

/**
 * @route   POST /api/expenses/scan-receipt
 * @desc    Upload a receipt image and extract expense data using Gemini Vision.
 *          Does NOT create an expense — returns prefill data for the frontend.
 * @body    multipart/form-data: receipt (image file, max 10 MB)
 */
export const scanReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    // upload.middleware guarantees req.file is present by this point
    const file = req.file!;
    console.log(`[scanReceipt] Received file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);

    const extracted = await scanReceiptWithAI(file.buffer, file.mimetype);

    if (!extracted) {
      console.warn("[scanReceipt] Gemini returned an unparseable response");
      res.status(422).json({ success: false, message: "Unable to scan receipt" });
      return;
    }

    console.log("[scanReceipt] Extracted data:", extracted);

    res.status(200).json({
      success: true,
      description: extracted.description,
      amount: extracted.amount,
      date: extracted.date,
    });
  } catch (err: any) {
    console.error("[scanReceipt] Error scanning receipt:", err.message ?? err);
    res.status(500).json({ success: false, message: "Unable to scan receipt" });
  }
};
