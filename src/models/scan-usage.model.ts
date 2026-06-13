import { Schema, model, Document, Types } from "mongoose";

export interface IScanUsage extends Document {
  _id: Types.ObjectId;
  /** "global" for the app-wide counter, or a User ObjectId string for per-user */
  scopeId: string;
  /** Date string in YYYY-MM-DD (Pacific Time) — partition key matching Gemini's daily reset */
  dateKey: string;
  /** Number of scans consumed today */
  count: number;
  /** Timestamp of the most recent scan (drives TTL cleanup) */
  lastScanAt: Date;
}

const scanUsageSchema = new Schema<IScanUsage>(
  {
    scopeId:    { type: String, required: true },
    dateKey:    { type: String, required: true },
    count:      { type: Number, required: true, default: 0 },
    lastScanAt: { type: Date,   required: true, default: Date.now },
  },
  { timestamps: true }
);

// Fast lookups for "how many scans has <scope> done on <date>?"
scanUsageSchema.index({ scopeId: 1, dateKey: 1 }, { unique: true });

// Auto-delete documents older than 30 days — keeps the collection small
scanUsageSchema.index({ lastScanAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ScanUsage = model<IScanUsage>("ScanUsage", scanUsageSchema);
