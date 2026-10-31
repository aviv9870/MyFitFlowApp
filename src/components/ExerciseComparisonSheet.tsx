import { createPortal } from "react-dom";
import MaterialIcon from "@/components/MaterialIcon";
import { compareExercises, type ExerciseInfo, type ExerciseRelation } from "@/domain/exerciseComparison";

interface Props {
  from: ExerciseInfo;
  to: ExerciseInfo;
  onChoose: () => void;
  onClose: () => void;
}

const RELATION_STYLE: Record<ExerciseRelation, string> = {
  variation: "bg-primary/15 text-primary",
  alternative: "bg-secondary text-foreground",
  different: "bg-destructive/15 text-destructive",
};

// Bottom sheet behind the "i" button of the swap picker: how the exercise being
// replaced differs from the one the trainee is looking at, in coaching terms.
const ExerciseComparisonSheet = ({ from, to, onChoose, onClose }: Props) => {
  const comparison = compareExercises(from, to);

  // Rendered into <body>: the picker that opens this is itself a z-50 stacking
  // context, the same level as the bottom nav, so a child of it can never rise
  // above the nav - and the nav was covering the sheet's own buttons.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm" dir="rtl" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`ההבדל בין ${from.name} ל${to.name}`}
        className="w-full max-w-lg max-h-[88vh] overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border bg-card p-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-foreground">מה ההבדל?</h3>
          <button onClick={onClose} aria-label="סגירה" className="h-9 w-9 -me-2 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary/50">
            <MaterialIcon icon="close" className="text-[22px]" />
          </button>
        </div>

        <div className="rounded-xl bg-secondary/40 p-3 mb-3">
          <p className="text-[11px] text-muted-foreground">התרגיל הנוכחי</p>
          <p className="text-sm font-semibold text-foreground">{from.name}</p>
          <div className="flex items-center gap-1.5 my-1.5 text-muted-foreground">
            <MaterialIcon icon="south" className="text-[16px]" />
            <span className="text-[11px]">מוחלף ב</span>
          </div>
          <p className="text-sm font-semibold text-primary">{to.name}</p>
        </div>

        <div className="flex items-start gap-2 mb-4">
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${RELATION_STYLE[comparison.relation]}`}>
            {comparison.relationLabel}
          </span>
          <p className="text-[13px] text-foreground leading-relaxed">{comparison.headline}</p>
        </div>

        <div className="space-y-2.5">
          {comparison.points.map((point) => (
            <div key={point.title} className="flex gap-3 rounded-xl bg-secondary/30 p-3">
              <MaterialIcon icon={point.icon} className="text-primary text-[20px] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground mb-0.5">{point.title}</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{point.text}</p>
              </div>
            </div>
          ))}
        </div>

        {to.description && (
          <p className="mt-4 text-[12px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">על התרגיל: </span>
            {to.description}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onChoose} className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
            בחר בתרגיל הזה
          </button>
          <button onClick={onClose} className="rounded-xl bg-secondary px-5 py-3 text-sm font-semibold text-foreground">
            חזרה
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ExerciseComparisonSheet;
