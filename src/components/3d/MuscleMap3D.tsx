import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import MaterialIcon from "@/components/MaterialIcon";
import { formatSets, type RegionWork } from "@/lib/muscleGroups";
import { Model, MODEL_URL, DRACO_PATH } from "./BodyModel";
import {
  DEFAULT_WEEKLY_SET_RANGE,
  LOAD_ZONE_LABELS,
  REGION_APP_GROUP,
  REGION_IDS,
  REGION_LABELS,
  loadColor,
  loadScaleGradient,
  loadScaleMax,
  loadZone,
  regionGroupOf,
  type RegionGroup,
  type RegionId,
  type WeeklySetRange,
} from "./regions";

type RegionWeek = Partial<Record<RegionGroup, RegionWork>>;

// Selection glow follows the user's accent theme (lib/theme.ts rewrites --primary at runtime).
function themePrimary() {
  const hsl = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  return hsl ? `hsl(${hsl.replace(/\s+/g, ", ")})` : "#79d9d7";
}

// Distance from the right edge (RTL) of a set count on the legend and card bars.
const scalePct = (sets: number, range: WeeklySetRange) =>
  `${Math.min(100, (sets / loadScaleMax(range)) * 100)}%`;

function RangeTicks({ range }: { range: WeeklySetRange }) {
  return (
    <div className="relative h-3.5 mt-1 text-[10px] text-muted-foreground tabular-nums">
      <span className="absolute right-0">0</span>
      {[range.mev, range.max].map((v) => (
        <span key={v} className="absolute" style={{ right: scalePct(v, range), transform: "translateX(50%)" }}>
          {v}
        </span>
      ))}
    </div>
  );
}

interface MuscleMap3DProps {
  weekly: RegionWeek;
  offModelSets?: number;
  range?: WeeklySetRange;
  className?: string;
}

const MuscleMap3D = ({
  weekly,
  offModelSets = 0,
  range = DEFAULT_WEEKLY_SET_RANGE,
  className = "",
}: MuscleMap3DProps) => {
  const [selected, setSelected] = useState<RegionId | null>(null);
  const [attempt, setAttempt] = useState(0);
  const region = selected ? regionGroupOf(selected) : null;
  return (
    <div className={className}>
      <div className="relative h-[420px] touch-none">
        <ModelBoundary
          key={attempt}
          onRetry={() => {
            useGLTF.clear(MODEL_URL);
            setAttempt((a) => a + 1);
          }}
        >
          <Canvas
            frameloop="demand"
            dpr={[1, 1.8]}
            camera={{ position: [0, 0.9, 4.2], fov: 30, near: 0.05, far: 20 }}
            onPointerMissed={() => setSelected(null)}
            role="img"
            aria-label="מודל שרירים תלת־ממדי. נגיעה בשריר מציגה את הסטים השבועיים שלו."
          >
            <hemisphereLight args={["#d4f5ff", "#173448", 2]} />
            <directionalLight position={[2, 3, 4]} intensity={3} color="#e4f5ff" />
            <directionalLight position={[-2, 1, 2]} intensity={1.2} color="#e4f5ff" />
            <directionalLight position={[0, 2, -3]} intensity={2} color="#e4f5ff" />
            <Suspense
              fallback={
                <Html center>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">טוען מודל…</span>
                </Html>
              }
            >
              <Body weekly={weekly} range={range} selected={region} onPick={setSelected} />
            </Suspense>
            <OrbitControls
              makeDefault
              target={[0, 0.9, 0]}
              enablePan={false}
              enableDamping={false}
              minDistance={1.6}
              maxDistance={6}
              minPolarAngle={0.6}
              maxPolarAngle={2.4}
            />
          </Canvas>
        </ModelBoundary>
      </div>
      {/* Below the canvas, not over it: on a phone-width canvas an overlay hides the muscle it describes. */}
      {region && (
        <RegionCard region={region} work={weekly[region]} range={range} onClose={() => setSelected(null)} />
      )}
      <div className="mt-3">
        <div className="h-1.5 rounded-full" style={{ background: loadScaleGradient(range) }} />
        <RangeTicks range={range} />
        <p className="text-[10.5px] text-muted-foreground mt-1">
          מינימום אפקטיבי {range.mev} סטים לשבוע לכל שריר, מומלץ עד {range.max}. סט מלא כשהשריר עובד עיקרי
          בתרגיל, חלק מסט כשהוא עוזר. זו הנחיה לנפח אימון, לא מדידה של גדילת שריר. אפור = אין סטים השבוע.
        </p>
        {offModelSets > 0 && (
          <p className="text-[10.5px] text-muted-foreground mt-1">
            ועוד {formatSets(offModelSets)} סטים השבוע בתרגילים לשרירים שהדמות לא מציגה (כמו טרפז ומקרבי
            ירך).
          </p>
        )}
      </div>
    </div>
  );
};

export default MuscleMap3D;

function Body({
  weekly,
  range,
  selected,
  onPick,
}: {
  weekly: RegionWeek;
  range: WeeklySetRange;
  selected: RegionGroup | null;
  onPick: (id: RegionId | null) => void;
}) {
  const { nodes, materials } = useGLTF(MODEL_URL, DRACO_PATH);
  const invalidate = useThree((s) => s.invalidate);
  const glow = useMemo(themePrimary, []);
  const [untracked, setUntracked] = useState<THREE.Vector3 | null>(null);
  useEffect(() => {
    if (!untracked) return;
    invalidate();
    const t = setTimeout(() => setUntracked(null), 2500);
    return () => clearTimeout(t);
  }, [untracked, invalidate]);

  const byGeometry = useMemo(() => {
    const map = new Map<THREE.BufferGeometry, RegionId>();
    for (const id of REGION_IDS) {
      const node = nodes[id] as THREE.Mesh | undefined;
      if (node?.geometry) map.set(node.geometry, id);
    }
    if (map.size !== REGION_IDS.length)
      throw new Error(`Model has ${map.size} muscle regions instead of ${REGION_IDS.length}.`);
    return map;
  }, [nodes]);

  useEffect(() => {
    for (const id of REGION_IDS) {
      const m = materials[`${id}_Material`] as THREE.MeshStandardMaterial | undefined;
      if (!m) continue;
      const region = regionGroupOf(id);
      m.color.set(loadColor(weekly[region]?.sets ?? 0, range));
      m.roughness = 0.58;
      const lit = region === selected;
      m.emissive.set(lit ? glow : "#000000");
      m.emissiveIntensity = lit ? 0.18 : 0;
    }
    invalidate();
  }, [materials, weekly, range, selected, glow, invalidate]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // A drag that rotated the model is not a tap.
    if (e.delta > 6) return;
    const first = e.intersections[0];
    // Thin structures can lie over a region; accept a region just beneath the surface,
    // but never one on the far side of the body.
    const hit = e.intersections.find(
      (i) =>
        i.distance - first.distance < 0.04 &&
        byGeometry.has((i.object as THREE.Mesh).geometry),
    );
    if (hit) {
      setUntracked(null);
      onPick(byGeometry.get((hit.object as THREE.Mesh).geometry)!);
    } else {
      // E.g. sternum, sartorius or trapezius: anatomy shown for context, not a tracked region.
      setUntracked(first.point.clone());
      onPick(null);
    }
  };

  return (
    <>
      <Model onClick={onClick} />
      {!selected && untracked && (
        <Html position={untracked} zIndexRange={[20, 0]}>
          <p
            role="status"
            className="glass-card px-3 py-1.5 text-[11.5px] text-muted-foreground whitespace-nowrap"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translate(-50%, calc(-100% - 10px))",
              pointerEvents: "none",
            }}
          >
            האזור הזה אינו אחד משרירי המפה
          </p>
        </Html>
      )}
    </>
  );
}

function RegionCard({
  region,
  work,
  range,
  onClose,
}: {
  region: RegionGroup;
  work: RegionWork | undefined;
  range: WeeklySetRange;
  onClose: () => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const label = REGION_LABELS[region];
  const group = REGION_APP_GROUP[region];
  const sets = work?.sets ?? 0;
  const zone = loadZone(sets, range);
  const color = loadColor(sets, range);
  const byExercise = work?.byExercise ?? [];
  return (
    <section className="bg-secondary/50 rounded-xl p-3 mt-3 text-right" aria-live="polite" aria-label={label}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {group && group !== label && <span className="text-[11px] text-muted-foreground">{group}</span>}
        <button
          onClick={onClose}
          aria-label="סגירה"
          className="ms-auto -me-1.5 -my-1 h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/50"
        >
          <MaterialIcon icon="close" className="text-[18px]" />
        </button>
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        {byExercise.length > 0 ? (
          <button
            onClick={() => setShowBreakdown(true)}
            className="flex items-baseline gap-1 text-right"
            aria-label={`פירוט ${formatSets(sets)} הסטים של ${label} לפי תרגיל`}
          >
            <span className="text-2xl font-bold text-foreground tabular-nums underline decoration-dotted underline-offset-4">
              {formatSets(sets)}
            </span>
            <MaterialIcon icon="expand_content" className="text-primary text-[14px]" />
          </button>
        ) : (
          <span className="text-2xl font-bold text-foreground tabular-nums">{formatSets(sets)}</span>
        )}
        <span className="text-[11.5px] text-muted-foreground">סטים השבוע</span>
        <span
          className={`ms-auto text-[11px] font-semibold rounded-full px-2 py-0.5 bg-background/60 ${
            zone === "none" ? "text-muted-foreground" : ""
          }`}
          style={zone === "none" ? undefined : { color }}
        >
          {LOAD_ZONE_LABELS[zone]}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-background/60 mt-2">
        <div className="h-full rounded-full" style={{ width: scalePct(sets, range), background: color }} />
        {[range.mev, range.max].map((v) => (
          <span
            key={v}
            className="absolute -top-0.5 h-2.5 w-px bg-foreground/50"
            style={{ right: scalePct(v, range) }}
          />
        ))}
      </div>
      <RangeTicks range={range} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <p className="text-[10.5px] text-muted-foreground">חזרות</p>
          <p className="text-sm text-foreground tabular-nums">
            {Math.round(work?.reps ?? 0).toLocaleString("he-IL")}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] text-muted-foreground">נפח</p>
          <p className="text-sm text-foreground tabular-nums">
            {Math.round(work?.volumeKg ?? 0).toLocaleString("he-IL")}{" "}
            <span className="text-[10.5px] text-muted-foreground">ק״ג</span>
          </p>
        </div>
      </div>

      {showBreakdown && (
        <div
          className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          dir="rtl"
          onClick={() => setShowBreakdown(false)}
        >
          <div
            className="glass-card w-full max-w-sm p-4 max-h-[70vh] overflow-y-auto"
            role="dialog"
            aria-label={`פירוט הסטים של ${label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-[11.5px] text-muted-foreground tabular-nums">
                {formatSets(sets)} סטים השבוע
              </span>
              <button
                onClick={() => setShowBreakdown(false)}
                aria-label="סגירה"
                className="ms-auto -me-1.5 h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/50"
              >
                <MaterialIcon icon="close" className="text-[18px]" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {byExercise.map((ex) => (
                <div key={ex.name} className="flex items-baseline gap-2 py-2">
                  <span className="text-sm text-foreground tabular-nums shrink-0">{formatSets(ex.sets)}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {ex.share >= 0.999 ? "סטים" : `סטים עקיפים (${Math.round(ex.share * 100)}%)`}
                  </span>
                  <span className="text-[12.5px] text-foreground text-left flex-1">{ex.name}</span>
                </div>
              ))}
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-2">
              סט מלא נספר כשהשריר עיקרי בתרגיל. סט עקיף כשהוא עוזר בתרגיל שעיקרו שריר אחר, ואז נספר חלק מסט
              לפי מידת ההשתתפות.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

class ModelBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-xs text-muted-foreground">
          לא ניתן להציג את המודל התלת־ממדי. בדקו את החיבור ושהדפדפן תומך ב־WebGL.
        </p>
        <button onClick={this.props.onRetry} className="text-xs font-semibold text-primary">
          טעינה מחדש
        </button>
      </div>
    );
  }
}
