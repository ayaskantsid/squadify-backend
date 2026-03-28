import { Schema, model, Document, Types} from 'mongoose';

export interface IParticipant extends Document {
    _id: Types.ObjectId;
    name: string;
    email?: string;
    phone?: string;
    tripId?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const participantSchema = new Schema<IParticipant>({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: false, lowercase: true },
    phone: { type: String, trim: true },
    tripId: [{ type: Schema.Types.ObjectId, ref: "Trip", required: true }]
}, {
    timestamps: true
})

export const Participant = model<IParticipant>('Participant', participantSchema);
