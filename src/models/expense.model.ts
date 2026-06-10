import { Schema, model, Document, Types } from "mongoose";

export interface ISplit {
  _id: Types.ObjectId;
  participantId: Types.ObjectId;
  share: number;
}

export interface IExpense extends Document {
  _id: Types.ObjectId;
  tripId: Types.ObjectId;
  description?: string;
  amount: number;
  paidBy: Types.ObjectId;
  expenseDate: Date;
  splits: ISplit[];
  createdAt?: Date;
  updatedAt?: Date;
}

const splitSchema = new Schema<ISplit>(
  {
    participantId: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
    share: { type: Number, required: true }
  },
  { _id: false }
);

const expenseSchema = new Schema<IExpense>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
    expenseDate: { type: Date, required: true, default: Date.now },
    splits: { type: [splitSchema], default: [] }
  },
  { timestamps: true }
);

// Pre-save hook to validate splits
// ⚠️ MUST be registered before model() is called — Mongoose ignores hooks added after compilation.
expenseSchema.pre("save", function (next) {
  if (!this.splits || this.splits.length === 0) {
    return next(new Error("Expense must have at least one split."));
  }
  const totalSplit = this.splits.reduce((sum, s) => sum + s.share, 0);
  // Use epsilon comparison to avoid floating-point precision issues (e.g. 333.33 * 3 ≠ 1000 exactly)
  const diff = Math.abs(totalSplit - this.amount);
  if (diff > 0.01) {
    return next(new Error(`Total of splits (${totalSplit}) must equal total expense amount (${this.amount}).`));
  }
  next();
});

// Virtual field to determine split type
expenseSchema.virtual('splitType').get(function () {
  if (!this.splits || this.splits.length === 0) return 'unknown';
  const firstShare = this.splits[0].share;
  const isEqual = this.splits.every(split => split.share === firstShare);
  return isEqual ? 'equal' : 'custom';
});

// Ensure virtuals are included in JSON and Object output
expenseSchema.set('toJSON', { virtuals: true });
expenseSchema.set('toObject', { virtuals: true });

export const Expense = model<IExpense>("Expense", expenseSchema);
