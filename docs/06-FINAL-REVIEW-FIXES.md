# Final review — logic and data-integrity fixes

A last pass over the whole application before hand-in, looking for anything
that would not stand up to questioning: data that was invented but presented
as real, screens that reported success when nothing had happened, rules that
contradicted each other, and database policies that could be bypassed.

Every item below was found by reading the code and then confirmed by a test
or by running the app. Each says what was wrong, why it mattered, and what
changed.

> **After pulling this version, re-run `supabase/schema.sql` in full** in the
> Supabase SQL Editor. It is safe to run more than once. It adds two tables and
> several security fixes; `/setup` will show any table that is still missing.

---

## 1. Database security (supabase/schema.sql)

These were tested by running the real schema in PostgreSQL (PGlite) inside a
Supabase-like environment and attacking it as different users. **49 checks,
all passing** (`tests/schema.test.mjs`). The first three attacks below were also run against the
previous schema, where all three **succeeded**.

| Problem | Why it mattered | Fix |
|---|---|---|
| Any signed-in user could run `update profiles set role = 'admin'` on their own row | Full administrator access from the browser console | Column-level grants: users may update only `display_name` and `avatar_url` |
| Any signed-in user could insert their own `vet_profiles` row with `verified = true` | Clinical advice under a "Verified vet" badge with no check at all — the exact thing verification exists to stop | Insert policy now requires `verified = false` |
| A vet could set their own `verified` flag, or change the registration number after being verified | Same as above, one step later | `guard_vet_profile` trigger: only an administrator may change either |
| Community posts could be inserted with any `hearts` value | Fake popularity | Insert policy requires `hearts = 0` |
| A question could be created with a fake `answer_count`; its author could later rewrite the count or the question text | Counts out of step with reality; an answer left attached to a question it no longer matches | New questions must start at 0 / unresolved; authors may update only `resolved` |
| A vet could move an answer to a different question | Both questions' answer counts become wrong | Vets may update only an answer's `body` |
| No delete policy on community posts | The admin "remove post" button was refused silently while the screen said "Post removed" | `admin deletes confessions` policy |
| `lib/auth.ts` trusted `user_metadata.role` to decide who is an admin | Any user can write their own user_metadata | Reads `app_metadata.role` or `profiles.role` only |
| Pet name and weight unchecked | Blank names, 500 kg cats | Check constraints (name 1–40 characters, weight ≤ 200 kg) plus per-species validation in the form |

A shared vet registration number is deliberately **not** blocked at sign-up —
the test showed a unique index makes Supabase reject the sign-up with an
unreadable "Database error saving new user". The admin console flags the
duplicate beside both accounts instead, where the verification decision is made.

## 2. Invented data shown as real

| Where | What it showed | Now |
|---|---|---|
| Dashboard | Example pets "Biscuit" and "Luna" for every user, a weight chart for Biscuit with a "Healthy" badge, four reminders about pets the user did not own | The user's own pets, their real reminders (overdue ones in red) and a weight trend from their real weigh-ins — or an honest empty state |
| My Pets | The same two example pets; every card said nutrition "On plan" and vaccinations "Current", which nothing had checked | Real pets only, with their actual weight and next reminder |
| Admin console | "New sign-ups this week" peaking at 740/day; "Pets by species" with 6,200 dogs; a banner calling the whole screen demonstration data | New accounts over the last 14 days (from `profiles.created_at`) and Ask a Vet questions by species; stat cards from real counts |
| Landing page | "Loved by 120,000+ pet parents", "4.9 avg. rating", "18k+ pets tracked", three testimonials from invented people with stock photos and invented results, "70% of owners miss a vaccine date" (no source) | Removed. Figures shown are counted from the app itself (foods checked, species in planner, care guides) or cited (APOP 2018 overweight survey) |
| Hero "Biscuit's plan" chip | "742 kcal" typed in by hand — the planner gives 740 for the same dog | Calculated by the same engine as the planner |
| Sign-up | "Join 120,000+ pet parents" | Removed |
| Settings | "Member since June 2026 · 2 pets", "Last changed 3 months ago" | Real join date and pet count; the password line is gone |
| Ask a Vet examples | Answers signed by invented doctors at a real Johannesburg practice, with a "Verified vet" badge | Shown only when the board is unreachable, labelled "Example answer", no badge |

## 3. Screens that claimed success when nothing happened

| Where | Problem | Fix |
|---|---|---|
| Add a pet | Every error was swallowed; "has joined your family!" was shown even when the save failed or the user was signed out | Validates first, reports the real error, only navigates on success |
| Admin → remove post | Removed from screen and toasted "Post removed" before trying; the database refused | Reports success only when the database confirms a row was deleted |
| Settings → notifications, 2FA, public profile, data sharing, anonymous mode | Switches saved a value nothing ever read; 2FA in particular implied security that did not exist | Removed. Privacy is now a list of facts about what the app actually does |
| Settings → bio | Typed text was never stored | Removed |
| Settings → "zero-knowledge encryption" | Not true | Replaced with an accurate description |
| Settings → Delete account | "Disabled in demo mode" | Works: type DELETE to confirm; `delete_my_account()` removes the account and everything keyed to it |
| Forgot password | The reset email led to Settings, which had no way to set a password | Lands on a real "Change password" form |
| Sign-up | Always said "check your email", even when the project signs users straight in | Signs the user in when a session is returned |
| Vet console availability | "Owners will see you as available" — owners never saw it | Ask a Vet now shows how many verified vets are taking questions |
| FAQ: location | "Never sent to us" — it is sent to PetPal's server to run the search | Corrected |

## 4. Things that were missing or broken

- **Ask a Vet answers vanished on every reload.** The query embedded
  `vet_profiles` through a relationship that does not exist (`answers.vet_id`
  references `auth.users`), so the request failed and the error was ignored.
  Now two queries, joined in the page.
- **A pet could never be edited or deleted.** New pet page `/pets/[id]`: edit
  details, delete (with confirmation), weight log with chart, reminders, and a
  nutrition plan pre-filled with that pet's species and latest weight.
- **No real reminders or weight history** despite the dashboard, the landing
  page and the care guides all describing them. New tables `pet_reminders` and
  `pet_weights`; a trigger keeps `pets.weight` equal to the latest weigh-in so
  the two can never disagree.
- **Admins were forced off their own dashboard** (auto-redirect to `/admin`), so
  an admin with pets could never see them. Now a link instead.
- Display name was saved only to the auth record, so the admin screen (which
  reads `profiles`) showed a different name. Both are written now.

## 5. Logic that contradicted itself

| Where | Contradiction | Fix |
|---|---|---|
| Nutrition: life stage | Seniors were fed ×1.1 — **more** than an adult — while the care guide says to adjust for a slower metabolism | Senior ×0.9 |
| Nutrition: body condition | "Very thin" and "Lean" gave identical plans, as did "Overweight" and "Obese" | Graded 1.2 / 1.1 / 1.0 / 0.9 / 0.8 |
| Nutrition: meals | Every species got 3 meals young / 2 adult — including reptiles, against the planner's own note that reptiles feed infrequently | Per species (kitten 4, reptile 1, …) |
| Nutrition: weight slider | Moved in 0.25 kg steps but displayed one decimal, so it showed "4.3 kg" while calculating for 4.25 | 0.1 kg steps; value shown is value used |
| Nutrition: switching species | Carried the weight across, turning a 12 kg dog into a 12 kg cat | Resets to that species' typical weight |
| Wellness check | A plain average: a pet that was barely eating could still score "Thriving" (88) | Red-flag answers (lethargy, not eating, visibly underweight, abnormal toileting) mean "See a vet" whatever the score |
| Wellness: body shape | No answer for an underweight pet — "ribs easy to feel" scored as ideal | Underweight option added (and flagged) |
| Food safety | "Peanut butter" rated **safe**, "xylitol-free peanut butter" rated **caution** | One caution entry for all nut butters |
| Food safety | "My dog ate a weed" returned a cannabis-poisoning emergency | Alias removed |
| Care guides | "Parasite Prevention" duplicated "Fleas, Ticks and Worms" | Merged (20 guides) |
| Counts | "89 entries" / "21 guides" typed in several places | Computed from the data, so they cannot drift |
| Community / Ask a Vet | A connected but empty board was reported as "not reachable" and padded with examples; posting while offline pretended to work | Empty means empty; examples only when unreachable, with posting paused |

## 6. How this was verified

`npm test` re-runs both automated suites below in about ten seconds, with no
database or account needed — useful to demonstrate live.

- `tsc --noEmit` and ESLint: no errors.
- `next build`: succeeds; all 22 routes compile (20 pages, 2 route handlers), including the new `/pets/[id]`.
- **Database:** 49 automated checks against the real schema in PostgreSQL
  (PGlite), run twice to prove the script is re-runnable.
- **Logic:** 48 automated checks of the nutrition engine, food lookup (every
  alias of every entry resolves to its own verdict; no alias in two entries),
  wellness scoring and validation helpers.
- **In the browser** on localhost: landing page, planner pre-fill and species
  switching, food checker, Add Pet validation, dashboard, pet page, Ask a Vet,
  Community, Settings — no console or server errors.
