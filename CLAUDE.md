# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

MyFitFlow is a Hebrew-language (RTL), mobile-first fitness tracking web app built with React + Vite + Supabase. It was originally scaffolded by Lovable.dev (`lovable-tagger`, `@lovable.dev/cloud-auth-js` are still wired in). All AI-facing content (prompts, UI copy, coaching feedback) is in Hebrew — preserve this when touching AI or user-facing strings.

## Commands

```bash
npm run dev          # start Vite dev server on port 8080
npm run build         # production build
npm run build:dev     # development-mode build
npm run lint          # eslint .
npm run test          # vitest run (single run)
npm run test:watch    # vitest watch mode
```

Run a single test file: `npx vitest run src/test/example.test.ts`
Run Playwright e2e tests: `npx playwright test` (config in [playwright.config.ts](playwright.config.ts), uses `lovable-agent-playwright-config`).

There is no separate lockfile-driven package manager preference enforced — both `package-lock.json` and `bun.lock` are present in the repo.

## Architecture

### Two-tier structure on disk
The actual app lives in `project-source/` (this directory) — it has its own git repo, `package.json`, and `node_modules`. The parent folder (`MyFitFlow_Dev/`) is just a container with a stray top-level `package.json`/`project-source.zip` that are not part of the app; ignore them.

### Frontend
- **Routing**: [src/App.tsx](src/App.tsx) — all routes are gated behind `AuthProvider`/`useAuth`; unauthenticated users are redirected to `/auth`. Routes render inside `ProtectedRoutes` alongside a persistent `BottomNav`.
- **Auth**: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) wraps Supabase auth (`supabase.auth.onAuthStateChange` / `getSession`). It also applies the user's saved theme color on login by reading `user_settings.theme_color`. Note the `DEV_MODE` mock-user flag at the top of this file — keep it `false` unless intentionally bypassing auth locally.
- **Data access**: Supabase is called directly from components/hooks/services (no central API layer) via `@/integrations/supabase/client`. `src/services/` holds thin typed query wrappers (e.g. [src/services/exercises.ts](src/services/exercises.ts)); most pages query Supabase inline instead.
- **Domain logic**: pure calculation logic (e.g. 1RM, volume, progress math) lives in [src/domain/fitness-calculations.ts](src/domain/fitness-calculations.ts), separate from data-fetching/components.
- **Theming**: [src/lib/theme.ts](src/lib/theme.ts) applies a user-selected accent color by writing CSS custom properties (`--primary`, `--accent`, `--neon-glow`, etc.) at runtime — the app uses a neon/dark aesthetic driven by these CSS vars, not static Tailwind color classes.
- **Gender-aware copy**: [src/hooks/useGender.ts](src/hooks/useGender.ts) reads `user_settings.gender` and exposes gendered Hebrew encouragement strings (Hebrew grammar is gendered). When adding user-facing Hebrew copy tied to the user, follow this pattern rather than hardcoding one grammatical gender.
- **UI kit**: `src/components/ui/` is a shadcn/ui install (Radix primitives + Tailwind, config in [components.json](components.json)) — treat these as generated/library components, not hand-rolled ones.
- **3D/visuals**: `@react-three/fiber` + `@react-three/drei` + `three` power [src/components/InteractiveMuscleMap.tsx](src/components/InteractiveMuscleMap.tsx) / `MuscleMap.tsx`.
- Path alias `@/*` → `src/*` (set in [vite.config.ts](vite.config.ts), [vitest.config.ts](vitest.config.ts), [tsconfig.json](tsconfig.json)).

### Backend (Supabase)
- **Schema**: managed via `supabase/migrations/`; current tables (see [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts), which is generated — don't hand-edit): `profiles`, `user_settings`, `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_sessions`, `workout_set_logs`, `body_measurements`, `body_weight_logs`, `coach_permissions`, plus a `coach_has_access` function — i.e. there's a coach/trainee permission model (see [src/pages/CoachDashboard.tsx](src/pages/CoachDashboard.tsx)). `workout_plan_exercises` also has `group_id`/`group_type` (`'superset' | 'triset'`, nullable — exercises sharing a `group_id` are grouped in the plan builder and rendered/timed together during a workout) and a nullable `notes` text column (per-exercise notes set in the plan builder). RIR/RPE fields were removed entirely (were only ever a local-only overlay via `workoutExtrasLocal.ts`, never a real column) — don't reintroduce them without an explicit ask.
- **Edge Function**: `supabase/functions/ai-workout/index.ts` is the single AI backend endpoint, called with a `type` discriminator (`analyze`, `generate_plan`, `analyze_measurements`, `analyze_single_workout`, `coach_report`, `chat`). It has a **multi-provider fallback chain**: Gemini (`gemini-2.0-flash`, primary) → Groq (`llama-3.3-70b-versatile`) → Cerebras (`gpt-oss-120b`) — Groq and Cerebras share an OpenAI-compatible `chat/completions` + `tools`/`tool_choice` implementation (`callOpenAICompatible`), while Gemini uses its own `functionDeclarations`/`toolConfig` shape. Each provider is only added to the chain if its API key env var (`GEMINI_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_API_KEY`) is set; on failure it logs and falls through to the next configured provider. All system/user prompts are Hebrew. When adding a new AI feature, add a new `type` branch here rather than a new function.
  - **Deployed function name mismatch bites easily**: the live Supabase function must be deployed under the slug `ai-workout` (that's what every `supabase.functions.invoke("ai-workout", ...)` call in the client expects). It was previously deployed under an unrelated auto-generated slug (`smooth-processor`), which silently 404'd every AI call in the app — if AI features stop working app-wide, verify with the Supabase MCP `list_edge_functions`/`get_edge_function` tools that a function named exactly `ai-workout` exists and matches local source, don't assume the name is right.
  - Gemini on this project has hit real, non-transient issues: `GEMINI_API_KEY` requires billing enabled on its Google Cloud project (free-tier quota can be `limit: 0` for some account types) — this is why the Groq/Cerebras fallbacks exist. Cerebras's available model per API key can differ from what you'd expect; if `CEREBRAS_MODEL` 404s, hit `GET https://api.cerebras.ai/v1/models` with the key to see what's actually enabled for that account before guessing another model name.
- The `generate_plan` prompt hardcodes an approved Hebrew exercise-name whitelist by muscle group — keep new exercise names consistent with `exercises` table naming if you touch this.
- **Two Supabase project refs exist and only one is actually used**: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts) hardcodes the URL/anon key literally (it does not read `import.meta.env` at all) pointing at `xebxenjmzdrqeexhtbnn` — this is the live project the app actually talks to. `.env` (`VITE_SUPABASE_*`) and [supabase/config.toml](supabase/config.toml) both point at a different, unused ref (`jrzfnayajdcqwlcdsjms`) and have no effect on the running app. When changing the Supabase connection, edit `client.ts` directly; don't assume `.env` changes do anything.
- Seeding: `scripts/seed-exercises.ts`, run via `tsx scripts/seed-exercises.ts` (see [scripts/README.md](scripts/README.md)).

### Deployment
Deploys to Vercel as an SPA ([vercel.json](vercel.json) rewrites all routes to `index.html`).
