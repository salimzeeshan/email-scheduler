import { Schema, models, model } from "mongoose";

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: String, required: true },
});

export const Setting = models.Setting || model("Setting", SettingSchema);
