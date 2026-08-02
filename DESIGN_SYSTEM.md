# MyFitFlow — Design System

מסמך זה מתעד את מערכת העיצוב הקיימת באפליקציית MyFitFlow, כפי שהיא ממומשת בפועל בקוד (Tailwind config, `index.css`, shadcn/ui). המטרה: לשמש כבסיס עבודה עם Claude Design — שינויים/הרחבות צריכים להישאר עקביים עם הטוקנים והדפוסים המתוארים כאן, אלא אם מוחלט במפורש לסטות מהם.

## 1. זהות ואופי (Brand Character)

- **סגנון**: Dark-mode neon / "gym-tech" — רקע כהה כמעט-שחור, טקסט בהיר, מבטא ניאון ירוק דומיננטי, זכוכית מטושטשת (glassmorphism) לכרטיסים ולניווט.
- **שפה וכיוון**: עברית, **RTL** לכל האפליקציה (`html { direction: rtl }`). כל טקסט חדש שנכתב צריך להיות בעברית ולהתחשב בכיוון RTL (אייקונים/חצים/פריסה).
- **פלטפורמת יעד**: Mobile-first — כל התוכן ממורכז בעמודה ברוחב מקסימלי `max-w-lg` (רוחב מובייל), גם בדסקטופ.
- **פונט**: `Be Vietnam Pro` (משקלים 100–900), נטען מ-Google Fonts. פונט ברירת מחדל של גוף האפליקציה.
- **אייקונים**: `Material Symbols Outlined` (Google), משמש דרך class ‏`.material-icon` ורכיב `MaterialIcon`. לא lucide-react לרוב המסכים הראשיים (למרות ש-lucide-react מותקן וזמין לרכיבי ui מסוימים).

## 2. צבעים (Color Tokens)

הצבעים מוגדרים כמשתני CSS ב-HSL תחת `:root` ([src/index.css](src/index.css)), וממופים ל-Tailwind דרך [tailwind.config.ts](tailwind.config.ts) (`hsl(var(--x))`). **אף פעם אל תשתמשי/תשתמש בערכי hex/rgb קשיחים ברכיבים — תמיד דרך הטוקנים הסמנטיים.**

### טוקנים סמנטיים (ברירת מחדל — ירוק)

| טוקן | HSL | תפקיד |
|---|---|---|
| `--background` | `220 20% 7%` | רקע כללי, כמעט שחור-כחלחל |
| `--foreground` | `0 0% 95%` | טקסט ראשי |
| `--card` | `220 18% 10%` | רקע כרטיסים |
| `--card-foreground` | `0 0% 95%` | טקסט על כרטיסים |
| `--popover` | `220 18% 10%` | רקע popover/dialog |
| `--primary` | `145 100% 50%` | ירוק ניאון — CTA, מצב פעיל, הדגשות |
| `--primary-foreground` | `220 20% 7%` | טקסט על גבי primary |
| `--secondary` | `220 15% 16%` | משטח משני (כפתורים משניים) |
| `--muted` | `220 15% 14%` | רקע מושתק |
| `--muted-foreground` | `220 10% 55%` | טקסט משני/עמום |
| `--accent` | `145 80% 42%` | ירוק כהה יותר, hover/accent |
| `--destructive` | `0 72% 51%` | שגיאה/מחיקה |
| `--border` / `--input` | `220 15% 18%` | קווי מתאר, שדות קלט |
| `--ring` | `145 100% 50%` | focus ring |
| `--radius` | `1rem` | רדיוס בסיס (ראה סעיף 4) |

### צבעי ניאון נוספים (קבועים, לא תלויי-ערכת נושא)

| טוקן | HSL | שימוש |
|---|---|---|
| `--neon-glow` | `145 100% 50%` | זהה ל-primary כברירת מחדל, לאפקטי glow |
| `--neon-cyan` | `180 100% 50%` | הדגשות ציאן |
| `--neon-purple` | `270 100% 65%` | הדגשות סגול |
| `--surface-glass` | `220 15% 12%` | משטח לזכוכית |

### ערכות נושא דינמיות (Theming)

המשתמש/ת יכולים לבחור צבע מבטא ב-Settings, שנשמר ב-`user_settings.theme_color` ומוחל בזמן ריצה דרך [src/lib/theme.ts](src/lib/theme.ts) על ידי דריסת `--primary` / `--accent` / `--ring` / `--neon-glow` / `--sidebar-primary` / `--sidebar-ring`:

| מזהה | Primary (HSL) | Accent (HSL) |
|---|---|---|
| `green` (ברירת מחדל) | `145 100% 50%` | `145 80% 42%` |
| `cyan` | `180 100% 50%` | `180 80% 42%` |
| `purple` | `270 100% 65%` | `270 80% 55%` |
| `orange` | `25 100% 55%` | `25 80% 48%` |
| `pink` | `330 100% 60%` | `330 80% 52%` |

**חשוב**: כל רכיב חדש שמדגיש "צבע מותג" חייב להשתמש בטוקן `primary`/`accent`/`neon`, לא בצבע קבוע — אחרת הוא ישבר עבור משתמשים שבחרו ערכת נושא אחרת.

### Sidebar (טוקנים נפרדים)

`--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` — כרגע זהים בערכם ל-card/primary הרגילים, אך מנוהלים בנפרד כדי לאפשר עיצוב סיידבר עצמאי בעתיד.

## 3. טיפוגרפיה

- **משפחת גופן**: `"Be Vietnam Pro", sans-serif` בלבד (`font-sans` ב-Tailwind ממופה אליה).
- אין סקאלת טיפוגרפיה מוגדרת פורמלית (אין `fontSize` custom ב-Tailwind config) — הפרויקט משתמש בסקאלת ברירת המחדל של Tailwind (`text-xs` עד `text-4xl` וכו') + גדלים חופשיים כמו `text-[10px]`, `text-[22px]` (נראה ב-BottomNav) לפרטים דקים כמו תוויות ניווט.
- כותרות/הדגשות משתמשות לרוב ב-`font-bold` / `font-medium` יחד עם קלאס `.neon-text` להדגשה זוהרת.

**המלצה ל-Claude Design**: אם נדרשת סקאלה טיפוגרפית פורמלית (H1–H4, Body, Caption), יש להגדיר אותה כתוספת ל-`tailwind.config.ts` (`theme.extend.fontSize`) כדי לשמור על מקור אמת אחד, ולא כערכים חופשיים מפוזרים.

## 4. צורה, רדיוס, שכבות (Shape & Elevation)

- **רדיוס בסיס**: `--radius: 1rem` (16px). Tailwind ממפה: `rounded-lg = var(--radius)`, `rounded-md = radius - 2px`, `rounded-sm = radius - 4px`. הסגנון הכללי "רך" ומעוגל — כרטיסים משתמשים לרוב ב-`rounded-2xl`.
- **Glassmorphism** — Utility class מרכזי:
  ```css
  .glass-card {
    @apply bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl;
  }
  ```
  זהו ה-pattern הסטנדרטי לכל כרטיס/פאנל/ניווט תחתון. שימוש עקבי ב-`glass-card` על פני כרטיסים מבטיח מראה אחיד.
- **אפקטי ניאון** (utilities נוספים ב-[src/index.css](src/index.css)):
  - `.neon-text` — טקסט זוהר בצבע primary (text-shadow כפול).
  - `.neon-border` — מסגרת זוהרת עדינה בצבע primary.
  - `.neon-glow-box` — box-shadow זוהר (הילה) סביב אלמנט.
- **אין הגדרת `boxShadow` מותאמת ב-Tailwind config** — כל האפקטים דרך ה-utilities הידניים לעיל, לא דרך `shadow-*` הרגילים.

## 5. פריסה (Layout)

- **קונטיינר ראשי**: כל עמוד עוטף תוכן ב-`max-w-lg mx-auto` (רוחב מובייל קבוע גם בדסקטופ) עם `min-h-screen bg-background`.
- **Padding אחיד**: `px-4 pt-6 pb-24` טיפוסי לעמודים (ה-`pb-24` משאיר מקום ל-Bottom Nav הצף).
- **ניווט**:
  - **Bottom Nav** ([src/components/BottomNav.tsx](src/components/BottomNav.tsx)) — `fixed bottom-0`, `glass-card`, 5 טאבים קבועים (ראשי / תרגילים / אימון / ניתוח / פרופיל), אייקון Material + תווית `text-[10px]`. הטאב הפעיל מקבל `neon-text scale-105`.
  - **Sidebar** ([src/components/AppSidebar.tsx](src/components/AppSidebar.tsx)) — נפתח/נסגר עם state (`sidebarOpen`), לניווט למסכי משנה (הגדרות, מאמן, מדידות).
  - מסכי משנה רבים (Settings, History, CoachDashboard, Measurements) לא מנווטים דרך React Router אלא מוצגים כ-conditional render מלא-מסך מתוך `Dashboard.tsx` (`showX` state + `onClose` prop) — דפוס "מודאלי-מסך-מלא" ולא דף נפרד.
- **גריד שבועי** (Dashboard) — 7 עמודות לימי השבוע בעברית (א׳-ש׳), היום הנוכחי מודגש.

## 6. רכיבים (Components)

### שכבת בסיס — shadcn/ui
`src/components/ui/` (49 קבצים) — ספריית shadcn/ui סטנדרטית על בסיס Radix + `class-variance-authority` + Tailwind ([components.json](components.json), `baseColor: slate`, `cssVariables: true`). זו שכבת "ליבה" גנרית — Button, Dialog, Dropdown, Tabs, Accordion, Toast/Sonner, Tooltip וכו'. **אין לערוך אותם ידנית מעבר להתאמת טוקנים** — עדכונים דרך ה-CLI של shadcn כשצריך.

דוגמת וריאנטים של Button (`cva`):
- `variant`: `default | destructive | outline | secondary | ghost | link`
- `size`: `default | sm | lg | icon`

### רכיבי דומיין (custom)
| רכיב | תפקיד |
|---|---|
| `AppSidebar` | תפריט צד לניווט משני |
| `BottomNav` | ניווט תחתון קבוע (5 טאבים) |
| `MaterialIcon` | wrapper לאייקוני Material Symbols |
| `MuscleMap` / `InteractiveMuscleMap` | מפת שרירים ויזואלית (three.js/SVG) |
| `PlanEditor` | עריכת תוכנית אימונים |
| `SwapExerciseModal` | החלפת תרגיל בתוך אימון |
| `RestTimer` | טיימר מנוחה בין סטים |
| `PersonalRecords` | הצגת שיאים אישיים |
| `ExerciseLibrary` / `ExerciseHistory` | ספריית תרגילים / היסטוריה לפי תרגיל |
| `WorkoutSummaryModal` | סיכום אימון בסיום |
| `AIChatWidget` / `AiInsightsChat` / `AIPlanGenerator` | ממשקי AI (צ'אט, תובנות, יצירת תוכנית) |

**דפוס עקבי**: רכיבי AI/מאמן מציגים טקסט חופשי בעברית שמגיע משרת ה-AI (Gemini) — יש לעצב אותם כך שיתמכו בטקסט ארוך משתנה (לא רק מחרוזות UI קבועות).

## 7. תנועה (Motion)

- `pulse-neon` — אנימציית פעימה (opacity 1↔0.7, 2s infinite) לטקסט/סמלים במצב טעינה (למשל מסך loading של "MyFitFlow").
- `accordion-down` / `accordion-up` — סטנדרטי מ-Radix Accordion.
- מעברי hover/active משתמשים ב-`transition-all duration-300` + `scale-105` (ראה טאב פעיל ב-BottomNav) — תבנית קלילה ועדינה, לא אגרסיבית.

## 8. נגישות ו-RTL — נקודות קריטיות

- כל עיצוב חדש **חייב** לעבוד תחת `dir="rtl"` בבדיקה ויזואלית בפועל (לא רק הנחה) — שימי לב לאייקוני חץ/כיוון, ל-margin/padding לא-סימטריים (`ml-*`/`mr-*`), ול-flex-direction.
- טקסטים תלויי-מגדר דקדוקי (עברית) — ראה [src/hooks/useGender.ts](src/hooks/useGender.ts): כל טקסט חדש הפונה למשתמש/ת בגוף שני/שלישי צריך לשקול זכר/נקבה, לא לקבע צורה אחת.
- קונטרסט: הפלטה כהה עם primary ירוק בהיר על רקע כהה עומדת בד"כ ב-AA, אך יש לוודא זאת בעת הוספת צבעי ניאון חדשים (במיוחד cyan/pink על רקע card).

## 9. מקורות אמת בקוד (Reference Files)

| נושא | קובץ |
|---|---|
| טוקני צבע (HSL) | [src/index.css](src/index.css) |
| מיפוי Tailwind + רדיוס + אנימציות | [tailwind.config.ts](tailwind.config.ts) |
| מנוע ערכות נושא דינמיות | [src/lib/theme.ts](src/lib/theme.ts) |
| shadcn config | [components.json](components.json) |
| ניווט תחתון | [src/components/BottomNav.tsx](src/components/BottomNav.tsx) |
| רכיבי UI גנריים | [src/components/ui/](src/components/ui/) |

## 10. הנחיות עבודה עם Claude Design

1. **אל תמציאו טוקנים חדשים** לצבע/רדיוס/מרווח בלי לבדוק קודם אם קיים טוקן מתאים בטבלאות שלמעלה.
2. כל צבע "מותג" חדש (primary/accent) חייב לעבור דרך משתני ה-CSS כדי לא לשבור את מנגנון ערכות הנושא (סעיף 2).
3. שמרו על `glass-card` כברירת מחדל לכרטיסים/פאנלים — סטייה ממנו (כרטיס "שטוח" לגמרי) צריכה להיות החלטה מודעת, לא בטעות.
4. כל מסך/רכיב חדש נבדק תחת RTL ותחת רוחב מובייל (`max-w-lg`) לפני שנחשב מוכן.
5. אם Claude Design מייצר טיפוגרפיה/מרווחים חדשים — הציעו להוסיף אותם כ-tokens רשמיים ל-`tailwind.config.ts` במקום ערכים חופשיים (`text-[13px]` וכו') כדי לשמור על עקביות לאורך זמן.
