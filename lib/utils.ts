import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const teamWords = new Set([
  "careers",
  "hr",
  "hiring",
  "jobs",
  "recruit",
  "talent",
  "info",
  "hello",
  "contact",
  "team",
  "support",
  "admin",
  "noreply",
  "no-reply",
]);

export function greetingName(email: string) {
  const local = normalizeEmail(email).split("@")[0] || "";
  const [first = ""] = local.split(/[._\-\d]+/).filter(Boolean);
  if (!first || teamWords.has(first)) return "Team";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hasMeaningfulHtml(html: string) {
  return htmlToText(html).length > 0;
}

export function renderPersonalizedBody(bodyHtml: string, email: string) {
  return `<p>Hey ${greetingName(email)},</p>${bodyHtml}`;
}

export function parseRecipients(input: string) {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  input
    .split(/\r?\n|,|;/)
    .map(normalizeEmail)
    .filter(Boolean)
    .forEach((email) => {
      if (!isValidEmail(email)) {
        invalid.push(email);
        return;
      }
      if (!seen.has(email)) {
        seen.add(email);
        valid.push(email);
      }
    });

  return { valid, invalid };
}

export function formatDateTime(date?: Date | string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function parseScheduleDate(value: string) {
  const trimmed = value.trim();
  const isoDate = new Date(trimmed);
  if (trimmed && !Number.isNaN(isoDate.getTime())) return isoDate;

  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, meridiem] = match;
  let hour = Number(hh);
  if (hour < 1 || hour > 12) return null;
  if (meridiem.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (meridiem.toUpperCase() === "AM" && hour === 12) hour = 0;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(min));
}
