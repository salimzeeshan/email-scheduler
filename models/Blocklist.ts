import { Schema, models, model } from "mongoose";

const BlocklistSchema = new Schema({
  email: { type: String, required: true, unique: true, index: true },
  addedAt: { type: Date, default: Date.now },
});

export const Blocklist = models.Blocklist || model("Blocklist", BlocklistSchema);
