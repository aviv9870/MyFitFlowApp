import type { Food } from "@/data/foodsSeed";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CustomFoodEntry {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealItem {
  id: string;
  // Either a reference into the foods list (scaled by grams)...
  foodId?: string;
  grams?: number;
  // ...or a coach-entered dish with fixed absolute macros (not in the foods list).
  custom?: CustomFoodEntry;
}

export interface PlanMeal {
  id: string;
  name: string;
  order: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  items: MealItem[];
}

export interface DayMeal extends PlanMeal {
  eaten: boolean;
}

const ZERO: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export const itemMacros = (item: MealItem, foodsById: Map<string, Food>): MacroTotals => {
  if (item.custom) {
    return { calories: item.custom.calories, protein: item.custom.protein, carbs: item.custom.carbs, fat: item.custom.fat };
  }
  const food = item.foodId ? foodsById.get(item.foodId) : undefined;
  if (!food || item.grams == null) return ZERO;
  const ratio = item.grams / 100;
  return {
    calories: food.caloriesPer100 * ratio,
    protein: food.proteinPer100 * ratio,
    carbs: food.carbsPer100 * ratio,
    fat: food.fatPer100 * ratio,
  };
};

const addMacros = (a: MacroTotals, b: MacroTotals): MacroTotals => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});

export const mealActualMacros = (meal: PlanMeal, foodsById: Map<string, Food>): MacroTotals =>
  meal.items.reduce((sum, item) => addMacros(sum, itemMacros(item, foodsById)), ZERO);

export const mealTargetMacros = (meal: PlanMeal): MacroTotals => ({
  calories: meal.targetCalories,
  protein: meal.targetProtein,
  carbs: meal.targetCarbs,
  fat: meal.targetFat,
});

export const dayTargetMacros = (meals: PlanMeal[]): MacroTotals =>
  meals.reduce((sum, m) => addMacros(sum, mealTargetMacros(m)), ZERO);

// Sum of actual item macros across a whole plan/day, regardless of "eaten" state —
// used by the coach builder to compare what's been entered so far against targets.
export const planActualMacros = (meals: PlanMeal[], foodsById: Map<string, Food>): MacroTotals =>
  meals.reduce((sum, m) => addMacros(sum, mealActualMacros(m, foodsById)), ZERO);

export const dayActualMacros = (meals: DayMeal[], foodsById: Map<string, Food>): MacroTotals =>
  meals.reduce((sum, m) => addMacros(sum, mealActualMacros(m, foodsById)), ZERO);

// What the trainee actually consumed today = macros of the meals they marked "eaten".
export const eatenMacros = (meals: DayMeal[], foodsById: Map<string, Food>): MacroTotals =>
  meals.filter((m) => m.eaten).reduce((sum, m) => addMacros(sum, mealActualMacros(m, foodsById)), ZERO);

// Adherence % for a single macro: how close consumed is to target, where hitting
// the target exactly = 100 and going over is penalised symmetrically (110% of
// target scores the same as 90%). Returns 0..100.
export const macroAdherencePct = (consumed: number, target: number): number => {
  if (target <= 0) return consumed <= 0 ? 100 : 0;
  const ratio = consumed / target;
  const score = 1 - Math.abs(1 - ratio);
  return Math.max(0, Math.min(100, score * 100));
};

// Overall daily adherence = average of the four macro adherence scores.
export const dayAdherencePct = (consumed: MacroTotals, target: MacroTotals): number => {
  const keys: (keyof MacroTotals)[] = ["calories", "protein", "carbs", "fat"];
  const sum = keys.reduce((acc, k) => acc + macroAdherencePct(consumed[k], target[k]), 0);
  return sum / keys.length;
};

/**
 * Dynamic offset: the day's remaining macro budget = full-day target minus what's
 * actually been eaten so far (in meals marked as eaten). Deviation from a meal's
 * own target automatically shows up here and gets absorbed by meals not yet eaten.
 */
export const remainingDayBudget = (meals: DayMeal[], foodsById: Map<string, Food>): MacroTotals => {
  const target = dayTargetMacros(meals);
  const eatenSoFar = meals.filter((m) => m.eaten).reduce((sum, m) => addMacros(sum, mealActualMacros(m, foodsById)), ZERO);
  return {
    calories: target.calories - eatenSoFar.calories,
    protein: target.protein - eatenSoFar.protein,
    carbs: target.carbs - eatenSoFar.carbs,
    fat: target.fat - eatenSoFar.fat,
  };
};

export interface UpcomingMealBudget {
  mealId: string;
  adjustedTargets: MacroTotals;
}

/**
 * Splits the remaining day budget across not-yet-eaten meals, proportionally to
 * each meal's original share of the (not-yet-eaten) target — i.e. a meal that was
 * planned to be twice as big as another still gets roughly twice the adjusted budget.
 */
export const redistributeRemainingMeals = (meals: DayMeal[], foodsById: Map<string, Food>): UpcomingMealBudget[] => {
  const upcoming = meals.filter((m) => !m.eaten);
  if (upcoming.length === 0) return [];

  const budget = remainingDayBudget(meals, foodsById);
  const plannedUpcomingTotal = upcoming.reduce((sum, m) => addMacros(sum, mealTargetMacros(m)), ZERO);

  const share = (key: keyof MacroTotals, meal: DayMeal) => {
    const planned = plannedUpcomingTotal[key];
    if (planned <= 0) return upcoming.length > 0 ? budget[key] / upcoming.length : 0;
    return budget[key] * (mealTargetMacros(meal)[key] / planned);
  };

  return upcoming.map((meal) => ({
    mealId: meal.id,
    adjustedTargets: {
      calories: share("calories", meal),
      protein: share("protein", meal),
      carbs: share("carbs", meal),
      fat: share("fat", meal),
    },
  }));
};

/**
 * Extreme deviation: all meals for the day are already eaten, but the remaining
 * budget for at least one macro is still meaningfully negative (over target) with
 * no future meal left to absorb it.
 */
export interface ExtremeDeviation {
  isExtreme: boolean;
  overages: Partial<Record<keyof MacroTotals, number>>;
}

const DEVIATION_THRESHOLD: Record<keyof MacroTotals, number> = {
  calories: 100,
  protein: 10,
  carbs: 15,
  fat: 8,
};

export const checkExtremeDeviation = (meals: DayMeal[], foodsById: Map<string, Food>): ExtremeDeviation => {
  const allEaten = meals.length > 0 && meals.every((m) => m.eaten);
  if (!allEaten) return { isExtreme: false, overages: {} };

  const budget = remainingDayBudget(meals, foodsById);
  const overages: Partial<Record<keyof MacroTotals, number>> = {};
  (Object.keys(DEVIATION_THRESHOLD) as (keyof MacroTotals)[]).forEach((key) => {
    if (budget[key] < -DEVIATION_THRESHOLD[key]) overages[key] = budget[key];
  });

  return { isExtreme: Object.keys(overages).length > 0, overages };
};
