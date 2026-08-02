import { describe, it, expect } from "vitest";
import {
  remainingDayBudget,
  redistributeRemainingMeals,
  checkExtremeDeviation,
  itemMacros,
  planActualMacros,
  type DayMeal,
  type PlanMeal,
} from "@/domain/nutrition-calculations";
import type { Food } from "@/data/foodsSeed";

const foods: Food[] = [
  { id: "protein-food", name: "Protein food", caloriesPer100: 200, proteinPer100: 40, carbsPer100: 0, fatPer100: 4 },
  { id: "carb-food", name: "Carb food", caloriesPer100: 130, proteinPer100: 3, carbsPer100: 28, fatPer100: 0.5 },
];
const foodsById = new Map(foods.map((f) => [f.id, f]));

const meal = (overrides: Partial<DayMeal>): DayMeal => ({
  id: "m1",
  name: "meal",
  order: 0,
  targetCalories: 500,
  targetProtein: 40,
  targetCarbs: 50,
  targetFat: 10,
  items: [],
  eaten: false,
  ...overrides,
});

describe("remainingDayBudget", () => {
  it("subtracts only eaten meals from the day target", () => {
    const meals: DayMeal[] = [
      meal({ id: "breakfast", eaten: true, items: [{ id: "i1", foodId: "protein-food", grams: 100 }] }),
      meal({ id: "lunch", eaten: false }),
    ];
    const budget = remainingDayBudget(meals, foodsById);
    // day target = 1000 cal, 80 protein; breakfast ate 200 cal / 40 protein
    expect(budget.calories).toBeCloseTo(800);
    expect(budget.protein).toBeCloseTo(40);
  });
});

describe("redistributeRemainingMeals", () => {
  it("gives an under-eaten meal's leftover budget to future meals proportionally", () => {
    const meals: DayMeal[] = [
      meal({ id: "breakfast", eaten: true, targetCalories: 500, items: [{ id: "i1", foodId: "protein-food", grams: 50 }] }), // ate 100 cal, under by 400
      meal({ id: "lunch", eaten: false, targetCalories: 500 }),
      meal({ id: "dinner", eaten: false, targetCalories: 500 }),
    ];
    const result = redistributeRemainingMeals(meals, foodsById);
    const lunch = result.find((r) => r.mealId === "lunch")!;
    const dinner = result.find((r) => r.mealId === "dinner")!;
    // remaining budget = 1500 - 100 = 1400, split evenly between two equal-target meals
    expect(lunch.adjustedTargets.calories).toBeCloseTo(700);
    expect(dinner.adjustedTargets.calories).toBeCloseTo(700);
  });

  it("returns nothing when every meal has already been eaten", () => {
    const meals: DayMeal[] = [meal({ eaten: true })];
    expect(redistributeRemainingMeals(meals, foodsById)).toEqual([]);
  });
});

describe("custom (non-database) meal items", () => {
  it("uses the coach-entered fixed macros instead of looking up a food", () => {
    const custom = { name: "מנה ביתית", calories: 420, protein: 25, carbs: 30, fat: 18 };
    const result = itemMacros({ id: "c1", custom }, foodsById);
    expect(result).toEqual({ calories: 420, protein: 25, carbs: 30, fat: 18 });
  });

  it("counts toward the plan's running totals alongside regular food items", () => {
    const meals: PlanMeal[] = [
      meal({
        items: [
          { id: "i1", foodId: "protein-food", grams: 100 }, // 200 cal
          { id: "i2", custom: { name: "מנה ביתית", calories: 300, protein: 10, carbs: 20, fat: 5 } },
        ],
      }),
    ];
    expect(planActualMacros(meals, foodsById).calories).toBeCloseTo(500);
  });
});

describe("checkExtremeDeviation", () => {
  it("flags an overage when all meals are eaten and a macro is well past target", () => {
    const meals: DayMeal[] = [
      meal({
        eaten: true,
        targetCalories: 200,
        targetCarbs: 10,
        items: [{ id: "i1", foodId: "carb-food", grams: 200 }], // 56g carbs vs target 10g
      }),
    ];
    const result = checkExtremeDeviation(meals, foodsById);
    expect(result.isExtreme).toBe(true);
    expect(result.overages.carbs).toBeLessThan(0);
  });

  it("does not flag while meals remain to absorb the deviation", () => {
    const meals: DayMeal[] = [
      meal({ id: "a", eaten: true, targetCalories: 200, items: [{ id: "i1", foodId: "carb-food", grams: 200 }] }),
      meal({ id: "b", eaten: false }),
    ];
    expect(checkExtremeDeviation(meals, foodsById).isExtreme).toBe(false);
  });
});
