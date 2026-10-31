// Explains, in coaching terms, how one exercise differs from another - the
// content behind the "i" button when swapping an exercise. Like the training
// analysis, it is rule-based: it reads the exercise's equipment, the angle /
// grip / attachment in its name, and the kinesiology table (which muscles it
// loads and how much), so the answer is instant, free and the same every time.

export interface ExerciseInfo {
  name: string;
  nameEn: string;
  equipment: string | null;
  description?: string | null;
  /** pz muscle code -> 0..1 share of a set that muscle is credited with. */
  contributions?: Record<string, number>;
  pattern?: string | null;
  isCompound?: boolean | null;
  isUnilateral?: boolean | null;
  /** joint -> 0..3 stress */
  jointStress?: Record<string, number>;
}

export interface ComparisonPoint {
  icon: string;
  title: string;
  text: string;
}

export type ExerciseRelation = "variation" | "alternative" | "different";

export interface ExerciseComparison {
  relation: ExerciseRelation;
  relationLabel: string;
  headline: string;
  points: ComparisonPoint[];
}

export const MUSCLE_LABELS: Record<string, string> = {
  chest: "חזה",
  front_delts: "כתף קדמית",
  side_delts: "כתף אמצעית",
  rear_delts: "כתף אחורית",
  triceps: "יד אחורית",
  biceps: "יד קדמית",
  forearms: "אמות",
  lats: "רחב גבי",
  upper_back: "גב עליון",
  traps: "טרפז",
  lower_back: "גב תחתון",
  quads: "ארבע־ראשי",
  hamstrings: "ירך אחורית",
  glutes: "ישבן",
  adductors: "מקרבים",
  calves: "תאומים",
  abs: "בטן",
  obliques: "אלכסוני בטן",
  hip_flexors: "כופפי ירך",
  neck: "צוואר",
};

const JOINT_LABELS: Record<string, string> = {
  shoulder: "כתף",
  elbow: "מרפק",
  wrist: "שורש כף היד",
  knee: "ברך",
  hip: "ירך",
  ankle: "קרסול",
  lumbar_spine: "גב תחתון",
  cervical_spine: "צוואר",
};

const PATTERN_LABELS: Record<string, string> = {
  horizontal_push: "דחיפה אופקית",
  vertical_push: "דחיפה אנכית",
  horizontal_pull: "משיכה אופקית",
  vertical_pull: "משיכה אנכית",
  squat: "סקוואט",
  hinge: "ציר ירך",
  lunge: "צעד / לאנג׳",
  isolation: "בידוד",
  carry: "נשיאה",
  rotation: "סיבוב",
  anti_rotation: "מניעת סיבוב",
  plyometric: "פליומטרי",
};

// --- equipment -------------------------------------------------------------

type EquipKey = "barbell" | "dumbbell" | "cable" | "machine" | "smith" | "bodyweight" | "kettlebell";

const EQUIPMENT: Record<EquipKey, { label: string; traits: string }> = {
  barbell: {
    label: "מוט",
    traits:
      "העומס המרבי הגבוה ביותר, עם קפיצות משקל קטנות וטווח תנועה קבוע. דורש יציבות וטכניקה, ובלחיצות כדאי לעבוד עם מגן או שותף.",
  },
  dumbbell: {
    label: "משקולות יד",
    traits:
      "כל צד עובד לבד, ולכן אפשר לתקן פערי כוח בין הצדדים. טווח התנועה גדול יותר (מתיחה עמוקה יותר בתחתית) ויש יותר עבודת מייצבים, ולכן המשקל נמוך יותר.",
  },
  cable: {
    label: "כבל",
    traits:
      "מתח קבוע לאורך כל התנועה, גם בנקודות שבהן משקולת חופשית כמעט נחה, עם קפיצות משקל קטנות ויכולת לשנות את כיוון המשיכה.",
  },
  machine: {
    label: "מכונה",
    traits:
      "מסלול קבוע ותמיכה בגוף: מבודדת את שריר המטרה, בטוחה לעבודה עד כשל, וכמעט לא דורשת טכניקה. יש פחות עבודת מייצבים, ומשקלים אינם ניתנים להשוואה בין מכונות שונות.",
  },
  smith: {
    label: "מכונת סמית",
    traits:
      "מוט על מסילה: מסלול קבוע, פחות יציבות נדרשת ואפשר לעבוד בבטחה גם בלי שותף. המסלול הישר לא תמיד טבעי למפרקים, ובעומס כבד הוא עלול להעמיס עליהם.",
  },
  bodyweight: {
    label: "משקל גוף",
    traits: "העומס נקבע לפי משקל הגוף והזווית, ולכן מתקדמים בעיקר בחזרות, בקושי התנועה או בתוספת משקל.",
  },
  kettlebell: {
    label: "קטלבל",
    traits:
      "מרכז הכובד של המשקולת מחוץ ליד, ולכן האחיזה והמייצבים עובדים יותר ובדרך כלל משתמשים במשקלים נמוכים יותר.",
  },
};

const equipKey = (e: ExerciseInfo): EquipKey | null => {
  if (/smith/i.test(e.nameEn)) return "smith";
  switch ((e.equipment ?? "").toLowerCase()) {
    case "barbell":
      return "barbell";
    case "dumbbell":
      return "dumbbell";
    case "cables":
    case "cable":
      return "cable";
    case "machine":
      return "machine";
    case "bodyweight":
      return "bodyweight";
    case "kettlebell":
      return "kettlebell";
    default:
      return null;
  }
};

// Dumbbells and kettlebells are logged per hand; everything else as a total.
const perHand = (k: EquipKey | null) => k === "dumbbell" || k === "kettlebell";

// --- variation dimensions read from the English name ---------------------------

type Angle = "incline" | "decline" | "flat";
type Position = "seated" | "standing" | "lying" | "kneeling";
type Grip = "wide" | "close" | "reverse" | "neutral";
type Handle = "rope" | "vbar" | "straight" | "ez";

const isPress = (n: string) => /(bench press|chest press|fly|flye|pec deck)/i.test(n);

export const angleOf = (e: ExerciseInfo): Angle | null => {
  if (/incline/i.test(e.nameEn)) return "incline";
  if (/decline/i.test(e.nameEn)) return "decline";
  return isPress(e.nameEn) ? "flat" : null;
};
export const positionOf = (e: ExerciseInfo): Position | null => {
  if (/seated/i.test(e.nameEn)) return "seated";
  if (/standing/i.test(e.nameEn)) return "standing";
  if (/lying|supine/i.test(e.nameEn)) return "lying";
  if (/kneeling/i.test(e.nameEn)) return "kneeling";
  return null;
};
export const gripOf = (e: ExerciseInfo): Grip | null => {
  if (/wide/i.test(e.nameEn)) return "wide";
  if (/close-grip|narrow/i.test(e.nameEn)) return "close";
  if (/reverse|underhand|supinated|chin-up/i.test(e.nameEn)) return "reverse";
  if (/hammer|neutral/i.test(e.nameEn)) return "neutral";
  return null;
};
export const handleOf = (e: ExerciseInfo): Handle | null => {
  if (/rope/i.test(e.nameEn)) return "rope";
  if (/v-bar/i.test(e.nameEn)) return "vbar";
  if (/straight bar/i.test(e.nameEn)) return "straight";
  if (/ez-bar/i.test(e.nameEn)) return "ez";
  return null;
};
const singleSided = (e: ExerciseInfo) =>
  e.isUnilateral ?? /single-arm|single arm|one-arm|unilateral|single-leg/i.test(e.nameEn);

const ANGLE_NOTES: Record<Angle, string> = {
  incline:
    "בשיפוע חיובי הדגש עובר לחלק העליון של החזה ולכתף הקדמית. בדרך כלל מרימים כ-10 עד 20 אחוז פחות מאשר בשיפוע שטוח.",
  decline:
    "בשיפוע שלילי הדגש עובר לחלק התחתון של החזה, עם פחות עומס על הכתף הקדמית וטווח תנועה קצר יותר. לרוב אפשר להרים משקל דומה או מעט גבוה יותר מאשר בשטוח.",
  flat: "בשיפוע שטוח העבודה מתחלקת על כל החזה, וזו לרוב הנקודה שבה אפשר להרים את המשקל הגבוה ביותר.",
};

const POSITION_NOTES: Record<Position, string> = {
  seated: "ישיבה עם משענת מפחיתה את הצורך ביציבות הגוף ומרכזת את העבודה בשריר המטרה.",
  standing: "עמידה מגייסת גם את שרירי הליבה והרגליים לייצוב, ולכן המשקל המרבי נמוך יותר.",
  lying: "שכיבה מייצבת את הגוף ומאפשרת להתמקד בתנועה עצמה.",
  kneeling: "ברכיים מצמצמות את תרומת הרגליים ומעמידות דגש על הליבה והיציבות.",
};

const HANDLE_NOTES: Record<Handle, string> = {
  rope: "חבל מאפשר להפריד את הידיים בסוף התנועה ולסובב את פרקי הכף, לכיווץ חזק יותר בסוף התנועה ופחות עומס על פרקי הכף. לרוב משתמשים בקצת פחות משקל מאשר במוט.",
  vbar: "מוט V הוא אחיזה צרה ויציבה שמאפשרת עומס גבוה יותר מחבל, בזווית נוחה יחסית לפרקי הכף.",
  straight:
    "מוט ישר מאפשר את המשקל הגבוה ביותר, אבל נועל את פרקי הכף בזווית אחת שלעיתים מעמיסה עליהם.",
  ez: "מוט W נותן זווית אחיזה נוחה יותר לפרקי הכף ולמרפקים מאשר מוט ישר.",
};

const gripNote = (grip: Grip, to: ExerciseInfo): string => {
  const pattern = to.pattern ?? "";
  if (/pull/.test(pattern)) {
    if (grip === "wide") return "אחיזה רחבה מעבירה דגש לרחב הגבי ולגב העליון, עם פחות עבודה של היד הקדמית.";
    if (grip === "close" || grip === "neutral")
      return "אחיזה צרה או ניטרלית מגדילה את מעורבות היד הקדמית ואת החלק התחתון של הרחב הגבי, עם טווח תנועה ארוך יותר.";
    return "אחיזה הפוכה מגדילה את מעורבות היד הקדמית ומקטינה מעט את הדרישה מהגב.";
  }
  if (pattern === "horizontal_push" || pattern === "vertical_push") {
    if (grip === "wide") return "אחיזה רחבה מעבירה יותר עומס לחזה ופחות ליד האחורית, אבל מגדילה את העומס על הכתפיים.";
    if (grip === "close") return "אחיזה צרה מעבירה דגש ליד האחורית ומקטינה את תרומת החזה.";
    if (grip === "reverse")
      return "אחיזה הפוכה מגבירה את מעורבות החלק העליון של החזה והכתף הקדמית, ומעמיסה יותר על פרקי הכף והכתפיים.";
    return "אחיזה ניטרלית נוחה יותר לכתפיים ומעבירה מעט יותר עבודה ליד האחורית.";
  }
  if (grip === "neutral") return "אחיזת פטיש מגבירה את מעורבות שרירי האמה והזרוע הצדדיים, על חשבון היד הקדמית.";
  if (grip === "reverse") return "אחיזה הפוכה מגבירה את מעורבות האמות ומקשה להרים משקל כבד.";
  if (grip === "wide") return "אחיזה רחבה משנה את זווית הפרקים וגורמת לתנועה להתרכז יותר בשרירים החיצוניים.";
  return "אחיזה צרה משנה את זווית הפרקים ומעבירה חלק מהעבודה לשרירים המסייעים.";
};

// --- helpers --------------------------------------------------------------------

const top = (c?: Record<string, number>): string[] => {
  const vals = Object.values(c ?? {});
  if (vals.length === 0) return [];
  const max = Math.max(...vals);
  return Object.entries(c ?? {})
    .filter(([, v]) => v === max)
    .map(([k]) => k)
    .sort();
};

const muscleName = (code: string) => MUSCLE_LABELS[code] ?? code;
const list = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ו${names[names.length - 1]}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

// --- the comparison -----------------------------------------------------------------

export function compareExercises(from: ExerciseInfo, to: ExerciseInfo): ExerciseComparison {
  const points: ComparisonPoint[] = [];
  const changed: string[] = [];

  const fromTop = top(from.contributions);
  const toTop = top(to.contributions);
  const haveMuscles = fromTop.length > 0 && toTop.length > 0;
  const samePrimary = haveMuscles && fromTop.join() === toTop.join();
  const samePattern = !!from.pattern && from.pattern === to.pattern;

  // Equipment
  const fk = equipKey(from);
  const tk = equipKey(to);
  if (fk && tk && fk !== tk) {
    changed.push("ציוד");
    let text = `ב${EQUIPMENT[tk].label}: ${EQUIPMENT[tk].traits}`;
    if (perHand(fk) !== perHand(tk)) {
      text +=
        " במשקולות יד ובקטלבל נרשם המשקל של יד אחת, ובמוט, בכבל ובמכונה המשקל הכולל, ולכן אין להשוות מספרים ישירות.";
    }
    points.push({ icon: "fitness_center", title: `${EQUIPMENT[fk].label} ← ${EQUIPMENT[tk].label}`, text });
  }

  // Angle / position
  const fa = angleOf(from);
  const ta = angleOf(to);
  if (ta && fa !== ta) {
    changed.push("שיפוע");
    points.push({ icon: "square_foot", title: "זווית הספסל", text: ANGLE_NOTES[ta] });
  }
  const fp = positionOf(from);
  const tp = positionOf(to);
  if (tp && fp !== tp) {
    changed.push("תנוחת גוף");
    points.push({ icon: "airline_seat_recline_normal", title: "תנוחת הגוף", text: POSITION_NOTES[tp] });
  }

  // Grip / handle
  const fg = gripOf(from);
  const tg = gripOf(to);
  if (tg && fg !== tg) {
    changed.push("אחיזה");
    points.push({ icon: "pan_tool", title: "אחיזה", text: gripNote(tg, to) });
  }
  const fh = handleOf(from);
  const th = handleOf(to);
  if (th && fh !== th) {
    changed.push("ידית");
    points.push({ icon: "swap_calls", title: "סוג הידית", text: HANDLE_NOTES[th] });
  }

  // One side or two
  const fs = singleSided(from);
  const ts = singleSided(to);
  if (fs !== ts) {
    changed.push(ts ? "ביצוע חד-צדדי" : "ביצוע דו-צדדי");
    points.push(
      ts
        ? {
            icon: "compare_arrows",
            title: "חד-צדדי",
            text: "כל צד עובד לבד: אפשר לזהות ולתקן פערי כוח בין הצדדים, ויש דרישת יציבות גבוהה יותר. משקל נמוך יותר בכל יד, ובדרך כלל מבצעים סטים לכל צד.",
          }
        : {
            icon: "compare_arrows",
            title: "דו-צדדי",
            text: "שני הצדדים עובדים יחד: העומס הכולל גבוה יותר והביצוע קצר יותר, אבל הצד החזק יכול לפצות על החלש.",
          },
    );
  }

  // Which muscles the exercise loads
  if (haveMuscles) {
    if (!samePrimary) {
      points.push({
        icon: "accessibility_new",
        title: "שריר עיקרי",
        text: `העבודה העיקרית עוברת מ${list(fromTop.map(muscleName))} ל${list(toTop.map(muscleName))}.`,
      });
    }
    const more: string[] = [];
    const less: string[] = [];
    const codes = new Set([...Object.keys(from.contributions ?? {}), ...Object.keys(to.contributions ?? {})]);
    for (const code of codes) {
      const a = from.contributions?.[code] ?? 0;
      const b = to.contributions?.[code] ?? 0;
      if (b - a >= 0.25) more.push(`${muscleName(code)} (${pct(a)} ← ${pct(b)})`);
      else if (a - b >= 0.25) less.push(`${muscleName(code)} (${pct(a)} ← ${pct(b)})`);
    }
    if (more.length || less.length) {
      const parts: string[] = [];
      if (more.length) parts.push(`דגש גבוה יותר על ${list(more)}`);
      if (less.length) parts.push(`דגש נמוך יותר על ${list(less)}`);
      points.push({
        icon: "monitoring",
        title: "חלוקת העבודה בין השרירים",
        text: `${parts.join(". ")}. האחוזים הם כמה מסט נספר לכל שריר, וכך גם נספר בעמוד הניתוח.`,
      });
    }
  }

  // Movement pattern and complexity
  if (from.pattern && to.pattern && !samePattern) {
    points.push({
      icon: "directions_run",
      title: "תבנית תנועה",
      text: `${PATTERN_LABELS[from.pattern] ?? from.pattern} ← ${PATTERN_LABELS[to.pattern] ?? to.pattern}. זו תנועה שונה, ולכן הביצועים והעומס אינם ניתנים להשוואה ישירה.`,
    });
  }
  if (from.isCompound != null && to.isCompound != null && from.isCompound !== to.isCompound) {
    points.push(
      to.isCompound
        ? {
            icon: "layers",
            title: "תרגיל מורכב",
            text: "מערב כמה מפרקים ושרירים, מאפשר עומס גבוה יותר ומעייף את הגוף יותר מתרגיל בידוד.",
          }
        : {
            icon: "adjust",
            title: "תרגיל בידוד",
            text: "מרכז את העבודה בשריר אחד עם פחות עייפות כללית, ומתאים להשלמת נפח אחרי תרגיל מורכב.",
          },
    );
  }

  // Joints
  if (from.jointStress && to.jointStress) {
    const up: string[] = [];
    const down: string[] = [];
    for (const joint of new Set([...Object.keys(from.jointStress), ...Object.keys(to.jointStress)])) {
      const d = (to.jointStress[joint] ?? 0) - (from.jointStress[joint] ?? 0);
      if (d >= 1 && JOINT_LABELS[joint]) up.push(JOINT_LABELS[joint]);
      else if (d <= -1 && JOINT_LABELS[joint]) down.push(JOINT_LABELS[joint]);
    }
    if (up.length || down.length) {
      const parts: string[] = [];
      if (up.length) parts.push(`עומס מוגבר על ${list(up)}`);
      if (down.length) parts.push(`עומס מופחת על ${list(down)}`);
      points.push({ icon: "healing", title: "מפרקים", text: `${parts.join(", ")}.` });
    }
  }

  // Overall relation
  let relation: ExerciseRelation;
  if (haveMuscles ? samePrimary && (samePattern || !from.pattern) : changed.length > 0) relation = "variation";
  else if (haveMuscles && !samePrimary && toTop.every((t) => !fromTop.includes(t))) relation = "different";
  else relation = "alternative";

  const relationLabel =
    relation === "variation"
      ? "וריאציה של אותו תרגיל"
      : relation === "alternative"
        ? "חלופה לאותו שריר"
        : "תרגיל לשריר אחר";

  let headline: string;
  if (relation === "variation") {
    headline =
      changed.length > 0
        ? `אותה תנועה בסיסית ואותם שרירים עיקריים, עם שינוי ב${list(changed)}.`
        : "שני התרגילים כמעט זהים: אותה תנועה ואותם שרירים.";
  } else if (relation === "alternative") {
    headline = haveMuscles
      ? `מעמיס על ${list(toTop.map(muscleName))} כמו התרגיל הנוכחי, אבל בתנועה אחרת.`
      : "תרגיל חלופי לאותה קבוצת שרירים, בתנועה אחרת.";
  } else {
    headline = `מאמן בעיקר ${list(toTop.map(muscleName))} ולא ${list(fromTop.map(muscleName))}.`;
  }

  if (points.length === 0) {
    points.push({
      icon: "info",
      title: "אין הבדל מהותי",
      text: "לא זוהה הבדל בציוד, בזווית, באחיזה או בשרירים שעובדים. אפשר להחליף בלי לשנות את התוכנית.",
    });
  }

  return { relation, relationLabel, headline, points };
}
