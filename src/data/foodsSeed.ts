// Placeholder food data. Values are approximate typical macros per 100g,
// hand-entered as a stand-in until a real FoodsDictionary-based data source is wired in.
export interface Food {
  id: string;
  name: string;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}

export const FOODS_SEED: Food[] = [
  { id: "chicken-breast", name: "חזה עוף מבושל", caloriesPer100: 165, proteinPer100: 31, carbsPer100: 0, fatPer100: 3.6 },
  { id: "white-rice", name: "אורז לבן מבושל", caloriesPer100: 130, proteinPer100: 2.7, carbsPer100: 28, fatPer100: 0.3 },
  { id: "brown-rice", name: "אורז מלא מבושל", caloriesPer100: 112, proteinPer100: 2.6, carbsPer100: 23, fatPer100: 0.9 },
  { id: "egg", name: "ביצה שלמה", caloriesPer100: 155, proteinPer100: 13, carbsPer100: 1.1, fatPer100: 11 },
  { id: "egg-white", name: "חלבון ביצה", caloriesPer100: 52, proteinPer100: 11, carbsPer100: 0.7, fatPer100: 0.2 },
  { id: "whole-bread", name: "לחם מלא", caloriesPer100: 247, proteinPer100: 13, carbsPer100: 41, fatPer100: 3.4 },
  { id: "white-bread", name: "לחם לבן", caloriesPer100: 265, proteinPer100: 9, carbsPer100: 49, fatPer100: 3.2 },
  { id: "oats", name: "שיבולת שועל יבשה", caloriesPer100: 389, proteinPer100: 17, carbsPer100: 66, fatPer100: 7 },
  { id: "banana", name: "בננה", caloriesPer100: 89, proteinPer100: 1.1, carbsPer100: 23, fatPer100: 0.3 },
  { id: "apple", name: "תפוח", caloriesPer100: 52, proteinPer100: 0.3, carbsPer100: 14, fatPer100: 0.2 },
  { id: "avocado", name: "אבוקדו", caloriesPer100: 160, proteinPer100: 2, carbsPer100: 9, fatPer100: 15 },
  { id: "olive-oil", name: "שמן זית", caloriesPer100: 884, proteinPer100: 0, carbsPer100: 0, fatPer100: 100 },
  { id: "whey-protein", name: "אבקת חלבון מי גבינה", caloriesPer100: 380, proteinPer100: 78, carbsPer100: 8, fatPer100: 5 },
  { id: "greek-yogurt", name: "יוגורט יווני 5%", caloriesPer100: 97, proteinPer100: 9, carbsPer100: 4, fatPer100: 5 },
  { id: "cottage-5", name: "גבינה לבנה 5%", caloriesPer100: 96, proteinPer100: 11, carbsPer100: 4, fatPer100: 5 },
  { id: "tuna", name: "טונה בשימורים במים", caloriesPer100: 116, proteinPer100: 26, carbsPer100: 0, fatPer100: 1 },
  { id: "salmon", name: "סלמון מבושל", caloriesPer100: 208, proteinPer100: 20, carbsPer100: 0, fatPer100: 13 },
  { id: "sweet-potato", name: "בטטה אפויה", caloriesPer100: 90, proteinPer100: 2, carbsPer100: 21, fatPer100: 0.1 },
  { id: "broccoli", name: "ברוקולי מבושל", caloriesPer100: 35, proteinPer100: 2.4, carbsPer100: 7, fatPer100: 0.4 },
  { id: "almonds", name: "שקדים", caloriesPer100: 575, proteinPer100: 21, carbsPer100: 22, fatPer100: 49 },
  { id: "peanut-butter", name: "חמאת בוטנים", caloriesPer100: 588, proteinPer100: 25, carbsPer100: 20, fatPer100: 50 },
];
