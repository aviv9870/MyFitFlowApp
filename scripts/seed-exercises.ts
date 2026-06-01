import { supabase } from "../src/integrations/supabase/client";

const exercises = [
  { name_he: "לחיצת חזה עם מוט", name_en: "Barbell Bench Press", primary_muscle: "Chest", equipment: "Barbell", video_url: "https://www.youtube.com/embed/gRVjAtPip0Y" },
  { name_he: "סקוואט עם מוט", name_en: "Barbell Squat", primary_muscle: "Legs", equipment: "Barbell", video_url: "https://www.youtube.com/embed/ultWCTKdrns" },
  { name_he: "לחיצת כתפיים בישיבה", name_en: "Seated Dumbbell Shoulder Press", primary_muscle: "Shoulders", equipment: "Dumbbell", video_url: "https://www.youtube.com/embed/qEwKCR5JCog" },
  { name_he: "חתירה במוט כפוף", name_en: "Bent Over Barbell Row", primary_muscle: "Back", equipment: "Barbell", video_url: "https://www.youtube.com/embed/RrvBqZbt14c" },
  { name_he: "כפיפת מרפקים עם מוט W", name_en: "EZ Bar Bicep Curl", primary_muscle: "Biceps", equipment: "Barbell", video_url: "https://www.youtube.com/embed/kw_2gvLH6Qw" },
  { name_he: "פשיטת מרפקים בכבלים", name_en: "Cable Tricep Pushdown", primary_muscle: "Triceps", equipment: "Cables", video_url: "https://www.youtube.com/embed/2-LAMcpzODU" },
  { name_he: "פלאנק", name_en: "Plank", primary_muscle: "Core", equipment: "Bodyweight", video_url: "https://www.youtube.com/embed/pSHjTRCQxHU" },
  { name_he: "לג פרס", name_en: "Leg Press", primary_muscle: "Legs", equipment: "Machine", video_url: "https://www.youtube.com/embed/s3yH4G7Xg-s" },
  { name_he: "משיכת פולי עליון", name_en: "Lat Pulldown", primary_muscle: "Back", equipment: "Machine", video_url: "https://www.youtube.com/embed/CAeihLAiNCU" },
  { name_he: "פרפר בכבלים", name_en: "Cable Fly", primary_muscle: "Chest", equipment: "Cables", video_url: "https://www.youtube.com/embed/I5OGPJb2u9Y" },
  // ... (You can continue adding 100s here)
];

async function seed() {
  console.log("Seeding started...");
  const { error } = await supabase.from("exercises").insert(exercises);
  if (error) {
    console.error("Error seeding:", error);
  } else {
    console.log("Successfully seeded records.");
  }
}

seed();
