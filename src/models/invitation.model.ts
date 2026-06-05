import { Schema, model, Document, Types } from "mongoose";

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  tripId: Types.ObjectId;
  email: string;
  invitedBy: Types.ObjectId;
  status: "invited" | "accepted" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["invited", "accepted", "rejected"], default: "invited" },
  },
  { timestamps: true }
);

invitationSchema.index({ tripId: 1, email: 1 }, { unique: true });

export const Invitation = model<IInvitation>("Invitation", invitationSchema);
