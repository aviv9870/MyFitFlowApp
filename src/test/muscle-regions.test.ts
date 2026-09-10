import { describe, it, expect } from "vitest";
import { canonicalMuscleGroup } from "@/lib/muscleGroups";
import {
  DEFAULT_WEEKLY_SET_RANGE as range,
  REGION_APP_GROUP,
  REGION_IDS,
  loadColor,
  loadZone,
} from "@/components/3d/regions";

const appGroups = ["Back", "Biceps", "Chest", "Core", "Legs", "Shoulders", "Triceps"].map(canonicalMuscleGroup);

describe("3D muscle regions", () => {
  it("has 24 regions, each belonging to a canonical app muscle group or none", () => {
    expect(REGION_IDS).toHaveLength(24);
    for (const group of Object.values(REGION_APP_GROUP)) {
      if (group !== null) expect(appGroups).toContain(group);
    }
  });

  it("covers every app muscle group somewhere on the body", () => {
    const shown = new Set(Object.values(REGION_APP_GROUP));
    for (const group of appGroups) expect(shown.has(group)).toBe(true);
  });
});

describe("weekly set range", () => {
  it("is a minimum effective 8 and recommended up to 20 sets", () => {
    expect(range).toEqual({ mev: 8, max: 20 });
  });

  it("puts set counts in the right zone, with both limits inside the recommended range", () => {
    expect(loadZone(0, range)).toBe("none");
    expect(loadZone(7.5, range)).toBe("below");
    expect(loadZone(8, range)).toBe("effective");
    expect(loadZone(20, range)).toBe("effective");
    expect(loadZone(20.5, range)).toBe("above");
  });

  it("colors each zone distinctly and stays constant above the range", () => {
    const colors = [0, 4, 12, 30].map((sets) => loadColor(sets, range));
    expect(new Set(colors).size).toBe(4);
    expect(loadColor(25, range)).toBe(loadColor(40, range));
  });
});
