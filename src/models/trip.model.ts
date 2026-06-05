import { Schema, model, Document, Types } from "mongoose";

export interface ITrip extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const tripSchema = new Schema<ITrip>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Trip = model<ITrip>("Trip", tripSchema);
