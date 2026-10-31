// Which exercises are "the same lift" for the purpose of comparing performance.
//
// Switching a triceps pushdown from the rope to the V-bar, or a dumbbell press
// from flat to incline, changes the lever but not the lift: the weight on the
// stack or in the hands is still comparable. Two exercises are therefore in
// the same family when they differ only in bench angle, body position, grip
// width or cable handle - and use the same kind of equipment. Equipment is
// deliberately part of the family: a dumbbell press is logged per hand and a
// barbell press as a total, so their numbers can't be compared. Anything else
// (a different movement, a reverse grip, one arm instead of two) stays its own
// family, and the trainee can still move history across by hand.

export interface LibraryExercise {
  name: string;
  name_en: string | null;
  equipment: string | null;
}

type Implement = "barbell" | "dumbbell" | "cable" | "machine" | "smith" | "bodyweight" | "kettlebell" | "other";

const implementOf = (e: LibraryExercise): Implement => {
  if (/smith/i.test(e.name_en ?? "")) return "smith";
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
      return "other";
  }
};

// Words that change the lever, not the lift. The implement is encoded
// separately, so its own words go too.
const NEUTRAL_WORDS = [
  "incline",
  "decline",
  "flat",
  "seated",
  "standing",
  "lying",
  "kneeling",
  "rope",
  "v-bar",
  "straight bar",
  "ez-bar",
  "ez bar",
  "wide-grip",
  "wide grip",
  "wide",
  "close-grip",
  "close grip",
  "narrow-grip",
  "narrow",
  "barbell",
  "dumbbells",
  "dumbbell",
  "cables",
  "cable",
  "smith machine",
  "smith",
  "hammer strength",
  "machine",
  "kettlebells",
  "kettlebell",
];

// Plain \b boundaries, not lookbehind: a lookbehind is a SyntaxError on Safari
// older than 16.4, and a regex that fails to parse takes down the whole module
// graph - i.e. the entire app - at load.
const NEUTRAL_RE = new RegExp(
  `\\b(${NEUTRAL_WORDS.map((w) => w.replace(/[-\s]/g, "[-\\s]")).join("|")})\\b`,
  "gi",
);

/** Stable key shared by every variation of one lift on one kind of equipment. */
export const variantKey = (e: LibraryExercise): string => {
  const base = (e.name_en ?? e.name)
    .toLowerCase()
    .replace(NEUTRAL_RE, " ")
    .replace(/[()/,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${implementOf(e)}|${base || e.name}`;
};

export interface FamilyIndex {
  /** The other exercises that count as the same lift (never includes `name`). */
  siblingsOf: (name: string) => string[];
}

export const buildFamilyIndex = (library: LibraryExercise[]): FamilyIndex => {
  const byKey = new Map<string, string[]>();
  const keyOfName = new Map<string, string>();
  for (const e of library) {
    const key = variantKey(e);
    keyOfName.set(e.name, key);
    byKey.set(key, [...(byKey.get(key) ?? []), e.name]);
  }
  return {
    siblingsOf: (name) => {
      const key = keyOfName.get(name);
      return key ? (byKey.get(key) ?? []).filter((n) => n !== name) : [];
    },
  };
};

export const NO_FAMILIES: FamilyIndex = { siblingsOf: () => [] };
