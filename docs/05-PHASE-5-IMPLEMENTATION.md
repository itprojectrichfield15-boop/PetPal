# Phase 5 — Implementation Phase Document

**Worth 25% of the project — the largest single weighting. Due 9 November 2026.**

The guidelines require five sections: Introduction, Coding, Testing, System
Testing, Installation. The overall documentation list adds several items that
belong here: code standardisation, code efficiency, error handling, validation
checks, system security measures, cost estimation, reports, future scope,
bibliography, appendices and glossary.

Cover all of it. This is the phase where the marks are densest.

---

## Suggested length

| Section | Pages |
|---|---|
| 5.1 Introduction | 2 |
| 5.2 Coding | 14–20 |
| 5.3 Testing | 8–10 |
| 5.4 System Testing | 10–14 |
| 5.5 Installation | 5–7 |
| Additional required sections | 12–16 |
| **Total** | **51–69** |

---

# 5.1 Introduction

State:

1. What implementation covered — turning the Phase 4 design into working,
   deployed software
2. The outcome — a live system at a public URL, with its actual scale
3. What this document covers
4. **What changed from the design, and why**

## 5.1.1 The deviations section — do not skip this

Most groups pretend the implementation matched the design exactly. It never does,
and a marker knows that. Documenting deviations honestly, with reasons,
demonstrates engineering judgement.

Deviations actually made in this project:

| Design said | Implementation does | Why |
|---|---|---|
| Browser calls the practice API directly | A server-side route calls it | The browser's same-origin policy began blocking every response |
| One external data source | Four mirrors plus a bundled offline dataset | All mirrors failed simultaneously in production |
| Professional record created by the client at sign-up | Created by a database trigger | No session exists at sign-up, so the write was always refused |
| Reduce-motion implemented in CSS | Also carried into the animation library | CSS cannot stop JavaScript-driven animation |
| 3D shapes generated on the main thread | Generated in a Web Worker | Generation blocked the page for 200–300ms at a time |
| Single fixed particle count | Count scales with viewport width | A constant count was simultaneously too dense and too expensive on mobile |
| Admin verification via the interface only | Requires a database policy as well | Without it the administrator's write was silently refused |

Each of these is a real finding. Write a short paragraph on each explaining what
was observed, what was concluded and what was changed.

## 5.1.2 Implementation statistics

| Measure | Value |
|---|---|
| Application source | 13,058 lines of TypeScript / TSX |
| Largest module | `lib/animal-shapes.ts`, 992 lines |
| Routes | 21 (19 pages, 2 API) |
| Database tables | 7 |
| Database functions | 4 |
| Database triggers | 2 |
| Row-level security policies | 24 |
| Food-safety entries | 89 |
| Care guides | 22 |
| Bundled veterinary practices | 189 |
| Runtime dependencies | 31 |

---

# 5.2 Coding

The guidelines require: complete project coding, comments and description of
coding segments, standardisation, code efficiency, error handling, parameter
passing, and validation checks.

## 5.2.1 Development environment

| Item | Version |
|---|---|
| Node.js | 20+ |
| Package manager | npm |
| Language | TypeScript 5 (strict) |
| Framework | Next.js 16.2.9 |
| Version control | Git / GitHub |
| Editor | VS Code |
| Linter | ESLint |

## 5.2.2 Code organisation

Reproduce the repository map and explain the three-way split: routing in `app/`,
reusable interface in `components/`, interface-free logic in `lib/`. State the
consequence: anything in `lib/` can be executed and verified without a browser,
which is what made the testing in §5.3 possible.

## 5.2.3 Coding standards applied

| Standard | Rule | Enforcement |
|---|---|---|
| Type safety | Strict TypeScript; no implicit `any` | `tsc --noEmit` in the build |
| Linting | Zero errors | ESLint |
| Naming | `camelCase` values, `PascalCase` components and types | Convention |
| File naming | One component per file, named for it | Convention |
| Imports | Absolute via `@/` | `tsconfig.json` path alias |
| Comments | Explain *why*, not *what* | Review |
| Function size | One responsibility | Review |

### The commenting standard, stated properly

This project uses an unusual and defensible commenting rule, and it is worth
explaining because a marker will notice the comment density:

> A comment explains **why** the code is as it is, particularly where the obvious
> approach was tried and failed. Comments that restate the code are omitted.

Give a real example from the source:

```ts
// One-directional, whole-phrase. The ALIAS must appear in the QUERY, never the
// reverse. Reversing this caused "chicken" to match the alias "chicken bones"
// and report a safe food as TOXIC.
```

A reader who later "simplifies" that to a substring match reintroduces a safety
defect. The comment is what prevents it.

## 5.2.4 Code segments to include and describe

Do **not** paste the whole codebase. Select segments that demonstrate technique,
and for each give: the file, what it does, why it is written that way, and the
notable detail.

Recommended segments:

| # | Segment | Demonstrates |
|---|---|---|
| 1 | `computePlan()` in `lib/nutrition.ts` | Algorithm implementation; single source of truth |
| 2 | Alias matching in `lib/food-safety.ts` | Defect analysis and correction |
| 3 | `haversine()` in `lib/vets.ts` | Mathematical implementation |
| 4 | The mirror-and-fallback loop in `app/api/vets/route.ts` | Resilience; graceful degradation |
| 5 | `handle_new_user()` in `supabase/schema.sql` | Database trigger; security context |
| 6 | The `answers` insert policy | Declarative access control |
| 7 | `sampleAnimal()` in `lib/animal-shapes.ts` | Advanced algorithm |
| 8 | `shape-worker.ts` | Concurrency; transferable buffers |
| 9 | `PreferencesProvider` | Cross-cutting concern applied at the root |
| 10 | `postAnswer()` in the vet console | Optimistic update with rollback on failure |

For each, present the code in a monospaced block with line numbers, then a
paragraph of explanation. Roughly one page per segment.

## 5.2.5 Code efficiency

The guidelines list this explicitly. Give concrete measures taken, not
generalities.

| Technique | Where | Effect |
|---|---|---|
| Database indexes on filtered and sorted columns | 5 indexes | Avoids full table scans |
| Stored derived count instead of a per-row subquery | `questions.answer_count` | One query instead of N |
| Response caching | `/api/vets`, 10 minutes | A donated public service is not queried per keystroke |
| Bounding-sphere rejection in the distance field | `lib/animal-shapes.ts` | Only nearby primitives are evaluated per sample point |
| Four-tap tetrahedral gradient | `lib/animal-shapes.ts` | Half the cost of central differences |
| Single draw call for 22,000 points | `AnimalField` | One GPU submission rather than thousands |
| Work moved off the main thread | `shape-worker.ts` | Two seconds of computation costs the interface nothing |
| Transferable buffers | Worker messaging | Data moves between threads without copying |
| Particle budget scaled to viewport | `AnimalField` | A phone draws 12,000 points, a desktop 22,000 |
| Device pixel ratio capped at 2 | Both canvases | Bounded fill cost on high-density screens |
| Render loop paused when the tab is hidden | Both canvases | No work while not visible |
| Code splitting by route | Next.js | Only the current page's code is downloaded |
| Progressive shape loading | `AnimalField` | The page is interactive before all five animals exist |

### A measured example worth including

> Generating all five animal point clouds takes approximately 2.0 seconds of CPU
> time. Executed on the main thread this blocked the interface in four separate
> 200–300ms stalls during the opening animation. Moving the work to a Web Worker
> reduced the main-thread cost of the same computation to zero. The measurement
> method and the before/after are given in §5.3.

## 5.2.6 Error handling

State the strategy, then give the implementation with examples.

**Strategy:** every failure is caught at the boundary where it occurs, translated
into a message that states what went wrong and what to do, and — critically —
**never reported as a success.**

| Class | Handling | Example in the system |
|---|---|---|
| Invalid input | Prevented where possible, else validated with a specific message | Weight slider cannot leave the species range |
| Network failure | Caught; alternatives tried; degraded; reported | Four mirrors → bundled data → explicit error |
| Database unreachable | Caught; offline features continue; `/setup` diagnoses | "Failed to fetch" translated into a readable cause |
| Permission refused | Reported accurately | Unverified answer attempt states the likely cause |
| Optimistic update failure | **Rolled back**, then reported | Verifying a vet; toggling availability; deleting a saved reply |
| Programming error | Caught by type checking before runtime | — |

### The rollback pattern — include this code

Several controls update the screen immediately for responsiveness and then write
to the database. If the write fails, the screen must go back:

```ts
const before = vets                                   // remember the old state
setVets(v => v.map(x => x.id === id ? { ...x, verified } : x))   // optimistic

const { error } = await supabase.from('vet_profiles')
  .update({ verified }).eq('id', id)

if (error) {
  setVets(before)                                     // roll back
  toast.error('Couldn't verify that vet', { description: error.message })
  return
}
toast.success('Vet verified')
```

Explain why this matters: an earlier version of this control updated only local
state and always reported success. An administrator could click Verify on a
professional, be told it worked, and nothing would have changed.

## 5.2.7 Parameter passing

The guidelines list this. Cover:

- **By value vs by reference** in JavaScript: primitives by value, objects and
  arrays by reference. State the consequence — a function that mutates an object
  argument affects the caller — and the convention adopted: functions in `lib/`
  are pure and do not mutate their arguments.
- **React props** — data passed down the component tree; one-directional.
- **Function arguments with defaults** — e.g. `fetchNearbyVets(centre,
  radiusM = 12000, signal?)`.
- **Destructuring** — used to name the fields a function actually uses.
- **Worker messaging** — structured cloning, with `Float32Array` buffers passed
  as **transferables** so ownership moves rather than the data being copied.
- **SQL parameters** — Supabase queries are parameterised, never string-
  concatenated. State that this is what prevents SQL injection.

## 5.2.8 Validation checks

Present the two-tier table. This is a strong section because it shows the same
rule enforced twice, deliberately.

| Rule | Interface check | Database check |
|---|---|---|
| Password ≥ 8 characters | Before submit | Supabase Auth |
| Professional supplies a registration number | Before submit | — |
| Pet weight > 0 | Slider minimum | `check (weight is null or weight > 0)` |
| Species is one of nine | Button set only | `check (species in (...))` |
| Community post 10–280 characters | Character counter | `check (char_length between 10 and 280)` |
| Question title 10–140 | Counter | `check` constraint |
| Answer body ≥ 20 | Counter and disabled button | `check` constraint |
| Saved reply title 2–80 | Validated on save | `check` constraint |
| Only a verified vet may answer | Composer hidden | **RLS policy** |
| Only an owner may read their pets | Query scoped | **RLS policy** |
| Latitude within ±90 | — | API route guard clause |

**State the principle explicitly:** interface validation exists for helpfulness —
telling the user immediately. Database validation exists for correctness — it
holds even if the interface is bypassed entirely. Neither replaces the other.

---

# 5.3 Testing

## 5.3.1 Testing strategy

State the approach honestly:

> Testing was carried out at four levels: static analysis on every build, unit
> verification of the pure logic modules, integration verification of the
> database schema against a real PostgreSQL engine, and system testing of the
> deployed application in a browser. There is no automated regression suite in
> the repository; this is recorded as a limitation in §5.6 and as future work in
> §5.10.

Being straight about the absence of a CI suite is better than implying one
exists.

## 5.3.2 Testing levels

| Level | Scope | Method |
|---|---|---|
| Static | Whole codebase | TypeScript strict checking, ESLint, on every build |
| Unit | Pure functions in `lib/` | Purpose-written scripts run under Node |
| Integration | Database schema, triggers, policies, constraints | Executed against real PostgreSQL via PGlite |
| System | Deployed application | Browser automation and manual walkthrough |
| Acceptance | Against the requirements | Checklist per functional requirement |

## 5.3.3 Testing techniques used

Name them; the guidelines ask for techniques and strategies.

| Technique | Applied to | Example |
|---|---|---|
| **Black-box** | Features by requirement | Does the practice finder return sorted results? |
| **White-box** | Algorithms with known internals | Every branch of the alias matcher |
| **Equivalence partitioning** | Numeric inputs | Weight: below range, in range, above range |
| **Boundary value analysis** | Constrained fields | Post text at 9, 10, 280 and 281 characters |
| **Negative testing** | Constraints | Deliberately invalid rows rejected |
| **Regression** | After each fix | Re-ran the 43 food-safety cases |
| **Integration** | Trigger behaviour | Insert an account, assert two rows appear |
| **Exploratory** | Whole app | Browser walkthrough of every screen |
| **Cross-browser** | Layout | Chrome, Firefox, Safari, Edge |
| **Responsive** | Layout | 375px to 2560px |

## 5.3.4 Test plan

| Item | Detail |
|---|---|
| Objectives | Verify every functional requirement; verify constraints hold; verify graceful degradation |
| Scope | All 21 routes, 7 tables, 4 functions, 24 policies |
| Environment | Local development, and the production deployment |
| Entry criteria | Feature complete; build passing |
| Exit criteria | All planned cases executed; no open severity-1 or severity-2 defects |
| Severity scale | 1 data loss or wrong health-relevant output · 2 feature unusable · 3 feature impaired · 4 cosmetic |

---

# 5.4 System Testing

## 5.4.1 Test case format

Use this table for every case:

| Field | |
|---|---|
| Test Case ID | TC-xx |
| Requirement | FR-xx |
| Objective | |
| Preconditions | |
| Test data | |
| Steps | 1… 2… |
| Expected result | |
| Actual result | |
| Status | Pass / Fail |
| Severity if failed | |

## 5.4.2 Unit test cases

### Nutrition

| ID | Input | Expected | Actual | Status |
|---|---|---|---|---|
| TC-01 | Dog, 12kg, adult, normal, ideal | Calorie target per RER/MER | 722 kcal/day | Pass |
| TC-02 | Cat, 4.5kg, adult, normal, ideal | Lower, species factor 0.9 | 311 kcal/day | Pass |
| TC-03 | Dog, 12kg, **puppy**, normal, ideal | Approximately double TC-01 | 1444 kcal/day | Pass |
| TC-04 | Weight below species minimum | Constrained to the minimum | Constrained | Pass |
| TC-05 | Weight above species maximum | Constrained to the maximum | Constrained | Pass |
| TC-06 | Same input, planner vs landing demo | Identical | Identical | Pass |

TC-03 is a good case to highlight: it verifies the life-stage multiplier is
applied, and the expected relationship (a growing animal needing roughly twice
maintenance) is independently checkable against veterinary literature.

### Food safety — the regression suite

**43 test cases.** Present the important ones:

| ID | Query | Expected | Actual | Status |
|---|---|---|---|---|
| TC-07 | "chocolate" | Toxic, with reason | Toxic | Pass |
| TC-08 | "chicken" | **Safe** | Safe | Pass |
| TC-09 | "chicken bones" | Caution/Toxic | Correct verdict | Pass |
| TC-10 | "grapes" | Toxic | Toxic | Pass |
| TC-11 | "cat" | Must not match "catnip" | No false match | Pass |
| TC-12 | "xyzzy" (not in database) | **No entry stated; no verdict inferred** | No entry | Pass |
| TC-13 | "lily" with species = cat | Toxic, species-specific | Correct | Pass |

**TC-08 is the headline case.** Document it fully with the defect history: it
previously returned **TOXIC** for an ordinary safe food, because the matcher
tested whether the alias *contained* the query rather than the reverse. Include
the before and after code and the reasoning. This single test case demonstrates
defect discovery, root-cause analysis, correction and regression protection.

### Distance calculation

| ID | Input | Expected | Status |
|---|---|---|---|
| TC-14 | Same point twice | 0 km | Pass |
| TC-15 | Two known cities | Matches published great-circle distance | Pass |

## 5.4.3 Integration test cases — the database

Executed by running `supabase/schema.sql` against a real PostgreSQL engine
(PGlite) with Supabase's `auth` schema stubbed.

| ID | Test | Expected | Actual | Status |
|---|---|---|---|---|
| TC-16 | Execute the schema | All objects created | 7 tables, 4 functions, 24 policies | Pass |
| TC-17 | Execute it a second time | Succeeds; idempotent | Succeeds | Pass |
| TC-18 | Insert an account | Profile row created by trigger | Created, correct role | Pass |
| TC-19 | Insert a **professional** account **with no session** | Professional record created, `verified = false` | Created | Pass |
| TC-20 | Insert an answer | `answer_count` 0 → 1 | 1 | Pass |
| TC-21 | Delete that answer | `answer_count` 1 → 0 | 0 | Pass |
| TC-22 | `increment_hearts` twice | 0 → 2 | 2 | Pass |
| TC-23 | Answer body under 20 characters | Rejected | Rejected | Pass |
| TC-24 | Species = "dragon" | Rejected | Rejected | Pass |
| TC-25 | Pet weight = −5 | Rejected | Rejected | Pass |

**TC-19 is the significant one.** It reproduces exactly the condition that broke
the original implementation: no session exists, so `auth.uid()` is null. The
client-side insert failed here every time. Verifying that the trigger succeeds
under the same condition proves the fix addresses the actual cause.

## 5.4.4 System test cases — the deployed application

| ID | Requirement | Test | Expected | Status |
|---|---|---|---|---|
| TC-26 | FR-01 | Create an owner account | Account and profile created | Pass |
| TC-27 | FR-02/04 | Create a professional account | Professional record created, unverified | Pass |
| TC-28 | FR-05 | Sign in and out | Session created and cleared | Pass |
| TC-29 | FR-08/09 | Add a pet; check visibility | Visible to owner only | Pass |
| TC-30 | FR-13 | Full nutrition flow | Correct plan displayed | Pass |
| TC-31 | FR-19 | Food safety verdict | Verdict, reason, action shown | Pass |
| TC-32 | FR-25 | Practice finder, live | Real practices, distance-sorted | Pass |
| TC-33 | FR-29 | Practice finder, all mirrors down | Bundled data with visible notice | Pass |
| TC-34 | FR-31 | Unverified vet attempts to answer | Refused | Pass |
| TC-35 | FR-31 | Verified vet answers | Posted; count incremented | Pass |
| TC-36 | FR-43 | Administrator verifies a professional | `verified` becomes true | Pass |
| TC-37 | FR-46 | Administrator looks for pet records | Not present | Pass |
| TC-38 | FR-47 | Switch theme to light | Whole interface changes, including 3D | Pass |
| TC-39 | FR-48 | Change accent colour | Applied across the interface | Pass |
| TC-40 | FR-49 | Enable reduce motion | Animation stops | Pass |
| TC-41 | NFR-17 | Resize 375px → 2560px | Usable throughout | Pass |

## 5.4.5 Defects found, and their resolution

**This is the most valuable subsection in the entire phase.** A defect log with
root-cause analysis is direct evidence of engineering work.

| ID | Defect | Sev | Root cause | Fix | Verified by |
|---|---|---|---|---|---|
| D-01 | Searching "chicken" returned TOXIC | **1** | Matcher tested alias-contains-query instead of query-contains-alias | One-directional whole-phrase matching with specificity ranking | TC-08, 43-case suite |
| D-02 | Practice finder failed on every request | **2** | External API stopped sending CORS headers; browser blocked every response | Moved the call to a server-side route | TC-32 |
| D-03 | Practice finder failed with all mirrors down | **2** | Single point of failure in a donated external service | Four mirrors plus a bundled dataset | TC-33 |
| D-04 | Professional records never created | **2** | Client insert ran before a session existed; RLS refused it | Moved into a `SECURITY DEFINER` trigger | TC-19, TC-27 |
| D-05 | Database schema would not execute at all | **1** | `$$` mangled to `$` when the file was generated, producing an unterminated dollar-quote | Corrected the quoting | TC-16 |
| D-06 | Administrator "Verify" changed nothing | **2** | Updated local state only; no database write and no policy permitting one | Real write plus an admin policy | TC-36 |
| D-07 | Reduce motion did not stop animation | **3** | CSS cannot affect JavaScript-driven animation | Carried the preference into the animation library | TC-40 |
| D-08 | Accent colour setting had no effect | **3** | Saved to storage but never read back | Converted 127 hard-coded colour usages to a token; applied at runtime | TC-39 |
| D-09 | 3D subject invisible on phones | **2** | Desktop composition placed its centre beyond the right edge in portrait | Separate portrait composition | TC-41 |
| D-10 | Opening animation stuttered | **3** | Shape generation on the main thread in non-preemptible idle callbacks | Moved to a Web Worker | Frame observation |
| D-11 | Deployed site returned 404 on every route | **2** | Hosting framework preset wrong; served the static folder and discarded the application | Corrected the preset; rebuilt production | TC-26 |
| D-12 | Fabricated data in several screens | **1** | Placeholder content left in place | Replaced with real data or honest absence | TC-37 and inspection |

**For the severity-1 defects, write a full root-cause narrative** — what was
observed, how it was diagnosed, what the cause turned out to be, what was
changed, and how the fix was verified. D-01 and D-05 are the strongest.

### Why D-11 is worth documenting

The build **succeeded** every time. `npm run build` completed without error, and
the deployment reported success. The application was nonetheless entirely
unreachable, because the hosting platform was configured to serve the project as
a static site and therefore served the `public/` folder while discarding
everything the build produced.

The diagnostic that identified it: requesting `/globe.svg` — a file that exists
only inside `public/` — returned **200**, while `/` returned **404**. That single
pair of results distinguishes "the application is broken" from "the application
is not being served", which are entirely different problems.

## 5.4.6 Test summary

| Level | Planned | Executed | Passed | Failed |
|---|---|---|---|---|
| Unit | | | | |
| Integration | | | | |
| System | | | | |
| **Total** | | | | |

Add a defect-by-severity chart and a requirements-coverage statement: every
functional requirement has at least one test case.

---

# 5.5 Installation

## 5.5.1 Prerequisites

| Requirement | Detail |
|---|---|
| Accounts | GitHub, Supabase, Vercel — all free |
| Software (deployment only) | A browser |
| Software (local development) | Node.js 20+, Git |

## 5.5.2 Deployment procedure

Reference `SETUP.md`, which contains the full procedure, and reproduce it here in
summary with screenshots of each step.

1. Place the source on GitHub
2. Create a Supabase project
3. Run `supabase/schema.sql` in the SQL Editor
4. Obtain the project URL and the publishable key
5. Import the repository into Vercel
6. **Set the framework preset to Next.js** — the cause of D-11
7. Add the two environment variables to all environments
8. Deploy
9. Verify via `/setup`
10. Create the first administrator

### 5.5.3 The first-administrator problem

Document this honestly; it is a genuine design constraint:

> The system has no interface for creating the first administrator, because any
> such control would allow any user to grant themselves administrative rights.
> The first administrator must therefore be created by a direct database
> statement:
>
> ```sql
> update profiles set role = 'admin' where email = '<address>';
> ```
>
> The user must then sign out and back in, because the role is read when the
> session is established. All subsequent administrative actions — including
> verifying professionals — are performed through the interface.

## 5.5.4 Configuration reference

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Database location |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Publishable key, constrained by RLS |

**State the build-time behaviour:** these are compiled into the application at
build time, so changing one has no effect until the project is rebuilt. Note also
that redeploying a *preview* deployment does not change the production site.

## 5.5.5 Local development

```bash
git clone <repository-url>
cd demo-master
npm install
# create .env.local containing the two variables
npm run dev          # http://localhost:3000
```

State that `.env.local` is deliberately excluded from version control, and that
each developer therefore creates their own.

## 5.5.6 Post-installation verification

A checklist: `/setup` all green; sign-up produces a confirmation email; sign-in
works; a pet can be added and is visible only to its owner; nutrition returns a
plan; food safety returns a verdict; the practice finder returns practices; the
admin panel lists real accounts.

## 5.5.7 Maintenance procedures

| Task | Frequency | Procedure |
|---|---|---|
| Verify professionals | As applications arrive | Admin Panel → Vets → Verify |
| Moderate the community wall | As required | Admin Panel → Community |
| Update the food-safety database | As needed | Edit `lib/food-safety.ts`, review, redeploy |
| Refresh bundled practice data | Every few months | Re-extract from OpenStreetMap |
| Keep the database awake | Weekly | A free Supabase project pauses after about a week idle |
| Update dependencies | Periodically | `npm outdated`, then update and re-test |

---

# Additional required sections

The overall documentation list in the guidelines includes several items not in
the phase table. Put them here.

## 5.6 System Security Measures

### 5.6.1 Database and data security

Summarise from Phase 4 §4.8, and give the evidence that it works: the policy
matrix, and the test cases that verify it (TC-29 pet isolation, TC-34 verification
gate, TC-37 administrator cannot see pets).

### 5.6.2 User profiles and access rights

The guidelines ask specifically for this. Present the access matrix:

| Capability | Visitor | Owner | Vet (unverified) | Vet (verified) | Admin |
|---|---|---|---|---|---|
| Browse public pages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Nutrition, food safety, find a vet, guides | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create and view own pets | — | ✓ | ✓ | ✓ | ✓ |
| Post to the community wall | — | ✓ | ✓ | ✓ | ✓ |
| Ask a question | — | ✓ | ✓ | ✓ | ✓ |
| View the professional queue | — | — | ✓ | ✓ | — |
| **Answer a question** | — | — | **—** | **✓** | — |
| Saved replies | — | — | ✓ | ✓ | — |
| Verify professionals | — | — | — | — | ✓ |
| Remove community posts | — | — | — | — | ✓ |
| View registered accounts | — | — | — | — | ✓ |
| **View others' pets** | **—** | **—** | **—** | **—** | **—** |

Highlight the last row: **nobody** can view another user's pets, including
administrators. That is a deliberate privacy decision, not an omission.

## 5.7 Cost Estimation with a Model

The guidelines require cost estimation **along with a cost estimation model**.
Naming and applying a model is what earns the marks.

### 5.7.1 COCOMO (Basic, Organic)

The project is small, the team is small, and the requirements were flexible —
this is the Organic mode.

```
Effort  (person-months) = 2.4 × (KLOC)^1.05
Duration    (months)    = 2.5 × (Effort)^0.38
Average staff           = Effort ÷ Duration
```

With **13.058 KLOC**:

```
Effort   = 2.4 × 13.058^1.05
         = 2.4 × 15.02  ≈ 36.0 person-months
Duration = 2.5 × 36.0^0.38
         = 2.5 × 3.90   ≈ 9.8 months
Staff    = 36.0 ÷ 9.8   ≈ 3.7 people
```

**Then compare with reality and discuss the gap honestly.** The actual project
took a fraction of that. Give the reasons:

- COCOMO was calibrated on projects written largely from scratch. A substantial
  share of these 13,058 lines is configuration, generated component scaffolding
  and declarative interface markup rather than novel logic.
- Modern frameworks and managed services eliminate whole categories of work that
  COCOMO assumes — authentication, session handling, hosting, database
  administration.
- The estimate excludes the effect of tooling that did not exist when the model
  was calibrated.

A candidate who applies a model, reports the number, and then explains why the
number does not match reality demonstrates more understanding than one who
reports a figure that happens to look plausible.

### 5.7.2 Function Point Analysis (second model)

Applying a second model and comparing is a strong move.

| Component | Count | Complexity | Weight | FP |
|---|---|---|---|---|
| External Inputs | ~15 forms | Average | 4 | 60 |
| External Outputs | ~12 result screens | Average | 5 | 60 |
| External Inquiries | ~8 searches/lookups | Average | 4 | 32 |
| Internal Logical Files | 7 tables | Average | 10 | 70 |
| External Interface Files | 2 (Overpass, tiles) | Average | 7 | 14 |
| **Unadjusted FP** | | | | **236** |

Apply the 14 general system characteristics to get the adjustment factor, then
report adjusted function points and derive effort using a productivity figure you
state.

### 5.7.3 Actual cost

| Item | Cost |
|---|---|
| Software licences | R0 — all tools free or open source |
| Hosting | R0 — free tier |
| Database | R0 — free tier |
| External data | R0 — open data |
| Domain (optional) | ~R200/year |
| Labour | Student effort; cost at a notional rate |
| **Direct monetary cost** | **R0** |

## 5.8 Reports

The guidelines ask for sample report layouts. The system generates several
outputs that function as reports — present each with a screenshot and a
description of its layout, fields and source:

1. **Feeding plan** — calorie target, portions, meal schedule, water, macro
   profile
2. **Food safety verdict** — item, verdict, reason, action, species scope
3. **Wellness result** — score, band, guidance
4. **Practice list** — name, distance, address, hours, contact
5. **Question thread** — question with professional answers and verification
   badges
6. **Vet queue summary** — counts and the species breakdown chart
7. **Administrative summary** — post count, professional counts, verification
   backlog

For each: purpose, audience, fields, source of each field, and layout.

## 5.9 Debugging and Code Improvement

The guidelines list this under Testing. Describe the methods actually used:

| Method | Applied to |
|---|---|
| Browser developer console | JavaScript errors; the CORS diagnosis in D-02 |
| Network inspection | Confirming which requests failed and why |
| Server-side logging with per-attempt detail | The practice-finder mirror failures |
| Executing the schema against a real engine | D-05, and all the trigger and constraint testing |
| Purpose-written verification scripts | Nutrition, food-safety matching, geometry |
| Type checking | Caught a large class of defects before runtime |
| Differential diagnosis | D-11: comparing `/globe.svg` against `/` |
| Instrumented diagnostics returned in the API response | Per-mirror outcome and timing |

**Include one worked debugging narrative in full.** D-02 is the best:

> The practice finder returned "We couldn't reach the practice directory" on
> every request. The query was unchanged and had previously worked. Testing the
> external service from a terminal produced a 406 response, suggesting the
> service was rejecting the request — but the same test from a second network
> produced a different result, indicating the terminal environment itself was
> being blocked and was therefore not representative.
>
> Testing from the actual browser produced the decisive evidence in the console:
>
> ```
> Access to fetch at 'https://overpass-api.de/api/interpreter' from origin
> 'https://pet-pal-kappa.vercel.app' has been blocked by CORS policy: No
> 'Access-Control-Allow-Origin' header is present on the requested resource.
> ```
>
> The request was reaching the service and the response was returning; the
> browser was refusing to let the page read it. Cross-origin restrictions are
> enforced by browsers and not by servers, so the resolution was to move the
> request to the application server, where the restriction does not apply.

This narrative shows a hypothesis being formed, tested, discarded on evidence,
and replaced — which is what debugging actually is.

## 5.10 Future Scope and Enhancements

Group by feasibility; prioritised realism scores better than a wish list.

**Near term**
- Automated regression suite (Vitest for logic, Playwright for flows) in CI
- Expand the food-safety database beyond 89 entries, with sources cited per entry
- Extend the bundled practice dataset beyond South Africa
- Weight tracking over time with a trend chart
- Reminders for vaccinations and medication

**Medium term**
- An administrator interface for editing the food-safety database, with review
- Private follow-up between an owner and the professional who answered
- Photo uploads for pets
- Data export for an owner's own records
- Multi-owner households sharing a pet

**Longer term**
- Native mobile applications
- Integration with a veterinary register to automate verification
- Practice-side integration for appointments
- Localisation

**Explicitly rejected, with reasons** — this is worth including:
- **Practice ratings.** We have no rating data, and in an emergency context an
  unsubstantiated rating is worse than none.
- **Diagnosis.** Outside the system's competence and its stated scope.
- **Advertising.** Would compromise the neutrality of the practice finder.

## 5.11 Bibliography

Use one citation style consistently. Include:

- The module guidelines PDF
- Schwalbe, K. *Information Technology Project Management*, 9th edition
  (prescribed)
- *Contemporary Project Management*, 5th edition (recommended)
- Next.js documentation
- React documentation
- Supabase documentation
- PostgreSQL documentation on row-level security
- OpenStreetMap and the Overpass API
- Three.js documentation
- Your veterinary sources for the RER/MER formulas — **cite these carefully;**
  they are the basis of a health-relevant calculation
- Your toxicity sources
- Inigo Quilez's articles on signed distance functions (the basis of the 3D
  geometry and the ambient occlusion method)

## 5.12 Appendices

- A: Complete source listing, or a link to the repository with the commit hash
- B: Complete `supabase/schema.sql`
- C: Full test case log
- D: Interview instrument and raw responses
- E: Meeting minutes with attendance
- F: Gantt and PERT charts at full size
- G: Screenshots of every screen, in both themes
- H: `SETUP.md`

## 5.13 Glossary

Reproduce `01-SYSTEM-REFERENCE.md` Part 15, extended with any term you use.

---

# Final checklist before you submit Phase 5

- [ ] Cover page, table of contents, numbering throughout
- [ ] 5.1 Introduction **with the deviations table**
- [ ] 5.2 Coding — environment, organisation, standards
- [ ] 5.2 Ten code segments presented and explained
- [ ] 5.2 **Code efficiency** with concrete measures
- [ ] 5.2 **Error handling** with the rollback pattern
- [ ] 5.2 **Parameter passing**
- [ ] 5.2 **Validation checks**, two-tier table
- [ ] 5.3 Testing strategy, levels and techniques named
- [ ] 5.3 Test plan with entry and exit criteria
- [ ] 5.4 Test cases in a consistent format
- [ ] 5.4 Unit, integration and system cases all present
- [ ] 5.4 **Defect log with root-cause analysis**
- [ ] 5.4 Full narrative for each severity-1 defect
- [ ] 5.4 Test summary with coverage statement
- [ ] 5.5 Installation procedure with screenshots
- [ ] 5.5 First-administrator procedure documented
- [ ] 5.6 **Security measures** with the access matrix
- [ ] 5.7 **Cost estimation with a named model** and the arithmetic
- [ ] 5.7 Honest discussion of the model-versus-reality gap
- [ ] 5.8 **Sample report layouts**
- [ ] 5.9 Debugging, with one full narrative
- [ ] 5.10 **Future scope**
- [ ] 5.11 **Bibliography**
- [ ] 5.12 **Appendices**
- [ ] 5.13 **Glossary**
- [ ] Live URL stated, and working on the day
- [ ] Exported to PDF and checked

---

# One last thing — presentation counts for 50%

The guidelines state plainly: *"Project Documentation carries 50% of the overall
project and Project presentation by the individual student will carry 50%."*

**Each student is assessed individually on the presentation.** Every member must
be able to explain the whole system, not only their own part.

Prepare for these, because they are the ones that get asked:

1. Why did you choose this architecture?
2. Walk me through what happens when a user signs up.
3. How do you stop one user seeing another user's data? *(Answer: row-level
   security in the database — and be able to say why the interface alone is not
   enough.)*
4. Show me the hardest bug you fixed and how you found it. *(Use D-01 or D-02.)*
5. What would you do differently?
6. What happens if the external map service is down? *(Four mirrors, then
   bundled data, clearly labelled.)*
7. Why is a vet not a separate account type?
8. Is `answer_count` not redundant? *(Yes — a deliberate, justified
   denormalisation maintained by a trigger.)*
9. How did you test this?
10. What are the limitations of your system? *(Have a real answer. §5.6 of the
    System Reference lists ten.)*

**Rehearse a live demonstration and have a fallback.** Free-tier databases pause
after about a week idle, and the external practice directory has no uptime
guarantee. Open the site the day before, and have screenshots ready in case the
network in the room fails.

---

*End of the phase guides.*
