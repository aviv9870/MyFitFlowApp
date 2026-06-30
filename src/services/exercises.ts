import { supabase } from "@/integrations/supabase/client";

export type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  description: string | null;
  youtube_url: string | null;
};

export const fetchExercises = async (): Promise<Exercise[]> => {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, description, youtube_url")
    .order("muscle_group")
    .order("name");

  if (error) throw error;
  return data || [];
};
