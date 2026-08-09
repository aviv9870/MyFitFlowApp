import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Gender = "male" | "female";

export const useGender = (): Gender => {
  const { user } = useAuth();
  const [gender, setGender] = useState<Gender>("male");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("gender")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.gender === "female") setGender("female");
      });
  }, [user]);

  return gender;
};

// Gender-aware encouragement messages
export const getProgressMessages = (gender: Gender) => {
  const m = gender === "male";
  return {
    weight: [
      m ? "העלית משקל, אתה אלוף! 💪" : "העלית משקל, את אלופה! 💪",
      m ? "שיא חדש במשקל! אתה חיה! 🔥" : "שיא חדש במשקל! את חיה! 🔥",
      m ? "משקל כבד יותר? אתה צומח! 💥" : "משקל כבד יותר? את צומחת! 💥",
      m ? "יופי של התקדמות במשקל, אתה מתקדם! 🏋️" : "יופי של התקדמות במשקל, את מתקדמת! 🏋️",
      m ? "חזק! עלית במשקל מהפעם הקודמת! 👊" : "חזקה! עלית במשקל מהפעם הקודמת! 👊",
      m ? "הגוף שלך מתחזק, אתה בונה כוח! 🦾" : "הגוף שלך מתחזק, את בונה כוח! 🦾",
    ],
    reps: [
      m ? "יותר חזרות! אתה משתפר! 🔥" : "יותר חזרות! את משתפרת! 🔥",
      m ? "שיפור בחזרות! כל הכבוד! 💪" : "שיפור בחזרות! כל הכבוד! 💪",
      m ? "הסיבולת שלך עולה! מרשים! 🚀" : "הסיבולת שלך עולה! מרשים! 🚀",
      m ? "עוד חזרות = עוד שריר! 💥" : "עוד חזרות = עוד שריר! 💥",
      m ? "מצוין! עשית יותר חזרות מאשר בפעם הקודמת! ⚡" : "מצוינת! עשית יותר חזרות מאשר בפעם הקודמת! ⚡",
      m ? "אתה לא עוצר! 🏆" : "את לא עוצרת! 🏆",
    ],
  };
};
