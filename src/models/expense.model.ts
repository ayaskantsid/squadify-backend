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

export const Expense = model<IExpense>("Expense", expenseSchema);

// Pre-save hook to validate splits
expenseSchema.pre("save", function (next) {
  const totalSplit = this.splits.reduce((sum, s) => sum + s.share, 0);
  if (totalSplit !== this.amount) {
    return next(new Error("Total of splits must equal total expense amount."));
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
