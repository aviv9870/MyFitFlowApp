import type { FocusEvent, KeyboardEvent } from "react";
import { toast } from "sonner";

// workout_set_logs.reps is an integer column. A decimal there isn't rounded -
// Postgres rejects the whole insert, so one mistyped rep fails the entire
// save. Reps inputs therefore refuse non-integer keystrokes outright, and
// parse with truncation as a backstop for pasted values.
const NON_INTEGER_KEYS = new Set([".", ",", "e", "E", "+", "-"]);
const DECIMAL_KEYS = new Set([".", ","]);

const blockNonIntegerKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (!NON_INTEGER_KEYS.has(e.key)) return;
  e.preventDefault();
  // Swallowing the "." silently would turn a typed 12.5 into 125 reps. A
  // decimal here almost always means a weight typed into the reps box - which
  // is exactly what happened in production - so say so on the spot.
  if (DECIMAL_KEYS.has(e.key)) {
    toast.error("בחזרות אפשר רק מספר שלם", { id: "reps-integer-only", description: "משקל נכתב בשדה ק״ג" });
  }
};

// Tapping a filled set field means "change this", so select the existing
// value instead of making the user clear digits one backspace at a time on
// a phone.
const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => e.currentTarget.select();

export const repsInputProps = {
  inputMode: "numeric" as const,
  step: 1,
  min: 0,
  onKeyDown: blockNonIntegerKeys,
  onFocus: selectOnFocus,
};

// Weight is numeric, so 12.5kg is legitimate - only the keypad hint differs.
export const weightInputProps = {
  inputMode: "decimal" as const,
  step: "any",
  min: 0,
  onFocus: selectOnFocus,
};

export const parseReps = (raw: string): number => {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const parseWeight = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
