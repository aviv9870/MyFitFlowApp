import React, { useMemo, useState } from "react";

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Quads"
  | "Hamstrings"
  | "Biceps"
  | "Triceps"
  | "Shoulders"
  | "Abs";

export type MuscleVolumeMap = Partial<Record<MuscleGroup, number>>;

interface InteractiveMuscleMapProps {
  volumes: MuscleVolumeMap;
  onMuscleClick?: (muscle: MuscleGroup) => void;
  className?: string;
}

interface MuscleRegion {
  id: string;
  muscle: MuscleGroup;
  d: string;
}

const ALL_MUSCLES: MuscleGroup[] = [
  "Chest",
  "Back",
  "Quads",
  "Hamstrings",
  "Biceps",
  "Triceps",
  "Shoulders",
  "Abs",
];

const MUSCLE_REGIONS: MuscleRegion[] = [
  // Front side hit-zones (left body in image)
  { id: "front-chest", muscle: "Chest", d: "M162 238 C204 204 254 200 296 234 C284 280 250 312 206 312 C178 308 162 282 162 238 Z" },
  { id: "front-shoulders", muscle: "Shoulders", d: "M122 206 C146 170 177 160 208 168 C222 176 228 192 226 212 C214 232 194 246 168 244 C146 242 130 228 122 206 Z M286 168 C318 160 350 170 374 206 C366 228 350 242 328 244 C302 246 282 232 270 212 C268 192 274 176 286 168 Z" },
  { id: "front-biceps", muscle: "Biceps", d: "M94 270 C112 252 134 250 154 268 C166 294 166 330 152 358 C132 374 108 372 92 350 C82 322 82 294 94 270 Z M342 268 C362 250 384 252 402 270 C414 294 414 322 404 350 C388 372 364 374 344 358 C330 330 330 294 342 268 Z" },
  { id: "front-abs", muscle: "Abs", d: "M198 322 C226 312 254 312 282 322 C292 352 292 414 280 456 C252 472 226 472 200 456 C188 414 188 352 198 322 Z" },
  { id: "front-quads", muscle: "Quads", d: "M190 476 C168 496 154 544 160 606 C166 674 188 726 218 734 C246 726 262 672 262 608 C262 544 248 496 226 476 C214 470 202 470 190 476 Z M254 476 C276 496 290 544 284 606 C278 674 256 726 226 734 C198 726 182 672 182 608 C182 544 196 496 218 476 C230 470 242 470 254 476 Z" },

  // Back side hit-zones (right body in image)
  { id: "back-back", muscle: "Back", d: "M628 246 C662 208 712 198 754 228 C772 278 772 362 750 426 C714 446 672 446 636 426 C614 362 612 278 628 246 Z" },
  { id: "back-shoulders", muscle: "Shoulders", d: "M588 206 C612 170 644 160 676 170 C692 180 698 194 696 214 C684 236 662 250 634 248 C612 246 596 232 588 206 Z M756 170 C788 160 820 170 844 206 C836 232 820 246 798 248 C770 250 748 236 736 214 C734 194 740 180 756 170 Z" },
  { id: "back-triceps", muscle: "Triceps", d: "M560 276 C580 256 604 256 622 278 C634 304 634 342 620 372 C600 388 578 388 562 366 C552 340 550 304 560 276 Z M816 278 C834 256 858 256 878 276 C888 304 886 340 876 366 C860 388 838 388 818 372 C804 342 804 304 816 278 Z" },
  { id: "back-hamstrings", muscle: "Hamstrings", d: "M648 488 C622 514 610 562 616 620 C622 684 644 734 674 742 C702 734 716 684 716 622 C716 562 704 514 678 488 C668 482 658 482 648 488 Z M710 488 C736 514 748 562 742 620 C736 684 714 734 684 742 C656 734 642 684 642 622 C642 562 654 514 680 488 C690 482 700 482 710 488 Z" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mixHex(colorA: string, colorB: string, amount: number): string {
  const t = clamp(amount, 0, 1);
  const a = colorA.replace("#", "");
  const b = colorB.replace("#", "");
  const ar = parseInt(a.slice(0, 2), 16);
  const ag = parseInt(a.slice(2, 4), 16);
  const ab = parseInt(a.slice(4, 6), 16);
  const br = parseInt(b.slice(0, 2), 16);
  const bg = parseInt(b.slice(2, 4), 16);
  const bb = parseInt(b.slice(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const rg = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const rb = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
  return `#${rr}${rg}${rb}`;
}

function getHeatColor(intensity: number): string {
  const t = clamp(intensity, 0, 1);
  if (t < 0.5) {
    return mixHex("#2DD4BF", "#22C55E", t / 0.5);
  }
  return mixHex("#F59E0B", "#DC2626", (t - 0.5) / 0.5);
}

function getMuscleStroke(intensity: number): string {
  const t = clamp(intensity, 0, 1);
  return mixHex("#0F172A", "#FCA5A5", t * 0.7);
}

function hexToRgba(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const InteractiveMuscleMap: React.FC<InteractiveMuscleMapProps> = ({
  volumes,
  onMuscleClick,
  className,
}) => {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [imageSrc, setImageSrc] = useState("/muscle-map-3d.png");

  const normalized = useMemo(() => {
    const maxVolume = Math.max(1, ...ALL_MUSCLES.map((m) => volumes[m] ?? 0));
    const byMuscle: Record<MuscleGroup, number> = {
      Chest: 0,
      Back: 0,
      Quads: 0,
      Hamstrings: 0,
      Biceps: 0,
      Triceps: 0,
      Shoulders: 0,
      Abs: 0,
    };

    ALL_MUSCLES.forEach((muscle) => {
      byMuscle[muscle] = (volumes[muscle] ?? 0) / maxVolume;
    });

    return byMuscle;
  }, [volumes]);

  return (
    <div className={className} style={{ width: "100%" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(180deg, #0b1020 0%, #090f1a 100%)",
          boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.25), 0 10px 36px rgba(0, 0, 0, 0.45)",
        }}
      >
        <img
          src={imageSrc}
          alt="3D anatomical muscle map"
          style={{ width: "100%", height: "auto", display: "block" }}
          onError={() => {
            if (imageSrc.endsWith(".png")) setImageSrc("/muscle-map-3d.jpg");
          }}
        />

        <svg
          viewBox="0 0 1000 900"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          role="img"
          aria-label="Interactive muscle heat overlay"
        >
          <defs>
            <filter id="overlayGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22d3ee" floodOpacity="0.6" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#38bdf8" floodOpacity="0.35" />
            </filter>
          </defs>

          {MUSCLE_REGIONS.map((region) => {
            const intensity = normalized[region.muscle];
            const heatHex = getHeatColor(intensity);
            const isActive = hoveredMuscle === region.muscle || selectedMuscle === region.muscle;
            const fill = isActive ? hexToRgba(heatHex, 0.34 + intensity * 0.24) : "rgba(0,0,0,0.001)";
            const stroke = isActive ? hexToRgba(getMuscleStroke(intensity), 0.95) : "rgba(0,0,0,0)";

            return (
              <g key={region.id}>
                <path
                  d={region.d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isActive ? 2.2 : 1}
                  filter={isActive ? "url(#overlayGlow)" : undefined}
                  style={{ cursor: "pointer", transition: "all 180ms ease" }}
                  onMouseEnter={() => setHoveredMuscle(region.muscle)}
                  onMouseLeave={() => setHoveredMuscle((prev) => (prev === region.muscle ? null : prev))}
                  onClick={() => {
                    setSelectedMuscle(region.muscle);
                    onMuscleClick?.(region.muscle);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <svg
        viewBox="0 0 320 26"
        role="img"
        aria-label="Heat scale legend"
        style={{ width: "100%", maxWidth: 340, margin: "10px auto 0", height: "auto", display: "block" }}
      >
        <defs>
          <linearGradient id="legendHeat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" />
            <stop offset="45%" stopColor="#22C55E" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#DC2626" />
          </linearGradient>
        </defs>
        <text x="6" y="16" fill="#94A3B8" fontSize="10" fontWeight={600}>LOW</text>
        <rect x="40" y="8" width="236" height="10" rx="5" fill="url(#legendHeat)" />
        <text x="286" y="16" fill="#94A3B8" fontSize="10" fontWeight={600}>HIGH</text>
      </svg>
    </div>
  );
};

export default InteractiveMuscleMap;
