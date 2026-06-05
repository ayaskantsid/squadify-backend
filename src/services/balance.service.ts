import { Expense } from "../models/expense.model";
import { Participant } from "../models/participant.model";
import { Trip } from "../models/trip.model";

/**
 * Calculate the net balances for a given trip.
 * Each participant will have a final balance showing how much they owe or are owed.
 */
export const calculateTripBalances = async (tripId: string) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const participants = await Participant.find({ tripId: tripId }).populate("userId", "displayName email");
  const expenses = await Expense.find({ tripId: tripId });

  // Initialize balance map (key: participantId, value: number)
  const balances: Record<string, number> = {};
  participants.forEach(p => {
    balances[p._id.toString()] = 0;
  });

  // Iterate over all expenses and adjust balances
  expenses.forEach(exp => {
    const paidBy = exp.paidBy.toString();
    const totalAmount = exp.amount;

    // The payer initially pays everything
    balances[paidBy] += totalAmount;

    // Each participant owes their share
    exp.splits.forEach(split => {
      balances[split.participantId.toString()] -= split.share;
    });
  });

  // Prepare readable balance objects
  const result = participants.map((p) => {
    const user = p.userId as any;
    return {
      participantId: p._id.toString(),
      name: user?.displayName || user?.email || "Unknown",
      balance: Math.round(balances[p._id.toString()] * 100) / 100, // round to 2 decimals
    };
  });

  return result;
};

/**
 * Compute minimal transactions to settle all balances.
 * Greedy algorithm based on sorting debtors and creditors.
 */
export const calculateMinimalSettlements = async (tripId: string) => {
  const balances = await calculateTripBalances(tripId);
  const balanceBeforeSettlement = balances.map(b => ({ ...b })); // backup of original balances

  const debtors = balances.filter((b) => b.balance < 0).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance);

  const settlements: {
    from: string;
    to: string;
    amount: number;
  }[] = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.balance, creditor.balance);

    if (amount > 0) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });

      // Update balances
      debtor.balance += amount;
      creditor.balance -= amount;
    }

    // Move pointers when a balance is settled
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return { balanceBeforeSettlement, balances, settlements };
};
