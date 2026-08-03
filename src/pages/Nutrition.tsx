import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import { FOODS_SEED } from "@/data/foodsSeed";
import {
  mealActualMacros,
  mealTargetMacros,
  dayTargetMacros,
  dayActualMacros,
  eatenMacros,
  dayAdherencePct,
  remainingDayBudget,
  redistributeRemainingMeals,
  checkExtremeDeviation,
  type DayMeal,
  type MacroTotals,
} from "@/domain/nutrition-calculations";
import { fetchTodayView, toggleMealEaten, recordDayAdherence, todayKey } from "@/services/nutrition";
import * as nutritionLocal from "@/services/nutritionLocal";
import { MOCK_TRAINEE_ID } from "@/services/mockTraineeData";
import AdherenceTrend from "@/components/AdherenceTrend";

const MACRO_LABELS: { key: keyof MacroTotals; label: string; unit: string }[] = [
  { key: "calories", label: "קלוריות", unit: "" },
  { key: "protein", label: "חלבון", unit: "ג׳" },
  { key: "carbs", label: "פחמימה", unit: "ג׳" },
  { key: "fat", label: "שומן", unit: "ג׳" },
];

const round = (n: number) => Math.round(n);

interface Props {
  onClose?: () => void;
  // Overrides whose nutrition data is shown — used to preview another
  // trainee's plan (e.g. from /trainer-test) instead of the logged-in user's.
  traineeIdOverride?: string;
}

// Read-only for the trainee: the coach owns the plan (what meals/items exist,
// in what quantities) — the only thing the trainee controls is marking a meal
// "eaten". Since there's no separate trainee-owned copy of the plan, any
// change the coach makes (including deleting something) shows up immediately.
const Nutrition = ({ onClose, traineeIdOverride }: Props) => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<DayMeal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adherenceTick, setAdherenceTick] = useState(0);

  const foodsById = useMemo(() => new Map(FOODS_SEED.map((f) => [f.id, f])), []);
  const today = todayKey();
  const traineeId = traineeIdOverride ?? user?.id;

  const isMock = traineeId === MOCK_TRAINEE_ID;

  useEffect(() => {
    if (!traineeId) return;
    setLoaded(false);
    if (isMock) {
      setMeals(nutritionLocal.getTodayView(traineeId, today));
      setLoaded(true);
      return;
    }
    fetchTodayView(traineeId, today)
      .then(setMeals)
      .catch((err) => console.error(err))
      .finally(() => setLoaded(true));
  }, [traineeId, today, isMock]);

  const toggleEaten = async (mealId: string) => {
    if (!traineeId) return;
    let updated: DayMeal[];
    if (isMock) {
      nutritionLocal.toggleMealEaten(traineeId, today, mealId);
      updated = nutritionLocal.getTodayView(traineeId, today);
    } else {
      await toggleMealEaten(traineeId, today, mealId);
      updated = await fetchTodayView(traineeId, today);
    }
    setMeals(updated);
    // Snapshot today's adherence so it feeds the weekly trend.
    const consumed = eatenMacros(updated, foodsById);
    const target = dayTargetMacros(updated);
    const adherence = dayAdherencePct(consumed, target);
    if (isMock) nutritionLocal.recordDayAdherence(traineeId, today, adherence);
    else await recordDayAdherence(traineeId, today, adherence);
    setAdherenceTick((t) => t + 1);
  };

  const dayTarget = dayTargetMacros(meals);
  const dayActual = dayActualMacros(meals, foodsById);
  const budget = remainingDayBudget(meals, foodsById);
  const adjusted = redistributeRemainingMeals(meals, foodsById);
  const deviation = checkExtremeDeviation(meals, foodsById);

  const adjustedFor = (mealId: string) => adjusted.find((a) => a.mealId === mealId)?.adjustedTargets;

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
            <MaterialIcon icon="arrow_forward" className="text-foreground text-[24px]" />
          </button>
        )}
        <h1 className="text-xl font-bold text-foreground">תזונה</h1>
      </div>

      {meals.length === 0 ? (
        <div className="text-center mt-16">
          <MaterialIcon icon="restaurant" className="text-muted-foreground text-[48px] mb-3" />
          <p className="text-muted-foreground text-sm">המאמן שלך עדיין לא בנה תפריט בסיס</p>
        </div>
      ) : (
        <>
          {deviation.isExtreme && (
            <div className="bg-destructive/15 border border-destructive/40 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MaterialIcon icon="warning" className="text-destructive text-[20px]" />
                <h3 className="text-sm font-bold text-destructive">חריגה משמעותית מהיעד היומי</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                {MACRO_LABELS.filter((m) => deviation.overages[m.key] !== undefined).map((m) => (
                  <span key={m.key} className="text-xs font-semibold text-destructive">
                    {m.label}: {round(deviation.overages[m.key]!)}{m.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Day summary */}
          <div className="glass-card p-4 mb-4">
            <h3 className="text-sm font-bold text-foreground mb-3">סיכום יומי</h3>
            <div className="grid grid-cols-4 gap-2">
              {MACRO_LABELS.map((m) => (
                <div key={m.key} className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                  <p className="text-sm font-bold text-foreground">
                    {round(dayActual[m.key])}<span className="text-muted-foreground">/{round(dayTarget[m.key])}</span>
                  </p>
                  <p className={`text-[10px] font-semibold mt-0.5 ${budget[m.key] < 0 ? "text-destructive" : "text-primary"}`}>
                    {budget[m.key] >= 0 ? "נותר " : ""}{round(budget[m.key])}{m.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly adherence trend */}
          {traineeId && (
            <div className="mb-4">
              <AdherenceTrend traineeId={traineeId} refreshKey={adherenceTick} isMock={isMock} />
            </div>
          )}

          {/* Meals */}
          <div className="space-y-3">
            {meals
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((meal) => {
                const actual = mealActualMacros(meal, foodsById);
                const target = adjustedFor(meal.id) ?? mealTargetMacros(meal);
                return (
                  <div key={meal.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-foreground">{meal.name}</h4>
                      <button
                        onClick={() => toggleEaten(meal.id)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          meal.eaten ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        <MaterialIcon icon={meal.eaten ? "check_circle" : "radio_button_unchecked"} className="text-[14px]" />
                        {meal.eaten ? "נאכל" : "טרם נאכל"}
                      </button>
                    </div>

                    <div className="space-y-1.5 mb-2">
                      {meal.items.map((item) => {
                        if (item.custom) {
                          return (
                            <div key={item.id} className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                              <span className="flex-1 text-xs text-foreground">{item.custom.name}</span>
                              <span className="text-[10px] text-muted-foreground">{Math.round(item.custom.calories)} קל׳</span>
                            </div>
                          );
                        }
                        const food = item.foodId ? foodsById.get(item.foodId) : undefined;
                        if (!food) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                            <span className="flex-1 text-xs text-foreground">{food.name}</span>
                            <span className="text-[10px] text-muted-foreground">{item.grams} ג׳</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2 hairline-t">
                      {MACRO_LABELS.map((m) => (
                        <span key={m.key} className="text-[10px] text-muted-foreground">
                          {m.label}: <span className="text-foreground font-semibold">{round(actual[m.key])}</span>/{round(target[m.key])}{m.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

export default Nutrition;
