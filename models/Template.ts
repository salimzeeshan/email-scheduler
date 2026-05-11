import { Schema, models, model } from "mongoose";

const TemplateSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    fromName: String,
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, required: true },
  },
  { timestamps: true },
);

export const Template = models.Template || model("Template", TemplateSchema);
