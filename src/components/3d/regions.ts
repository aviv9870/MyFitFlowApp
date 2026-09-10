export const REGION_GROUPS = [
  "Chest",
  "Lat",
  "Deltoid",
  "Biceps",
  "Triceps",
  "Forearm",
  "Abs",
  "Oblique",
  "Quad",
  "Hamstring",
  "Calf",
  "Glute",
] as const;
export type RegionGroup = (typeof REGION_GROUPS)[number];
export type RegionId = `Muscle_${RegionGroup}_${"L" | "R"}`;

export const REGION_IDS = REGION_GROUPS.flatMap(
  (g) => [`Muscle_${g}_L`, `Muscle_${g}_R`] as RegionId[],
);

export const regionGroupOf = (id: RegionId) => id.split("_")[1] as RegionGroup;

export const REGION_LABELS: Record<RegionGroup, string> = {
  Chest: "חזה",
  Lat: "רחב גבי",
  Deltoid: "דלתא",
  Biceps: "ביספס",
  Triceps: "טריספס",
  Forearm: "אמות",
  Abs: "בטן ישרה",
  Oblique: "בטן אלכסונית",
  Quad: "ארבע־ראשי",
  Hamstring: "ירך אחורית",
  Calf: "תאומים",
  Glute: "ישבן",
};

// The app's canonical muscle_group (lib/muscleGroups) each region belongs to,
// shown under the region's name. null = the app has no such group (forearms).
export const REGION_APP_GROUP: Record<RegionGroup, string | null> = {
  Chest: "חזה",
  Lat: "גב",
  Deltoid: "כתפיים",
  Biceps: "יד קדמית",
  Triceps: "יד אחורית",
  Forearm: null,
  Abs: "בטן",
  Oblique: "בטן",
  Quad: "רגליים",
  Hamstring: "רגליים",
  Calf: "רגליים",
  Glute: "רגליים",
};

export interface WeeklySetRange {
  /** Minimum effective weekly sets. */
  mev: number;
  /** Top of the recommended weekly range. */
  max: number;
}

// One range for every muscle, chosen by the product owner.
export const DEFAULT_WEEKLY_SET_RANGE: WeeklySetRange = { mev: 8, max: 20 };

export type LoadZone = "none" | "below" | "effective" | "above";

export const loadZone = (sets: number, range: WeeklySetRange): LoadZone =>
  !(sets > 0) ? "none" : sets < range.mev ? "below" : sets <= range.max ? "effective" : "above";

export const LOAD_ZONE_LABELS: Record<LoadZone, string> = {
  none: "אין סטים השבוע",
  below: "מתחת למינימום האפקטיבי",
  effective: "בטווח המומלץ",
  above: "מעל הטווח המומלץ",
};

const NO_DATA = "#55747e";
const BELOW_FROM = [43, 110, 128];
const BELOW_TO = [49, 174, 202];
const EFFECTIVE_FROM = [93, 187, 133];
const EFFECTIVE_TO = [235, 180, 54];
const ABOVE = "#e0442b";

const mix = (a: number[], b: number[], t: number) =>
  "#" +
  a
    .map((v, k) =>
      Math.round(v + (b[k] - v) * Math.max(0, Math.min(1, t)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

/** Weekly sets against the recommended range; not a hypertrophy or recovery prediction. */
export function loadColor(sets: number, range: WeeklySetRange): string {
  const zone = loadZone(sets, range);
  if (zone === "none") return NO_DATA;
  if (zone === "below") return mix(BELOW_FROM, BELOW_TO, sets / range.mev);
  if (zone === "effective") return mix(EFFECTIVE_FROM, EFFECTIVE_TO, (sets - range.mev) / (range.max - range.mev));
  return ABOVE;
}

// The legend and card bars run 20% past the recommended top so "above" has room.
export const loadScaleMax = (range: WeeklySetRange) => range.max * 1.2;

export const loadScaleGradient = (range: WeeklySetRange) => {
  const at = (sets: number) => `${((sets / loadScaleMax(range)) * 100).toFixed(1)}%`;
  return `linear-gradient(to left, ${mix(BELOW_FROM, BELOW_TO, 0)} 0%, ${mix(BELOW_FROM, BELOW_TO, 1)} ${at(range.mev)}, ${mix(EFFECTIVE_FROM, EFFECTIVE_TO, 0)} ${at(range.mev)}, ${mix(EFFECTIVE_FROM, EFFECTIVE_TO, 1)} ${at(range.max)}, ${ABOVE} ${at(range.max)}, ${ABOVE} 100%)`;
};
