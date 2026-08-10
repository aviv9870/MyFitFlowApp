import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.0-flash";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const CEREBRAS_MODEL = "gpt-oss-120b";

// Groq and Cerebras both expose an OpenAI-compatible chat/completions API
// with function calling, so they share this implementation.
async function callOpenAICompatible(
  providerName: string,
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolParams: any,
  signal: AbortSignal,
): Promise<any> {
  const response = await fetch(baseUrl, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: toolName,
            description: `Provide ${toolName} data`,
            parameters: toolParams,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: toolName } },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`${providerName} error:`, response.status, text);
    const err = new Error(`${providerName} API error: ` + response.status) as any;
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    console.error(`Unexpected ${providerName} response:`, JSON.stringify(data));
    throw new Error(`תגובה לא צפויה מ-${providerName}`);
  }

  return JSON.parse(toolCall.function.arguments);
}

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolParams: any,
  signal: AbortSignal,
): Promise<any> {
  return callOpenAICompatible(
    "Groq",
    "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    GROQ_MODEL,
    systemPrompt,
    userPrompt,
    toolName,
    toolParams,
    signal,
  );
}

async function callCerebras(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolParams: any,
  signal: AbortSignal,
): Promise<any> {
  return callOpenAICompatible(
    "Cerebras",
    "https://api.cerebras.ai/v1/chat/completions",
    apiKey,
    CEREBRAS_MODEL,
    systemPrompt,
    userPrompt,
    toolName,
    toolParams,
    signal,
  );
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolParams: any,
  signal: AbortSignal,
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      tools: [
        {
          functionDeclarations: [
            {
              name: toolName,
              description: `Provide ${toolName} data`,
              parameters: toolParams,
            },
          ],
        },
      ],
      toolConfig: {
        functionCallingConfig: { mode: "ANY", allowedFunctionNames: [toolName] },
      },
      generationConfig: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      const err = new Error("יותר מדי בקשות, נסה שוב בעוד רגע") as any;
      err.status = 429;
      throw err;
    }
    if (response.status === 403) {
      const err = new Error("GEMINI_API_KEY אינו תקף או חסר הרשאה") as any;
      err.status = 403;
      throw err;
    }
    const text = await response.text();
    console.error("Gemini error:", response.status, text);
    throw new Error("Gemini API error: " + response.status);
  }

  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (!part?.functionCall) {
    console.error("Unexpected Gemini response:", JSON.stringify(data));
    throw new Error("תגובה לא צפויה מ-Gemini");
  }

  return part.functionCall.args;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const CEREBRAS_API_KEY = Deno.env.get("CEREBRAS_API_KEY");
    if (!GEMINI_API_KEY && !GROQ_API_KEY && !CEREBRAS_API_KEY) throw new Error("No AI provider configured");

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
            },
          },
        },
        required: ["name", "description", "exercises"],
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
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                change: { type: "string" },
                trend: { type: "string" },
              },
              required: ["area", "change", "trend"],
            },
          },
          recommendation: { type: "string" },
        },
        required: ["summary", "changes", "recommendation"],
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
      };
    } else {
      throw new Error("Unknown type: " + type);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      // Gemini is the primary provider; Groq and then Cerebras are fallbacks
      // so the feature still works if Gemini (or Groq) is unavailable
      // (e.g. quota/billing issues).
      const providers: { name: string; call: () => Promise<any> }[] = [];
      if (GEMINI_API_KEY) {
        providers.push({ name: "Gemini", call: () => callGemini(GEMINI_API_KEY, systemPrompt, userPrompt, toolName, toolParams, controller.signal) });
      }
      if (GROQ_API_KEY) {
        providers.push({ name: "Groq", call: () => callGroq(GROQ_API_KEY, systemPrompt, userPrompt, toolName, toolParams, controller.signal) });
      }
      if (CEREBRAS_API_KEY) {
        providers.push({ name: "Cerebras", call: () => callCerebras(CEREBRAS_API_KEY, systemPrompt, userPrompt, toolName, toolParams, controller.signal) });
      }

      let result;
      let lastErr: unknown;
      for (const provider of providers) {
        try {
          result = await provider.call();
          lastErr = undefined;
          break;
        } catch (err) {
          console.error(`${provider.name} failed:`, err);
          lastErr = err;
        }
      }
      if (lastErr) throw lastErr;
      clearTimeout(timeoutId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  } catch (e: any) {
    console.error("Error:", e);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    const message = isTimeout
      ? "הבקשה לשרת AI לא הושלמה בזמן, נסה שוב"
      : (e instanceof Error ? e.message : "Unknown error");
    const status = e.status || (isTimeout ? 504 : 500);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
