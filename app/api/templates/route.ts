import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { htmlToText } from "@/lib/utils";
import { Template } from "@/models/Template";

export async function GET() {
  await connectDb();
  const templates = await Template.find().sort({ updatedAt: -1 }).lean();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  await connectDb();
  const body = await request.json();
  const template = await Template.findOneAndUpdate(
    { name: body.name },
    {
      name: body.name,
      subject: body.subject,
      fromName: body.fromName,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText || htmlToText(body.bodyHtml || ""),
    },
    { upsert: true, new: true },
  );
  return NextResponse.json(template);
}

export async function DELETE(request: Request) {
  await connectDb();
  const { id } = await request.json();
  await Template.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
