import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/MaterialIcon";
import Nutrition from "@/pages/Nutrition";
import { getMockSessions, getMockWeightLogs, getMockMeasurements, MOCK_TRAINEE_ID } from "@/services/mockTraineeData";
import { getBasePlan } from "@/services/nutritionLocal";

// Local-only "view as trainee" simulator: shows exactly what the mock trainee
// would see after the coach builds their history/nutrition plan in /coach,
// without a real trainee account or touching Supabase.
const TrainerTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.id !== "dev-user") {
    return (
      <div className="min-h-screen bg-background pb-24 px-4 pt-6 max-w-lg mx-auto text-center">
        <MaterialIcon icon="science" className="text-muted-foreground text-[48px] mb-3" />
        <p className="text-muted-foreground text-sm">
          עמוד זה זמין רק במצב פיתוח מקומי (DEV_MODE), מול המתאמן המדומה בדשבורד המאמן.
        </p>
      </div>
    );
  }

  const sessions = getMockSessions(MOCK_TRAINEE_ID);
  const weightLogs = getMockWeightLogs(MOCK_TRAINEE_ID);
  const measurements = getMockMeasurements(MOCK_TRAINEE_ID);
  const nutritionPlan = getBasePlan(MOCK_TRAINEE_ID);

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <div className="bg-primary/15 px-4 py-3 flex items-center gap-2">
        <MaterialIcon icon="visibility" className="text-primary text-[18px]" />
        <p className="text-xs font-semibold text-primary">
          מציג תצוגת מתאמן — כך נראית האפליקציה עבור "מתאמן לדוגמה (מקומי)"
        </p>
      </div>

      <div className="px-4 pt-4">
        {sessions.length === 0 && nutritionPlan.length === 0 ? (
          <div className="glass-card p-4 mb-4 text-center">
            <MaterialIcon icon="info" className="text-muted-foreground text-[28px] mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              למתאמן הזה עדיין אין היסטוריית אימונים או תפריט תזונה. הזן/י נתוני דמו מדשבורד המאמן.
            </p>
            <button
              onClick={() => navigate("/coach")}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold"
            >
              עבור לדשבורד המאמן
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{sessions.length}</p>
              <p className="text-[9.5px] text-muted-foreground">אימונים</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{weightLogs[weightLogs.length - 1]?.weight ?? "—"}</p>
              <p className="text-[9.5px] text-muted-foreground">משקל אחרון (ק״ג)</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-foreground">{measurements.length}</p>
              <p className="text-[9.5px] text-muted-foreground">מדידות גוף</p>
            </div>
          </div>
        )}
      </div>

      {/* Live, interactive nutrition screen exactly as the trainee sees it */}
      <Nutrition traineeIdOverride={MOCK_TRAINEE_ID} />
    </div>
  );
};

export default TrainerTest;
