# Coach Dashboard — Gap Analysis & Remediation

Audit date: 2026-08-13. Scope: `src/pages/CoachDashboard.tsx`, `src/components/PlanEditor.tsx`, `src/services/mockTraineeData.ts`, `src/pages/TrainerTest.tsx`, `coach_permissions` schema, RLS policies, and the `admin-create-trainee` / `admin-ban-trainee` edge functions.

## Method

A full read-through of the coach dashboard code (1495 lines) plus every file referencing "coach"/"trainee", cross-checked against the **live** Supabase project's actual RLS policies and DB functions (not just the local `supabase/migrations/` history, which turned out to be incomplete — see Finding 1).

---

## Findings & Fixes

### 1. 🔴 Critical: coaches had no RLS access to trainee workout data — FIXED
**The most important finding.** `workout_sessions`, `workout_set_logs`, `body_weight_logs`, `workout_plans`, and `workout_plan_exercises` only had `auth.uid() = user_id` RLS policies. There was **no coach-access policy on any of them**, even though the `coach_has_access(coach_email, trainee_id)` function already existed and is used correctly for `exercises` and the nutrition tables.

**Real-world effect:** the History, Progress, and Weight tabs would silently return **zero rows** for any real (non-mock) trainee — not an error, just permanently empty data, because RLS filtered everything out before the query ever reached the app's error handling. Saving a plan on a trainee's behalf via `PlanEditor` would fail outright (RLS violation on insert). This explains why several tabs looked "built but broken" in earlier review — they were built correctly, just never allowed to read the data.

**Fix:** migration `20260813_coach_access_to_trainee_workout_data.sql` adds `coach_has_access()`-gated SELECT policies on `workout_sessions`, `workout_set_logs`, `body_weight_logs`, and full SELECT/INSERT/UPDATE/DELETE policies on `workout_plans` + `workout_plan_exercises`. Applied directly to the live project and verified with `get_advisors` (no new security warnings introduced).

### 2. 🟠 Weight tab: unhandled error left an infinite loading spinner — FIXED
`fetchWeight()` had no `try/catch`. Any Supabase error threw past `setLoadingWeight(false)`, leaving the spinner stuck forever with no way to recover short of navigating away. Same latent bug existed in `fetchSessions()` and `fetchPlans()` (no error surfaced to the coach, silent empty state instead).

**Fix:** wrapped all four fetchers (`fetchSessions`, `fetchProgress` already had it, `fetchWeight`, `fetchPlans`, `fetchPendingExercises`) in `try/catch/finally` with a `toast.error(...)` on failure, so a real error now always resolves the loading state and tells the coach something went wrong instead of showing a misleading empty/stuck state.

### 3. 🟠 Plan save (delete-then-insert) could silently wipe a plan's exercises — FIXED
`PlanEditor.save()` deleted all of a plan's `workout_plan_exercises` rows, then inserted the new set as two separate client calls. If the insert failed after the delete succeeded (network blip, validation error), the plan was left with **zero exercises**, with the only feedback being a generic "שגיאה בשמירה" toast — no rollback.

**Fix:** added a `replace_plan_exercises(p_plan_id, p_rows)` Postgres function (migration `20260813b_replace_plan_exercises_atomic_function.sql`) that does the delete+insert in one transaction, `SECURITY INVOKER` so it still enforces the caller's RLS exactly as before. `PlanEditor.tsx` now calls this via `supabase.rpc(...)` instead of two separate calls. TypeScript types were regenerated to include the new RPC signature.

### 4. 🟡 "Revoke access" was fused with a permanent account ban — FIXED
The only way to disconnect a trainee was `removeTrainee()`, which **both** permanently bans their auth account (locks them out of the app entirely) **and** deletes the `coach_permissions` row, in one irreversible action. There was no way to just stop coaching someone without also destroying their account.

**Fix:** added a second, lighter action — "הסר גישה בלבד" (remove access only) — that just deletes the `coach_permissions` row (already permitted by the existing `coach_permissions_delete_by_coach` RLS policy, no edge function needed) and leaves the trainee's account untouched. Both actions now have their own confirmation step and distinct icon/copy so they're not confused with each other.

### 5. 🟡 Data never refreshed once a tab had loaded — FIXED (manual refresh, not real-time)
`handleTabChange` only fetched a tab's data the *first* time it was visited (`if (progressData.length === 0)` as the "not yet fetched" sentinel). If a trainee logged a workout while the coach had that tab open earlier in the session, the coach would never see it without a full page reload.

**Fix:** added an explicit "רענן" (refresh) button to History, Progress, Weight, Plans, and Exercise-approval tabs, each calling that tab's fetch function directly. This is a **deliberate scope decision, not full real-time**: see "Not implemented" below for why.

### 6. 🟢 `admin-create-trainee` inserted a hardcoded email instead of the caller's — FIXED
The edge function already gates the whole endpoint to a single hardcoded `ADMIN_EMAIL` (an intentional "solo-coach model", per its own comment — not something this pass changed), but it then inserted `coach_email: ADMIN_EMAIL` into `coach_permissions` instead of the verified caller's actual email. Zero behavior change today (the two values are always equal, since the gate already enforces it), but it removes a latent inconsistency that would silently break the moment the admin gate is ever loosened to support more than one coach.

### 7. 🟢 Muscle-group color map has no fallback for uncommon groups — not changed
`MUSCLE_COLORS` in the Progress tab covers 7 known groups; anything else falls back to a single generic color, so the muscle-distribution chart's legend can look uniform for edge-case data. Cosmetic, low-impact, left as-is — not worth a schema-coupled color-generation scheme for a rarely-hit case.

---

## Explicitly not implemented (and why)

These are real gaps from the audit, but building them properly requires product/schema decisions beyond what a single pass should make unilaterally:

- **Multi-coach invite/accept lifecycle.** Today, `coach_permissions` has no `status` (pending/accepted/revoked) column, and the only way a row is created is server-side by the (single, hardcoded) admin edge function — there is no trainee-initiated "connect to my coach" flow, invite code, or self-serve accept step. Fixing this properly means: a new `status` column + migration, a real invite-code or link generation flow, a trainee-facing "accept coach" screen, and rethinking `admin-create-trainee`'s single-admin gate. That's a multi-screen feature, not a bug fix — flagging it here rather than shipping a half-built version.
- **Permission levels.** `coach_permissions` is a flat "has access or doesn't" row — no role/tier column exists. Introducing levels (e.g. read-only vs. full-edit) needs a schema change and a decision on what levels actually mean for each tab (plans? nutrition? exercise approval?), which is a product question, not something to guess at silently.
- **Real-time updates.** Solved the "never refreshes" symptom with manual refresh buttons (Finding 5) rather than Supabase Realtime subscriptions or polling. A full realtime implementation is a legitimate upgrade but adds ongoing connection/subscription-cleanup complexity across 5 tabs for a coach-dashboard usage pattern (a coach checking a client's data periodically) where "pull to refresh" is a reasonable, much simpler fit.
- **Trainee-facing messaging/chat.** Confirmed via full grep: this does not exist anywhere in the codebase. The "AI" tab lets a coach ask an AI assistant *about* a trainee's data — it is not a coach↔trainee chat channel. Building real messaging (new table, delivery, read receipts, notification) is a standalone feature, not a gap-fill.
- **`TrainerTest.tsx` route reachability.** This dev-only preview tool wasn't found wired into any route in `App.tsx` during the audit — it may be orphaned. Low priority (it's a local dev tool gated to `DEV_MODE`, not a production-facing gap) and worth a quick manual check next time that file is touched, rather than a speculative route addition now.
- **N+1 queries** in `fetchTrainees` (per-trainee `profiles`/`workout_sessions` lookups are batched, fine) and `fetchPlans` (one `count` query per plan). Left alone — fine at the expected scale of a single coach's trainee list, not worth the added complexity of a batched RPC for a dashboard, not a hot path.

---

## Summary of changes made in this pass

| File | Change |
|---|---|
| `supabase/migrations/20260813_coach_access_to_trainee_workout_data.sql` | New RLS policies giving coaches real read/write access to trainee workout data (applied to live DB + committed to repo) |
| `supabase/migrations/20260813b_replace_plan_exercises_atomic_function.sql` | New `replace_plan_exercises()` RPC for atomic plan-exercise swap (applied to live DB + committed to repo) |
| `src/integrations/supabase/types.ts` | Regenerated from the live schema (includes the new RPC signature) |
| `src/pages/CoachDashboard.tsx` | Error handling + toasts on `fetchSessions`/`fetchWeight`/`fetchPlans`/`fetchPendingExercises`; new "remove access only" action distinct from "block and remove"; manual refresh buttons on 5 tabs |
| `src/components/PlanEditor.tsx` | Plan save now calls the atomic `replace_plan_exercises` RPC instead of a client-side delete-then-insert |
| `supabase/functions/admin-create-trainee/index.ts` | Insert the verified caller's email instead of the hardcoded constant |
