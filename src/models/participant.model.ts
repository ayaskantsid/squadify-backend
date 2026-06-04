import { Schema, model, Document, Types} from 'mongoose';

export interface IParticipant extends Document {
    _id: Types.ObjectId;
    userId?: Types.ObjectId;
    email?: string;
    tripId: Types.ObjectId;
    invitationToken?: string;
    role: "admin" | "participant";
    status: "invited" | "accepted" | "declined";
    invitedAt: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const participantSchema = new Schema<IParticipant>({
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String, lowercase: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    invitationToken: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["admin", "participant"], default: "participant" },
    status: { type: String, enum: ["invited", "accepted", "declined"], default: "invited" },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    declinedAt: { type: Date }
}, {
    timestamps: true
});

// Sparse index for querying (no uniqueness constraint)
// Duplicate prevention is handled in the application code
participantSchema.index({ userId: 1, tripId: 1 }, { sparse: true });

export const Participant = model<IParticipant>('Participant', participantSchema);
