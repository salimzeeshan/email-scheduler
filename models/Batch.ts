import mongoose, { Schema, models, model } from "mongoose";

export type BatchStatus = "scheduled" | "sending" | "completed" | "failed" | "cancelled";
export type BatchType = "instant" | "scheduled" | "retry";

const LogSchema = new Schema(
  {
    email: { type: String, required: true },
    status: { type: String, enum: ["sent", "failed", "skipped"], required: true },
    timestamp: { type: Date, default: Date.now },
    error: String,
  },
  { _id: false },
);

const BatchSchema = new Schema(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    fromName: String,
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, required: true },
    attachmentName: String,
    attachmentPath: String,
    attachmentContent: Buffer,
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    intervalSeconds: { type: Number, default: 10 },
    status: {
      type: String,
      enum: ["scheduled", "sending", "completed", "failed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    scheduledTime: Date,
    completedAt: Date,
    parentBatchId: String,
    type: { type: String, enum: ["instant", "scheduled", "retry"], default: "instant" },
    recipients: [{ type: String }],
    logs: [LogSchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Batch = models.Batch || model("Batch", BatchSchema);
export type BatchDocument = mongoose.InferSchemaType<typeof BatchSchema>;
