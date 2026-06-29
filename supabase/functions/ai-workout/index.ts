import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = "";
    let userPrompt = "";
    let toolName = "";
    let toolParams: any = {};

    if (type === "analyze") {
      const { history } = body;
      systemPrompt = `אתה מאמן כושר מקצועי. נתח את היסטוריית האימונים של המשתמש ותן תובנות קצרות וממוקדות בעברית. התמקד במגמות, שיפורים, ותחומים לשיפור.`;
      userPrompt = `היסטוריית אימונים:\n${JSON.stringify(history)}`;
      toolName = "provide_analysis";
      toolParams = {
        type: "object",
        properties: {
          insights: { type: "array", items: { type: "string" } },
          recommendation: { type: "string" },
        },
        required: ["insights", "recommendation"],
        additionalProperties: false,
      };
    } else if (type === "generate_plan") {
      const { goal, daysPerWeek, sessionDuration, focusMuscles, history } = body;
      systemPrompt = `אתה מאמן כושר מקצועי שיוצר תוכניות אימון מותאמות אישית בעברית. 
חשוב מאוד: השתמש רק בשמות תרגילים מהרשימה הבאה (בעברית בלבד):
חזה: לחיצת חזה עם מוט, לחיצת חזה עם משקולות יד, לחיצת חזה בשיפוע חיובי (מוט), לחיצת חזה בשיפוע חיובי (משקולות), לחיצת חזה בשיפוע שלילי, פרפר עם משקולות יד, פרפר במכונה (Pec Deck), קרוס-אובר כבלים (גבוה), קרוס-אובר כבלים (נמוך), לחיצת חזה במכונה (Chest Press), שכיבות סמיכה (קלאסי), מקבילים רחב (דגש חזה), לחיצת חזה במכונת סמית׳
גב: מתח באחיזה רחבה, מתח באחיזה צרה (צ׳ין אפס), פולי עליון באחיזה רחבה, פולי עליון באחיזה צרה (ידית V), חתירה במוט (Bent Over Row), חתירה עם משקולת יד (מסור), חתירה במכונה בישיבה, חתירה בכבלים (Seated Row), חתירה במוט T (T-Bar Row), פול-אובר בכבלים (ידיים ישרות), דדליפט קלאסי, פשיטת גב במכשיר (Hyper-extension), דדליפט סומו
כתפיים: לחיצת כתפיים עם מוט (עמידה), לחיצת כתפיים עם משקולות (ישיבה), לחיצת ארנולד, הרחקת זרועות לצדדים (משקולות), הרחקת זרועות בכבלים, כפיפת כתפיים לפנים (משקולות), פייס-פולס (Face Pulls), פרפר הפוך במכונה, פרפר הפוך בהטיה (משקולות), חתירה אנכית (Upright Row), שראגס (Shrugs)
רגליים: סקוואט עם מוט אחורי, סקוואט קדמי (Front Squat), סקוואט גובלט (משקולת יד), לחיצת רגליים (Leg Press), מכרעים (Lunges) בהליכה, מכרעים סטטיים (לאנג׳ים), סקוואט בולגרי, פשיטת ברכיים במכונה, כפיפת ברכיים בשכיבה, כפיפת ברכיים בישיבה, דדליפט רומני (RDL), היפ-תראסט (Hip Thrust), הרמת תאומים בעמידה, הרמת תאומים בישיבה, סקוואט האק (Hack Squat), אבדוקטור (הרחקה) במכונה, אדוקטור (קירוב) במכונה
יד קדמית: כפיפת מרפקים עם מוט W, כפיפת מרפקים עם משקולות יד, כפיפת מרפקים ב"פטישים", כפיפת מרפקים בפריצ׳ר (כומר), כפיפת מרפקים בכבלים (חבל), כפיפת מרפקים בריכוז (Concentration)
יד אחורית: פשיטת מרפקים בכבלים (מוט), פשיטת מרפקים בכבלים (חבל), לחיצה צרפתית (Skull Crushers), פשיטת מרפק מעל הראש (משקולת), לחיצת חזה באחיזה צרה, מקבילים צר
בטן: כפיפות בטן (Crunches), הרמת רגליים בשכיבה, הרמת רגליים בתלייה, פלאנק (Plank), "אופניים" בבטן, גלגל בטן (Ab Wheel), רוסיאן טוויסט

בנה תוכנית אימון לפי הפרמטרים שהמשתמש ביקש.`;

      userPrompt = `מטרה: ${goal}
ימי אימון בשבוע: ${daysPerWeek ?? 4}
זמן כל אימון: ${sessionDuration ?? 60} דקות
${focusMuscles?.length > 0 ? `שרירים למיקוד: ${focusMuscles.join(", ")}` : "ללא מיקוד ספציפי"}
היסטוריית אימונים: ${JSON.stringify(history ?? [])}`;

      toolName = "provide_plan";
      toolParams = {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                target_sets: { type: "number" },
                rest_seconds: { type: "number" },
              },
              required: ["name", "target_sets", "rest_seconds"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "description", "exercises"],
        additionalProperties: false,
      };
    } else if (type === "analyze_measurements") {
      const { measurements } = body;
      systemPrompt = `אתה מאמן כושר ותזונאי מקצועי. נתח את מדידות הגוף של המשתמש לאורך זמן ותן תובנות מפורטות בעברית. השווה בין מדידות, זהה מגמות, ותן המלצות לשיפור.`;
      userPrompt = `מדידות גוף:\n${JSON.stringify(measurements)}`;
      toolName = "provide_measurement_analysis";
      toolParams = {
        type: "object",
        properties: {
          summary: { type: "string" },
          changes: { type: "array", items: { type: "object", properties: { area: { type: "string" }, change: { type: "string" }, trend: { type: "string" } }, required: ["area", "change", "trend"], additionalProperties: false } },
          recommendation: { type: "string" },
        },
        required: ["summary", "changes", "recommendation"],
        additionalProperties: false,
      };
    } else if (type === "analyze_single_workout") {
      const { workout, genderContext } = body;
      const prContext = workout.personalRecords?.length
        ? `\nשיאים אישיים שנשברו באימון הזה: ${JSON.stringify(workout.personalRecords)}. ציין את השיאים האלה בתובנות שלך והצף אותם!`
        : "";
      systemPrompt = `אתה מאמן כושר מקצועי. נתח את האימון הספציפי הזה ותן תובנות קצרות וממוקדות בעברית. ${genderContext ?? "פנה אל המשתמש בלשון זכר."} התמקד בביצוע, נפח, ונקודות לשיפור.${prContext}`;
      userPrompt = `נתוני אימון:\n${JSON.stringify(workout)}`;
      toolName = "provide_analysis";
      toolParams = {
        type: "object",
        properties: {
          insights: { type: "array", items: { type: "string" } },
          recommendation: { type: "string" },
        },
        required: ["insights", "recommendation"],
        additionalProperties: false,
      };
    } else if (type === "coach_report") {
      const { traineeName, history } = body;
      systemPrompt = `אתה מאמן כושר מקצועי שכותב דוחות אימון מותאמים אישית למתאמנים שלו. כתוב דוח שנשמע כאילו המאמן עצמו כותב אותו ישירות למתאמן. פנה למתאמן בגוף שני ("אתה עשית", "התקדמת", "אני רואה ש..."). הדוח צריך לכלול: סיכום ביצועים אחרונים, נקודות חוזקה, תחומים לשיפור, והמלצות ספציפיות. כתוב בעברית, בטון חם ומקצועי, כמו מאמן שמדבר למתאמן שלו. אל תשתמש בכוכביות או בפורמט מרקדאון - כתוב טקסט רגיל בלבד עם שורות חדשות.`;
      userPrompt = `שם המתאמן: ${traineeName}\nהיסטוריית אימונים:\n${JSON.stringify(history)}`;
      toolName = "provide_report";
      toolParams = {
        type: "object",
        properties: {
          report: { type: "string" },
        },
        required: ["report"],
        additionalProperties: false,
      };
    } else if (type === "chat") {
      const { question, history } = body;
      systemPrompt = `אתה מאמן כושר מקצועי ותזונאי. ענה על שאלות המשתמש בעברית בצורה קצרה וממוקדת. יש לך גישה להיסטוריית האימונים שלו. ענה בפסקה אחת קצרה.`;
      userPrompt = `היסטוריית אימונים:\n${JSON.stringify(history)}\n\nשאלת המשתמש: ${question}`;
      toolName = "provide_answer";
      toolParams = {
        type: "object",
        properties: {
          answer: { type: "string" },
        },
        required: ["answer"],
        additionalProperties: false,
      };
    } else {
      throw new Error("Unknown type: " + type);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolName,
              description: `Provide ${type} data`,
              parameters: toolParams,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד רגע" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש חידוש מנוי" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    const message = isTimeout ? "הבקשה לשרת AI לא הושלמה בזמן, נסה שוב" : (e instanceof Error ? e.message : "Unknown error");
    return new Response(JSON.stringify({ error: message }), {
      status: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
