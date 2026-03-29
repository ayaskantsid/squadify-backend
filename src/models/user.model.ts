import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
    _id: Types.ObjectId;
    firebaseUid: string;
    phoneNumber: string;
    displayName?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        phoneNumber: { type: String, required: true },
        displayName: { type: String, trim: true },
    },
    { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
