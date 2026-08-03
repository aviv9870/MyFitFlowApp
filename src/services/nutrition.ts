import { supabase } from "@/integrations/supabase/client";
import type { PlanMeal, DayMeal } from "@/domain/nutrition-calculations";

export const todayKey = () => new Date().toISOString().slice(0, 10);

interface MealRow {
  id: string;
  name: string;
  order_index: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
}

interface ItemRow {
  id: string;
  meal_id: string;
  order_index: number;
  food_id: string | null;
  grams: number | null;
  custom_name: string | null;
  custom_calories: number | null;
  custom_protein: number | null;
  custom_carbs: number | null;
  custom_fat: number | null;
}

const toPlanMeal = (meal: MealRow, allItems: ItemRow[]): PlanMeal => ({
  id: meal.id,
  name: meal.name,
  order: meal.order_index,
  targetCalories: meal.target_calories,
  targetProtein: meal.target_protein,
  targetCarbs: meal.target_carbs,
  targetFat: meal.target_fat,
  items: allItems
    .filter((i) => i.meal_id === meal.id)
    .sort((a, b) => a.order_index - b.order_index)
    .map((i) =>
      i.custom_name != null
        ? {
            id: i.id,
            custom: {
              name: i.custom_name,
              calories: i.custom_calories ?? 0,
              protein: i.custom_protein ?? 0,
              carbs: i.custom_carbs ?? 0,
              fat: i.custom_fat ?? 0,
            },
          }
        : { id: i.id, foodId: i.food_id ?? undefined, grams: i.grams ?? undefined }
    ),
});

export const fetchBasePlan = async (userId: string): Promise<PlanMeal[]> => {
  const { data: meals, error } = await supabase
    .from("nutrition_meals")
    .select("*")
    .eq("user_id", userId)
    .order("order_index");
  if (error) throw error;
  if (!meals || meals.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("nutrition_meal_items")
    .select("*")
    .in("meal_id", meals.map((m) => m.id));
  if (itemsError) throw itemsError;

  return meals.map((m) => toPlanMeal(m, items ?? []));
};

// Full-replace save (mirrors the delete-then-insert pattern used for workout plans):
// simplest way to keep the coach's in-memory edit session and the DB in sync without
// diffing, and cheap enough since a trainee's nutrition plan is a handful of meals.
export const saveBasePlan = async (userId: string, meals: PlanMeal[]): Promise<void> => {
  const { error: delError } = await supabase.from("nutrition_meals").delete().eq("user_id", userId);
  if (delError) throw delError;

  for (let idx = 0; idx < meals.length; idx++) {
    const meal = meals[idx];
    const { data: inserted, error: insertError } = await supabase
      .from("nutrition_meals")
      .insert({
        user_id: userId,
        name: meal.name,
        order_index: idx,
        target_calories: meal.targetCalories,
        target_protein: meal.targetProtein,
        target_carbs: meal.targetCarbs,
        target_fat: meal.targetFat,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    if (meal.items.length > 0) {
      const itemRows = meal.items.map((item, iIdx) =>
        item.custom
          ? {
              meal_id: inserted.id,
              order_index: iIdx,
              custom_name: item.custom.name,
              custom_calories: item.custom.calories,
              custom_protein: item.custom.protein,
              custom_carbs: item.custom.carbs,
              custom_fat: item.custom.fat,
            }
          : { meal_id: inserted.id, order_index: iIdx, food_id: item.foodId, grams: item.grams }
      );
      const { error: itemsInsertError } = await supabase.from("nutrition_meal_items").insert(itemRows);
      if (itemsInsertError) throw itemsInsertError;
    }
  }
};

export const fetchTodayView = async (userId: string, date: string): Promise<DayMeal[]> => {
  const plan = await fetchBasePlan(userId);
  const { data: eatenRows, error } = await supabase
    .from("nutrition_eaten_logs")
    .select("meal_id")
    .eq("user_id", userId)
    .eq("log_date", date);
  if (error) throw error;
  const eatenIds = new Set((eatenRows ?? []).map((r) => r.meal_id));
  return plan.map((meal) => ({ ...meal, eaten: eatenIds.has(meal.id) }));
};

export const toggleMealEaten = async (userId: string, date: string, mealId: string): Promise<void> => {
  const { data: existing, error: selError } = await supabase
    .from("nutrition_eaten_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("meal_id", mealId)
    .eq("log_date", date)
    .maybeSingle();
  if (selError) throw selError;

  if (existing) {
    const { error } = await supabase.from("nutrition_eaten_logs").delete().eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("nutrition_eaten_logs")
      .insert({ user_id: userId, meal_id: mealId, log_date: date });
    if (error) throw error;
  }
};

export const recordDayAdherence = async (userId: string, date: string, adherence: number): Promise<void> => {
  const { error } = await supabase
    .from("nutrition_adherence_logs")
    .upsert({ user_id: userId, log_date: date, adherence_pct: adherence }, { onConflict: "user_id,log_date" });
  if (error) throw error;
};

export const fetchAdherenceHistory = async (
  userId: string,
  days = 7
): Promise<{ date: string; adherence: number | null }[]> => {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const { data, error } = await supabase
    .from("nutrition_adherence_logs")
    .select("log_date, adherence_pct")
    .eq("user_id", userId)
    .gte("log_date", dates[0]);
  if (error) throw error;

  const map = new Map((data ?? []).map((r) => [r.log_date, r.adherence_pct]));
  return dates.map((d) => ({ date: d, adherence: map.has(d) ? map.get(d)! : null }));
};

export const fetchAverageAdherence = async (userId: string, days = 7): Promise<number | null> => {
  const history = await fetchAdherenceHistory(userId, days);
  const points = history.filter((p) => p.adherence !== null) as { date: string; adherence: number }[];
  if (points.length === 0) return null;
  return points.reduce((a, p) => a + p.adherence, 0) / points.length;
};
