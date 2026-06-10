import { Expense } from "../models/expense.model";
import { Participant } from "../models/participant.model";
import { Trip } from "../models/trip.model";

/**
 * Calculate the net balances for a given trip.
 * Positive balance  → participant is owed money (they paid more than their share).
 * Negative balance  → participant owes money (they consumed more than they paid).
 */
export const calculateTripBalances = async (tripId: string) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw new Error("Trip not found");

  const participants = await Participant.find({ tripId }).populate("userId", "displayName email");
  const expenses = await Expense.find({ tripId });

  // Initialize balance map (key: participantId string, value: net balance)
  const balanceMap: Record<string, number> = {};
  participants.forEach((p) => {
    balanceMap[p._id.toString()] = 0;
  });

  // Iterate over all expenses and adjust balances
  expenses.forEach((exp) => {
    const paidBy = exp.paidBy.toString();
    const totalAmount = exp.amount;

    // Guard: warn if splits are missing or don't sum correctly (should not happen after model fix)
    if (!exp.splits || exp.splits.length === 0) {
      console.warn(`[balance] Expense ${exp._id} has no splits — skipping. Check data integrity.`);
      return;
    }

    const splitTotal = exp.splits.reduce((sum, s) => sum + s.share, 0);
    if (Math.abs(splitTotal - totalAmount) > 0.01) {
      console.warn(
        `[balance] Expense ${exp._id} splits (${splitTotal}) don't match amount (${totalAmount}) — skipping.`
      );
      return;
    }

    // Payer gets credited the full amount
    if (balanceMap[paidBy] !== undefined) {
      balanceMap[paidBy] += totalAmount;
    }

    // Each participant is debited their share
    exp.splits.forEach((split) => {
      const pid = split.participantId.toString();
      if (balanceMap[pid] !== undefined) {
        balanceMap[pid] -= split.share;
      }
    });
  });

  // Build readable balance array
  const result = participants.map((p) => {
    const user = p.userId as any;
    return {
      participantId: p._id.toString(),
      name: user?.displayName || user?.email || "Unknown",
      balance: Math.round(balanceMap[p._id.toString()] * 100) / 100,
    };
  });

  return result;
};

/**
 * Compute minimal transactions to settle all balances.
 * Uses a greedy two-pointer algorithm on sorted debtors and creditors.
 * Also returns per-participant expenditure stats (totalSpent, paymentCount).
 */
export const calculateMinimalSettlements = async (tripId: string) => {
  // Load participants and expenses once — reused for both balance and stats
  const participants = await Participant.find({ tripId }).populate("userId", "displayName email");
  const expenses = await Expense.find({ tripId });

  const balances = await calculateTripBalances(tripId);

  // Deep-copy for the "before" snapshot — the originals will be mutated during settlement
  const balanceBeforeSettlement = balances.map((b) => ({ ...b }));

  // ── Participant expenditure stats ──────────────────────────────────────────
  // totalSpent   = sum of expense amounts where this participant is the payer
  // paymentCount = number of expenses they paid for
  const spentMap: Record<string, { totalSpent: number; paymentCount: number }> = {};
  participants.forEach((p) => {
    spentMap[p._id.toString()] = { totalSpent: 0, paymentCount: 0 };
  });

  expenses.forEach((exp) => {
    const paidBy = exp.paidBy.toString();
    if (spentMap[paidBy] !== undefined) {
      spentMap[paidBy].totalSpent += exp.amount;
      spentMap[paidBy].paymentCount += 1;
    }
  });

  const participantStats = participants.map((p) => {
    const user = p.userId as any;
    const stats = spentMap[p._id.toString()];
    return {
      participantId: p._id.toString(),
      name: user?.displayName || user?.email || "Unknown",
      totalSpent: Math.round(stats.totalSpent * 100) / 100,
      paymentCount: stats.paymentCount,
    };
  });
  // ──────────────────────────────────────────────────────────────────────────

  // Separate into debtors (owe money) and creditors (are owed money)
  // Deep-copy each entry so mutations don't affect the original balances array
  const debtors = balances
    .filter((b) => b.balance < -0.001)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance); // most negative first

  const creditors = balances
    .filter((b) => b.balance > 0.001)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance); // highest first

  const settlements: { from: string; fromId: string; to: string; toId: string; amount: number }[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(-debtor.balance, creditor.balance);

    if (amount > 0.001) {
      settlements.push({
        from: debtor.name,
        fromId: debtor.participantId,
        to: creditor.name,
        toId: creditor.participantId,
        amount: Math.round(amount * 100) / 100,
      });

      debtor.balance += amount;
      creditor.balance -= amount;
    }

    // Advance pointers once a balance is effectively zero
    const debtorSettled = Math.abs(debtor.balance) < 0.001;
    const creditorSettled = Math.abs(creditor.balance) < 0.001;

    if (debtorSettled) i++;
    if (creditorSettled) j++;

    // Safety: if neither settled (amount was ~0 somehow), advance both to avoid infinite loop
    if (!debtorSettled && !creditorSettled) {
      i++;
      j++;
    }
  }

  return { balanceBeforeSettlement, participantStats, settlements };
};
