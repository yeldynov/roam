// What a host team may change on its own stays. Pure: the API route enforces it, the edit screen shows its messages.
// Rules mirror studio/schemaTypes/property.ts; houseRules limits are a server guard the schema doesn't have.
import { AMENITIES } from "./search";

export type StayPatch = {
  nightlyPrice?: number;
  maxGuests?: number;
  petsAllowed?: boolean;
  amenities?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  houseRules?: string[];
};

export type EditableField = keyof StayPatch;
export const EDITABLE_FIELDS: EditableField[] = ["nightlyPrice", "maxGuests", "petsAllowed", "amenities", "checkInTime", "checkOutTime", "houseRules"];

/** Per-field messages; `body` is for problems with the request as a whole */
export type PatchErrors = Partial<Record<EditableField | "body", string>>;

export const MAX_HOUSE_RULES = 20;
export const MAX_RULE_LENGTH = 200;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const isInt = (v: unknown, min: number, max = Infinity): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

const CHECKS: { [K in EditableField]-?: (v: unknown) => string | null } = {
  nightlyPrice: (v) => (isInt(v, 1) ? null : "Enter a whole dollar price of at least $1."),
  maxGuests: (v) => (isInt(v, 1, 16) ? null : "Guests must be a whole number from 1 to 16."),
  petsAllowed: (v) => (typeof v === "boolean" ? null : "Choose whether pets are allowed."),
  amenities: (v) =>
    Array.isArray(v) && v.every((a) => AMENITIES.includes(a)) && new Set(v).size === v.length ? null : "Pick amenities from the list, each once.",
  checkInTime: (v) => (typeof v === "string" && TIME.test(v) ? null : "Use 24-hour HH:MM, like 15:00."),
  checkOutTime: (v) => (typeof v === "string" && TIME.test(v) ? null : "Use 24-hour HH:MM, like 11:00."),
  houseRules: (v) => {
    if (!Array.isArray(v) || v.length > MAX_HOUSE_RULES) return `Add up to ${MAX_HOUSE_RULES} house rules.`;
    if (!v.every((r) => typeof r === "string" && r.trim() && r.trim().length <= MAX_RULE_LENGTH))
      return `Each rule needs text, up to ${MAX_RULE_LENGTH} characters.`;
    return null;
  },
};

/** The fields to set, or why not. Unknown keys and an empty patch are rejected. */
export function validateStayPatch(body: unknown): { set: StayPatch } | { errors: PatchErrors } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { errors: { body: "Nothing to save." } };
  const entries = Object.entries(body);
  if (!entries.length) return { errors: { body: "Nothing to save." } };

  const errors: PatchErrors = {};
  const set: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (!(EDITABLE_FIELDS as string[]).includes(key)) {
      errors.body = `${key} can't be changed here.`;
      continue;
    }
    const problem = CHECKS[key as EditableField](value);
    if (problem) errors[key as EditableField] = problem;
    else set[key] = key === "houseRules" ? (value as string[]).map((r) => r.trim()) : value;
  }
  return Object.keys(errors).length ? { errors } : { set: set as StayPatch };
}

/** The keys whose values differ, so Save only sends (and analytics only names) what changed */
export function changedFields(before: StayPatch, after: StayPatch): EditableField[] {
  return EDITABLE_FIELDS.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}
