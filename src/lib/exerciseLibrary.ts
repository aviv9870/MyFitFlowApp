import { supabase } from "@/integrations/supabase/client";
import { buildFamilyIndex, NO_FAMILIES, type FamilyIndex, type LibraryExercise } from "@/domain/exerciseFamilies";

// The exercise library is a few hundred rows and changes rarely, so it is read
// once per page load and shared by everything that needs to know which
// exercises are variations of the same lift.
let library: Promise<LibraryExercise[]> | null = null;

export const loadExerciseLibrary = (): Promise<LibraryExercise[]> => {
  if (!library) {
    library = Promise.resolve(supabase.from("exercises").select("name, name_en, equipment")).then(({ data, error }) => {
      if (error) {
        library = null; // don't cache a failure: the next caller retries
        throw error;
      }
      return (data ?? []) as LibraryExercise[];
    });
  }
  return library;
};

/** Never throws: if the library can't be read, exercises simply have no siblings. */
export const loadFamilyIndex = async (): Promise<FamilyIndex> => {
  try {
    return buildFamilyIndex(await loadExerciseLibrary());
  } catch (err) {
    console.error("Exercise library unavailable, treating every exercise as its own lift:", err);
    return NO_FAMILIES;
  }
};
