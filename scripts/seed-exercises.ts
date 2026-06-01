import { supabase } from "../src/integrations/supabase/client";

const exercises = [
  // Chest (15)
  { name_he: "לחיצת חזה עם מוט", name_en: "Barbell Bench Press", primary_muscle: "Chest", equipment: "Barbell", video_url: "https://www.youtube.com/embed/gRVjAtPip0Y" },
  { name_he: "לחיצת חזה משקולות", name_en: "Dumbbell Press", primary_muscle: "Chest", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/Vm1C9L6gA8c" },
  { name_he: "שיפוע חיובי מוט", name_en: "Incline Barbell Press", primary_muscle: "Chest", equipment: "Barbell", video_url: "https://www.youtube.com/embed/SdBBMn0b-7E" },
  { name_he: "שיפוע חיובי משקולות", name_en: "Incline Dumbbell Press", primary_muscle: "Chest", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/8iP1qxYDsnk" },
  { name_he: "פרפר בכבלים", name_en: "Cable Fly", primary_muscle: "Chest", equipment: "Cables", video_url: "https://www.youtube.com/embed/I5OGPJb2u9Y" },
  { name_he: "מקבילים", name_en: "Dips", primary_muscle: "Chest", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/2z8JmcrW-As" },
  { name_he: "פרפר מכונה", name_en: "Pec Deck", primary_muscle: "Chest", equipment: "Machine", video_url: "https://www.youtube.com/embed/Q8D9zD1p-Rk" },
  { name_he: "לחיצת חזה משקולות שיפוע שלילי", name_en: "Decline Dumbbell Press", primary_muscle: "Chest", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/LGGexnLfYM0" },
  { name_he: "לחיצת חזה צרה", name_en: "Close Grip Bench Press", primary_muscle: "Chest", equipment: "Barbell", video_url: "https://www.youtube.com/embed/n4H2Gf75m0M" },
  { name_he: "לחיצה במכונה", name_en: "Chest Press Machine", primary_muscle: "Chest", equipment: "Machine", video_url: "https://www.youtube.com/embed/W1R8-0V2oYk" },
  { name_he: "שכיבות סמיכה", name_en: "Push Ups", primary_muscle: "Chest", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/IOry5JtmyII" },
  { name_he: "פרפר משקולות", name_en: "Dumbbell Fly", primary_muscle: "Chest", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/eozdVDA78K0" },
  { name_he: "פולאובר משקולת", name_en: "Dumbbell Pullover", primary_muscle: "Chest", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/hB5J1Rz_o4w" },
  { name_he: "פרפר כבלים גבוה", name_en: "High Cable Fly", primary_muscle: "Chest", equipment: "Cables", video_url: "https://www.youtube.com/embed/p1uYaE6PGeA" },
  { name_he: "פרפר כבלים נמוך", name_en: "Low Cable Fly", primary_muscle: "Chest", equipment: "Cables", video_url: "https://www.youtube.com/embed/uG5zZp0y6iI" },

  // Back (20)
  { name_he: "חתירה מוט", name_en: "Barbell Row", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/RrvBqZbt14c" },
  { name_he: "פולי עליון", name_en: "Lat Pulldown", primary_muscle: "Back", equipment: "Machine", video_url: "https://www.youtube.com/embed/CAeihLAiNCU" },
  { name_he: "מתח", name_en: "Pull Ups", primary_muscle: "Back", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/eGo4IYlbE5g" },
  { name_he: "חתירה בכבלים", name_en: "Seated Cable Row", primary_muscle: "Back", equipment: "Cables", video_url: "https://www.youtube.com/embed/tv5u32M1q6E" },
  { name_he: "חתירה משקולת", name_en: "Dumbbell Row", primary_muscle: "Back", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/pQB-u-KZsw8" },
  { name_he: "דדליפט מוט", name_en: "Deadlift", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/XxWblDnabsE" },
  { name_he: "חתירה טי-בר", name_en: "T-Bar Row", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/j3IgSe5ZQcU" },
  { name_he: "פולאובר כבלים", name_en: "Cable Pullover", primary_muscle: "Back", equipment: "Cables", video_url: "https://www.youtube.com/embed/6iW_i93XUuM" },
  { name_he: "מתח צר", name_en: "Close Grip Pull Ups", primary_muscle: "Back", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/I63-jB86y-w" },
  { name_he: "חתירה במכונה", name_en: "Machine Row", primary_muscle: "Back", equipment: "Machine", video_url: "https://www.youtube.com/embed/wE-H-4-J2G4" },
  { name_he: "שראגס מוט", name_en: "Barbell Shrugs", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/UJ5R5933C40" },
  { name_he: "שראגס משקולות", name_en: "Dumbbell Shrugs", primary_muscle: "Back", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/g2J6U_z6_o0" },
  { name_he: "חתירה במכונה אחיזה רחבה", name_en: "Wide Grip Row", primary_muscle: "Back", equipment: "Machine", video_url: "https://www.youtube.com/embed/i9JdE6221s8" },
  { name_he: "משיכת פולי אחיזה צרה", name_en: "Close Grip Lat Pulldown", primary_muscle: "Back", equipment: "Cables", video_url: "https://www.youtube.com/embed/K9151nbi69Y" },
  { name_he: "פאוור קלין", name_en: "Power Clean", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/m6l1HjK5aZg" },
  { name_he: "דדליפט סומו", name_en: "Sumo Deadlift", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/hTVj8ZtXYOc" },
  { name_he: "חתירה רנגייד", name_en: "Renegade Row", primary_muscle: "Back", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/hJ8yL0Qx-oQ" },
  { name_he: "פייס פולס (גב עליון)", name_en: "Face Pulls", primary_muscle: "Back", equipment: "Cables", video_url: "https://www.youtube.com/embed/V6V0S9S1H_Y" },
  { name_he: "היפר-אקסטנשן", name_en: "Back Extension", primary_muscle: "Back", equipment: "Machine", video_url: "https://www.youtube.com/embed/zH8w7n7c12I" },
  { name_he: "חתירה בהטיה", name_en: "Incline Dumbbell Row", primary_muscle: "Back", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/b0uK98b6p60" },

  // Legs (20)
  { name_he: "סקוואט מוט", name_en: "Barbell Squat", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/ultWCTKdrns" },
  { name_he: "לג פרס", name_en: "Leg Press", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/s3yH4G7Xg-s" },
  { name_he: "מכרעים", name_en: "Lunges", primary_muscle: "Legs", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/M0TfN7aA-qQ" },
  { name_he: "סקוואט בולגרי", name_en: "Bulgarian Split Squat", primary_muscle: "Legs", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/2C-uNgKwPLE" },
  { name_he: "דדליפט רומני", name_en: "RDL", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/JCw46S4jVqc" },
  { name_he: "פשיטת ברכיים", name_en: "Leg Extension", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/YyvSfVjQeL0" },
  { name_he: "כפיפת ברכיים שכיבה", name_en: "Leg Curl", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/1Tq3Qdqi0MA" },
  { name_he: "הרמת עקבים", name_en: "Calf Raises", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/s2R2sH2SWCc" },
  { name_he: "סקוואט גובלט", name_en: "Goblet Squat", primary_muscle: "Legs", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/MeiDq7-XG_s" },
  { name_he: "סקוואט מול חזה", name_en: "Front Squat", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/oD2P7Ucyw_M" },
  { name_he: "לחיצת רגליים בודדת", name_en: "Single Leg Press", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/tM66QYn2v94" },
  { name_he: "מכרעים עם מוט", name_en: "Barbell Lunges", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/bT1_H-N4Vv8" },
  { name_he: "כפיפת ברכיים בישיבה", name_en: "Seated Leg Curl", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/fA545t8Z5xI" },
  { name_he: "סומו סקוואט", name_en: "Sumo Squat", primary_muscle: "Legs", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/XqV6N_9TjU8" },
  { name_he: "הרמת תאומים בישיבה", name_en: "Seated Calf Raise", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/23_vA5S4uP4" },
  { name_he: "סקוואט רגל אחת", name_en: "Pistol Squat", primary_muscle: "Legs", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/MWWn3sB9f7g" },
  { name_he: "דדליפט רגליים ישרות", name_en: "Stiff Leg Deadlift", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/1uZoLsQii5g" },
  { name_he: "סקוואט בוקס", name_en: "Box Squat", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/11Bq3U6tXjg" },
  { name_he: "מכרעים צדיים", name_en: "Side Lunges", primary_muscle: "Legs", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/Q4S2N4F48nQ" },
  { name_he: "הרמות ירך במכונה", name_en: "Hip Abduction", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/n_03xY_Qe0E" },

  // Shoulders (15)
  { name_he: "לחיצת כתפיים מוט", name_en: "Overhead Press", primary_muscle: "Shoulders", equipment: "Barbell", video_url: "https://www.youtube.com/embed/QA7MPPT55yQ" },
  { name_he: "לחיצת כתפיים משקולות", name_en: "Dumbbell Shoulder Press", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/qEwKCR5JCog" },
  { name_he: "הרחקת זרועות לצדדים", name_en: "Dumbbell Lateral Raise", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/3VcKaXpzqRo" },
  { name_he: "לחיצת ארנולד", name_en: "Arnold Press", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/6iQcK4gO-G0" },
  { name_he: "הרמה לפנים", name_en: "Front Raise", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/hJ8yL0Qx-oQ" },
  { name_he: "הרחקה בשיפוע", name_en: "Bent Over Lateral Raise", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/H3M0l-0E2C8" },
  { name_he: "לחיצה במכונה", name_en: "Machine Shoulder Press", primary_muscle: "Shoulders", equipment: "Machine", video_url: "https://www.youtube.com/embed/0G27VpU7w0A" },
  { name_he: "הרמת זרועות בכבלים", name_en: "Cable Side Raise", primary_muscle: "Shoulders", equipment: "Cables", video_url: "https://www.youtube.com/embed/h6f3H-83VdM" },
  { name_he: "חתירה זקופה", name_en: "Upright Row", primary_muscle: "Shoulders", equipment: "Barbell", video_url: "https://www.youtube.com/embed/wXJ9_n48H8c" },
  { name_he: "הרחקה אחורית במכונה", name_en: "Rear Delt Fly", primary_muscle: "Shoulders", equipment: "Machine", video_url: "https://www.youtube.com/embed/0d13hP3f-5M" },
  { name_he: "הרמה לפנים בכבל", name_en: "Cable Front Raise", primary_muscle: "Shoulders", equipment: "Cables", video_url: "https://www.youtube.com/embed/0Ua_C0lR_hQ" },
  { name_he: "לחיצת כתפיים בודדת", name_en: "Single Arm Press", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/a7S45t8Z5xI" },
  { name_he: "הרחקה בודדת לצידיים", name_en: "Single Cable Raise", primary_muscle: "Shoulders", equipment: "Cables", video_url: "https://www.youtube.com/embed/tM66QYn2v94" },
  { name_he: "בוקסרס", name_en: "Landmine Press", primary_muscle: "Shoulders", equipment: "Barbell", video_url: "https://www.youtube.com/embed/D3M1I8rT0Ww" },
  { name_he: "הרמות כתפיים עם רצועות", name_en: "Band Lateral Raise", primary_muscle: "Shoulders", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/bT1_H-N4Vv8" },

  // Biceps (15)
  { name_he: "כפיפת מוט", name_en: "Barbell Curl", primary_muscle: "Biceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/kw_2gvLH6Qw" },
  { name_he: "כפיפת משקולות", name_en: "Dumbbell Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/ykJmrZ5v0OE" },
  { name_he: "כפיפת פטישים", name_en: "Hammer Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/zC3nLlEvin4" },
  { name_he: "כפיפת פריצ'ר", name_en: "Preacher Curl", primary_muscle: "Biceps", equipment: "Machine", video_url: "https://www.youtube.com/embed/fIWPyoaHS6I" },
  { name_he: "כפיפת כבלים", name_en: "Cable Curl", primary_muscle: "Biceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/xL2a55v5_3s" },
  { name_he: "כפיפה בהטיה", name_en: "Incline Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/soxrZlTRn8s" },
  { name_he: "כפיפת קונסנטרציה", name_en: "Concentration Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/0G27VpU7w0A" },
  { name_he: "כפיפה 21", name_en: "21s Curl", primary_muscle: "Biceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/Q4S2N4F48nQ" },
  { name_he: "כפיפה במכונה", name_en: "Machine Curl", primary_muscle: "Biceps", equipment: "Machine", video_url: "https://www.youtube.com/embed/3VcKaXpzqRo" },
  { name_he: "כפיפה הפוכה לזרועות", name_en: "Reverse Barbell Curl", primary_muscle: "Biceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/d_KZxKVb-wA" },
  { name_he: "כפיפה בודדת כבל", name_en: "Single Arm Cable Curl", primary_muscle: "Biceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/6ja5Wxl-FAY" },
  { name_he: "כפיפה בודדת משקולת", name_en: "Single Arm DB Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/23_vA5S4uP4" },
  { name_he: "כפיפה מעל הראש בכבל", name_en: "High Cable Curl", primary_muscle: "Biceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/0Ua_C0lR_hQ" },
  { name_he: "כפיפה במכונת כבלים", name_en: "Crossover Curl", primary_muscle: "Biceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/vOjtJ856x40" },
  { name_he: "כפיפה בהישענות", name_en: "Supported Curl", primary_muscle: "Biceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/V6V0S9S1H_Y" },

  // Triceps (15)
  { name_he: "לחיצה צרפתית", name_en: "Skull Crusher", primary_muscle: "Triceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/d_KZxKVb-wA" },
  { name_he: "פשיטה בכבלים", name_en: "Cable Pushdown", primary_muscle: "Triceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/2-LAMcpzODU" },
  { name_he: "פשיטה מעל הראש", name_en: "Overhead Extension", primary_muscle: "Triceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/YbPq64J1J1s" },
  { name_he: "מקבילים יד אחורית", name_en: "Bench Dips", primary_muscle: "Triceps", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/wK-56nLw-4g" },
  { name_he: "פשיטה בודדת - קיק באק", name_en: "Kickback", primary_muscle: "Triceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/6ja5Wxl-FAY" },
  { name_he: "פשיטה בכבל מעל הראש", name_en: "High Cable Extension", primary_muscle: "Triceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/F4S2N4F48nQ" },
  { name_he: "לחיצה צרה מוט", name_en: "Close Grip Press", primary_muscle: "Triceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/n4H2Gf75m0M" },
  { name_he: "פשיטה בחבל", name_en: "Rope Pushdown", primary_muscle: "Triceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/vOjtJ856x40" },
  { name_he: "לחיצה צרה משקולות", name_en: "Close Grip DB Press", primary_muscle: "Triceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/oD2P7Ucyw_M" },
  { name_he: "פשיטה במכונה", name_en: "Machine Extension", primary_muscle: "Triceps", equipment: "Machine", video_url: "https://www.youtube.com/embed/YyvSfVjQeL0" },
  { name_he: "פשיטה בודדת במכונה", name_en: "Single Tricep Machine", primary_muscle: "Triceps", equipment: "Machine", video_url: "https://www.youtube.com/embed/1Tq3Qdqi0MA" },
  { name_he: "פשיטה מוט W בשכיבה", name_en: "EZ Bar Skull Crusher", primary_muscle: "Triceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/d_KZxKVb-wA" },
  { name_he: "פשיטה כבל בישיבה", name_en: "Seated Cable Extension", primary_muscle: "Triceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/qEwKCR5JCog" },
  { name_he: "לחיצה צרה בודדת", name_en: "Single arm DB Press", primary_muscle: "Triceps", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/0G27VpU7w0A" },
  { name_he: "פשיטה עם רצועות", name_en: "Band Extension", primary_muscle: "Triceps", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/2C-uNgKwPLE" },

  // Core (10)
  { name_he: "פלאנק", name_en: "Plank", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/pSHjTRCQxHU" },
  { name_he: "כפיפות בטן", name_en: "Crunch", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/Xyd_fa5zoEU" },
  { name_he: "הרמת רגליים", name_en: "Leg Raise", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/ukScHq-1A-o" },
  { name_he: "כפיפות בכבל", name_en: "Cable Crunch", primary_muscle: "Core", equipment: "Cables", video_url: "https://www.youtube.com/embed/E-12vA2L90E" },
  { name_he: "סיבוב רוסי", name_en: "Russian Twist", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/wkDDRq-j1zk" },
  { name_he: "אופניים בטן", name_en: "Bicycle Crunch", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/bNSUwv5L4P4" },
  { name_he: "הרמת רגליים בשכיבה", name_en: "Lying Leg Raise", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/JB2icHR0uQc" },
  { name_he: "פלאנק צדי", name_en: "Side Plank", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/oXylOnhL3vI" },
  { name_he: "טיפוס הרים", name_en: "Mountain Climbers", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/lCgY07rZ_2o" },
  { name_he: "מתיחות בטן במכונה", name_en: "Ab Machine", primary_muscle: "Core", equipment: "Machine", video_url: "https://www.youtube.com/embed/fA545t8Z5xI" }
];

async function seed() {
  console.log("Seeding started...");
  // Clear existing to avoid duplicates while testing
  const { data: existing } = await supabase.from("exercises").select("*");
  if (existing && existing.length > 0) {
    console.log("Clearing existing exercises...");
    await supabase.from("exercises").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Dummy condition to delete all
  }
  const { error } = await supabase.from("exercises").insert(exercises);
  if (error) {
    console.error("Error seeding:", error);
  } else {
    console.log(`Successfully seeded ${exercises.length} records.`);
  }
}

seed();
