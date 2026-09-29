// The AI edge function reports whichever provider failed last, in English and
// with a bare HTTP status ("Cerebras API error: 402"). That tells a trainee
// nothing and reads like an app bug, when the usual cause is the AI account
// itself - out of credit, a bad key, or rate limited. Translate the few cases
// that actually happen into Hebrew that says what to do about it.
const PATTERNS: { test: RegExp; message: string }[] = [
  {
    test: /\b402\b|payment required|insufficient|quota|credit|billing/i,
    message: "שירות ה-AI לא זמין: נגמר הקרדיט בחשבון ספק ה-AI. צריך לחדש אותו או להגדיר מפתח של ספק אחר.",
  },
  {
    test: /\b401\b|\b403\b|api key|unauthorized|אינו תקף/i,
    message: "מפתח ה-AI אינו תקף או חסרה לו הרשאה. צריך לעדכן אותו בהגדרות השרת.",
  },
  { test: /\b429\b|rate limit|too many requests/i, message: "יותר מדי בקשות ל-AI כרגע. נסה שוב בעוד דקה." },
  { test: /deadline|timeout|timed out|abort/i, message: "הניתוח לקח יותר מדי זמן. נסה שוב." },
  { test: /no ai provider configured/i, message: "לא מוגדר ספק AI בשרת." },
];

export const aiErrorMessage = (err: unknown, fallback = "שגיאה בניתוח AI"): string => {
  const raw = (err as { message?: string })?.message ?? String(err ?? "");
  return PATTERNS.find((p) => p.test.test(raw))?.message ?? raw ?? fallback;
};
