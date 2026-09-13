# PetPal — Complete Project Guide

**What this document is for.**
Everything you need to write the remaining documentation phases (Planning,
Analysis, Design, Implementation) without having to read or understand the code.
Every diagram you have to draw, every requirement you have to list, and every
table you have to fill in is described here in plain language, with the real
values taken from the actual system.

**How to use it.** Jump to [Part 9](#part-9--what-to-write-in-each-phase) to see
exactly which section of this guide feeds which section of your report.

---

## Contents

1. [What PetPal is](#part-1--what-petpal-is)
2. [The technology, explained simply](#part-2--the-technology-explained-simply)
3. [Every folder and file](#part-3--every-folder-and-file)
4. [Every screen](#part-4--every-screen)
5. [The database](#part-5--the-database)
6. [How data moves (for your DFDs)](#part-6--how-data-moves-for-your-dfds)
7. [Requirements, ready to paste](#part-7--requirements-ready-to-paste)
8. [Design detail](#part-8--design-detail)
9. [What to write in each phase](#part-9--what-to-write-in-each-phase)
10. [Test cases](#part-10--test-cases)
11. [Glossary](#part-11--glossary)

---

# Part 1 — What PetPal is

## The one-paragraph version (safe to reuse in any report)

PetPal is a responsive web application that brings the day-to-day care of a
companion animal into one place. It gives pet owners a feeding plan calculated
from veterinary energy formulas, an instant food-and-plant safety checker, a
directory of real veterinary practices near them, a guided wellness assessment,
a structured four-week plan for a new puppy or kitten, a library of care guides,
and a moderated community wall. It supports dogs, cats, rabbits, birds, reptiles
and small pets.

## The problem it solves

| Problem | How PetPal addresses it |
|---|---|
| Owners guess portion sizes, and over half of pets are overweight | Nutrition Planner calculates exact daily calories and grams from body weight, species, life stage, activity and body condition |
| Owners accidentally feed toxic food | Food Safety Checker with 89 verified entries, giving the clinical reason and the action to take |
| Finding a vet in an emergency is slow | Find a Vet maps real practices near the user's location |
| Health information is scattered and unreliable | 21 care guides written in one consistent voice |
| New owners don't know where to start | A four-week care plan, with separate puppy and kitten tracks |
| Owners feel alone | An anonymous community wall |
| Owners can't get a professional opinion on a non-urgent worry without paying for a consultation | **Ask a Vet** — post a question, a verified vet answers, and the whole archive is public |

## Who uses it (your actors)

| Actor | What they can do |
|---|---|
| **Visitor** (not signed in) | Browse the landing page, use the Nutrition Planner, Food Safety Checker, Find a Vet, Wellness Check, Care Plan, Care Guides, read the community wall and read Ask a Vet |
| **Pet Owner** (signed in) | Everything a visitor can do, plus create and manage pet profiles, see a personal dashboard, save settings, post to the wall, and **ask a question on Ask a Vet** |
| **Veterinary Professional** (signed in) | Everything an owner can do, plus — **once verified by an administrator** — answering questions on Ask a Vet under a verified badge |
| **Administrator** | Everything an owner can do, plus the admin console and verifying veterinary professionals |
| **Supabase** (external system) | Stores accounts and data, enforces access rules |
| **OpenStreetMap** (external system) | Supplies real veterinary practice locations |

> **Note for your report.** The tools are deliberately usable without an account.
> This is a design decision worth defending: in an emergency, nobody stops to
> register before checking whether chocolate is poisonous.

## The two user types

PetPal is a **two-sided** system. Both sides sign up through the same form and
choose their account type.

| | Pet Owner | Veterinary Professional |
|---|---|---|
| Chooses at sign-up | "Pet owner" | "Veterinary pro" |
| Extra details captured | — | Full name, practice, registration number |
| `profiles.role` | `user` | `vet` |
| Extra table | — | `vet_profiles` |
| Trusted immediately? | n/a | **No.** Created `verified = false` |
| Can use every owner tool | Yes | Yes |
| Can ask a question | Yes | Yes |
| Can **answer** a question | No | Only once verified |

**Why verification is manual, and why it matters for your report.** A
self-declared "vet" badge on clinical advice is dangerous — someone could tell
an owner that a toxic food is safe and carry a professional badge while doing
it. So a new professional account is created unverified; an administrator checks
the registration number against the professional register before setting
`verified = true`.

Crucially, that rule is enforced by a **row-level security policy in the
database**, not by hiding a button in the interface:

```sql
create policy "verified vets answer" on answers for insert
  with check (
    auth.uid() = vet_id
    and exists (
      select 1 from vet_profiles v
      where v.id = auth.uid() and v.verified = true
    )
  );
```

If it were enforced only in the front end, anyone could post an answer carrying
a vet badge by calling the API directly. This is a good example to cite in your
Security section.

---

# Part 2 — The technology, explained simply

## The stack

| Layer | What we used | What it does, in plain terms |
|---|---|---|
| **Language** | TypeScript | JavaScript with type checking. Catches mistakes before the code runs. |
| **Framework** | Next.js 16 | Organises the pages, decides what is built on the server vs the browser. |
| **UI library** | React 19 | Builds the interface out of reusable pieces called components. |
| **Styling** | Tailwind CSS 4 | Styling written as short class names directly on elements. |
| **Animation** | Framer Motion | The fades and slides as things appear. |
| **3D** | Three.js | The particle animals on the landing page. |
| **Charts** | Recharts | The weight graph and the macro radar chart. |
| **Maps** | Leaflet + React-Leaflet | The map on Find a Vet. |
| **Database** | Supabase (PostgreSQL) | Stores accounts, pets and posts. |
| **Hosting** | Vercel | Puts the site on the internet. |
| **Version control** | Git + GitHub | History of every change. |

## Two words you will be asked about

**Client Component** — code that runs in the visitor's browser. Anything
interactive (a button, a slider, the 3D scene) must be one. Marked with
`'use client'` at the top of the file.

**Server Component** — code that runs on the server before the page is sent.
Faster and can safely hold secrets. The default in Next.js 16.

Most of PetPal's pages are Client Components because almost every screen is
interactive.

## Why these choices (for your feasibility section)

- **TypeScript** — catches a whole class of bugs at compile time rather than in
  front of a marker during a demo.
- **Next.js** — one framework for front end and back end, so there is one
  codebase and one deployment.
- **Supabase over building our own back end** — gives authentication, a real
  relational database and row-level security out of the box. Building equivalent
  auth from scratch would have consumed the whole project timeline.
- **PostgreSQL** — genuinely relational, which supports the entity-relationship
  modelling and normalisation this module requires.
- **Everything is free at our scale** — no licence costs, which is the core of
  the economic feasibility argument.

---

# Part 3 — Every folder and file

```
demo-master/
├── app/                      ← every page of the website
│   ├── page.tsx                 the landing page
│   ├── layout.tsx               the shell wrapped around every page
│   ├── globals.css              all colours, fonts and shared styles
│   ├── setup/                   connection diagnostics page
│   ├── auth/                    sign in, sign up, forgot password
│   └── (dashboard)/             every tool and logged-in screen
├── components/               ← reusable interface pieces
│   ├── public/                  landing-page pieces (3D, hero, navbar, logo)
│   ├── layout/                  the sidebar and the chrome switcher
│   └── ui/                      generic buttons, inputs, cards, tables
├── lib/                      ← the logic, with no interface attached
├── supabase/
│   └── schema.sql               the whole database in one file
├── public/                   ← images served as-is
├── SETUP.md                  ← how to deploy it
├── PROJECT-GUIDE.md          ← this file
└── package.json              ← the list of libraries used
```

## `app/` — the pages

Next.js uses **folder names as web addresses**. A folder containing `page.tsx`
becomes a page. `app/(dashboard)/nutrition/page.tsx` is the page at `/nutrition`.

Brackets like `(dashboard)` group files **without** adding to the address — they
exist so every tool page can share one layout.

| File | Address | What it is |
|---|---|---|
| `app/page.tsx` | `/` | Landing page |
| `app/setup/page.tsx` | `/setup` | Connection diagnostics |
| `app/auth/login/page.tsx` | `/auth/login` | Sign in |
| `app/auth/signup/page.tsx` | `/auth/signup` | Create account |
| `app/auth/forgot-password/page.tsx` | `/auth/forgot-password` | Password reset |
| `app/auth/callback/route.ts` | `/auth/callback` | Handles the emailed link |
| `app/(dashboard)/dashboard/page.tsx` | `/dashboard` | Owner's home screen |
| `app/(dashboard)/pets/page.tsx` | `/pets` | List of the owner's pets |
| `app/(dashboard)/add-pet/page.tsx` | `/add-pet` | Add a pet form |
| `app/(dashboard)/nutrition/page.tsx` | `/nutrition` | Feeding planner |
| `app/(dashboard)/food-safety/page.tsx` | `/food-safety` | Safety checker |
| `app/(dashboard)/vet-finder/page.tsx` | `/vet-finder` | Map of vets |
| `app/(dashboard)/wellness/page.tsx` | `/wellness` | Health questionnaire |
| `app/(dashboard)/care-plan/page.tsx` | `/care-plan` | Four-week plan |
| `app/(dashboard)/resources/page.tsx` | `/resources` | 21 care guides |
| `app/(dashboard)/wall/page.tsx` | `/wall` | Community wall |
| `app/(dashboard)/settings/page.tsx` | `/settings` | Account settings |
| `app/(dashboard)/admin/page.tsx` | `/admin` | Admin console |

## `lib/` — the logic

**This is the most important folder for your documentation.** It holds the rules
of the system separated from how they are displayed. Each file is one
responsibility.

| File | Lines | What it does |
|---|---|---|
| `nutrition.ts` | 195 | The feeding calculation. Species data, the RER/MER formulas, input clamping. **Every calorie number in the app comes from here.** |
| `food-safety.ts` | 770 | The 89-entry food and plant database, and the matching algorithm that decides which entry a search means. |
| `vets.ts` | 140 | Fetches real veterinary practices from OpenStreetMap; distance calculation. |
| `animal-shapes.ts` | 238 | Draws each animal silhouette and converts it into 3D points for the landing page. |
| `storage.ts` | 137 | Safe reading/writing of browser storage, with migration of old keys. |
| `types.ts` | 89 | The shape of a Pet, a Profile, a WallPost — used across the app. |
| `use-client-value.ts` | 67 | Lets a component read browser-only values without a double render. |
| `utils.ts` | 49 | Date formatting and class-name merging. |
| `supabase/client.ts` | 34 | Creates the database connection in the browser. |
| `supabase/server.ts` | 22 | Creates it on the server. |
| `supabase/errors.ts` | 164 | Turns cryptic errors into readable ones; the health probe used by `/setup`. |
| `auth.ts` | 27 | Checks whether a user is an administrator. |

## `components/` — the interface pieces

| File | What it draws |
|---|---|
| `public/AnimalField.tsx` | The 3D particle animals behind the landing page |
| `public/Hero.tsx` | The headline, sub-copy and buttons at the top |
| `public/Navbar.tsx` | The floating top navigation |
| `public/Logo.tsx` | The paw logo |
| `layout/DashboardSidebar.tsx` | The left sidebar when signed in |
| `layout/AppChrome.tsx` | Decides whether to show the navbar or the sidebar |
| `VetMap.tsx` | The Leaflet map |
| `SiteEffects.tsx` | Scroll progress bar and cursor glow |
| `ui/*` | Generic building blocks (button, input, card, table, dialog…) |

## Root configuration files

| File | Purpose |
|---|---|
| `package.json` | Every library the project depends on |
| `next.config.ts` | Image settings and the `/vets → /vet-finder` redirect |
| `tsconfig.json` | TypeScript settings |
| `eslint.config.mjs` | Code-quality rules |
| `proxy.ts` | Runs before every request; redirects signed-out users away from private pages |
| `.gitignore` | Files never uploaded (including `.env.local`, which holds your keys) |

---

# Part 4 — Every screen

For each screen: what the user sees, what they can do, and where the data comes
from. **"Local only" means it does not touch the database.**

### Landing page — `/`
- **Shows:** 3D animals that morph as you scroll, headline, statistics, feature
  grid, a live nutrition demo, testimonials, FAQ, footer.
- **User can:** try the feeding calculator without an account, navigate anywhere.
- **Data:** local only. The demo uses `lib/nutrition.ts`.

### Sign up — `/auth/signup`
- **Shows:** name, email, password fields.
- **User can:** create an account.
- **Data:** writes to Supabase `auth.users`; a trigger creates the `profiles` row.
- **Validation:** password at least 8 characters; email format; duplicate email
  rejected by Supabase.

### Sign in — `/auth/login`
- **Shows:** email and password.
- **Data:** Supabase authentication. On success a session cookie is set.
- **Errors:** distinguishes a wrong password from the database being unreachable,
  and links to `/setup` when it is a configuration problem.

### Forgot password — `/auth/forgot-password`
- **Data:** Supabase sends a recovery email. Always shows the same confirmation
  whether or not the address exists, so the page cannot be used to discover who
  has an account.

### Dashboard — `/dashboard`
- **Shows:** the owner's pets, upcoming reminders, a weight trend chart, quick
  actions.
- **Data:** reads `pets` for the signed-in owner.
- **Protected:** signed-out visitors are redirected to sign in.

### My Pets — `/pets`, Add a Pet — `/add-pet`
- **Shows / does:** lists pet profiles; the form captures name, species, breed,
  age, weight and sex.
- **Data:** reads and writes `pets`.
- **Validation:** name required; weight must be a positive number.

### Nutrition Planner — `/nutrition`
- **Shows:** species picker, weight slider, life stage, activity level, body
  condition. Outputs daily calories, food in grams, meals per day, water target
  and a macro chart.
- **Data:** local only — pure calculation, no database.
- **Logic:** `lib/nutrition.ts`. See [Part 8](#the-feeding-calculation) for the
  formula and pseudocode.

### Food Safety Checker — `/food-safety`
- **Shows:** a search box, quick-pick chips, and a verdict card (Safe / In
  moderation / Do not feed) with the clinical reason, which animals it affects,
  and what to do.
- **Data:** local only — 89 entries in `lib/food-safety.ts`.
- **Important behaviour:** an unrecognised item is reported as *unverified* with
  suggestions, never guessed. See [Part 8](#the-food-safety-matching-algorithm).

### Find a Vet — `/vet-finder`
- **Shows:** a map and a distance-sorted list of real practices.
- **Data:** browser geolocation (with permission) → OpenStreetMap Overpass API.
- **Honest by design:** no star ratings, because OpenStreetMap does not hold
  them. A "Call" button only appears when a verified phone number exists.
- **Fallbacks:** location denied → searches around a default city; the directory
  unreachable → an error with a retry, never invented clinics.

### Wellness Check — `/wellness`
- **Shows:** eight questions, one at a time, then a 0–100 score and advice.
- **Data:** local only.
- **Scoring:** each answer is 0–3; score = (total ÷ maximum) × 100.

### Care Plan — `/care-plan`
- **Shows:** a four-week checklist with a puppy track and a kitten track.
- **Data:** progress saved in browser storage (`petpal_careplan`).

### Care Guides — `/resources`
- **Shows:** 21 guides, filterable by category, opening in a reader.
- **Data:** local only.

### Community Wall — `/wall`
- **Shows:** anonymous posts with a mood tag and a heart count.
- **User can:** post (10–280 characters) and heart a post once per browser.
- **Data:** reads and writes `confessions`; hearts go through the
  `increment_hearts` database function.

### Ask a Vet — `/ask`
- **Shows:** a question board. Each question expands to show its answers, with a
  verified-vet badge, the vet's name and practice.
- **User can:** read without an account; ask a question when signed in; answer
  only as a **verified** veterinary professional.
- **Data:** reads and writes `questions` and `answers`, joining `vet_profiles`
  for the answering vet's name.
- **Safety:** a prominent notice states this is not an emergency service and
  links to the vet finder, because a Q&A board must never become the thing
  someone waits on during a crisis.

### Settings — `/settings`
- **Shows:** profile, notifications, privacy, appearance, account tabs.
- **Data:** display name → Supabase; preferences → browser storage.

### Admin console — `/admin`
- **Shows:** overview statistics, community moderation, vets, owners.
- **Access:** only for a profile with `role = 'admin'`.
- **⚠️ Honest limitation:** this screen currently displays **demonstration data,
  not live records**. Say so in your report rather than claiming otherwise.

### Setup check — `/setup`
- **Shows:** a pass/fail list for every connection requirement.
- **Purpose:** turns "Failed to fetch" into a named, fixable cause.

---

# Part 5 — The database

Three tables. Everything is in `supabase/schema.sql`.

## Table: `profiles`

One row per registered user.

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, references `auth.users` | Same id as the login |
| `email` | text | | Their email |
| `display_name` | text | | Shown in the app |
| `avatar_url` | text | | Profile picture |
| `role` | text | Default `'user'`, must be `'user'` or `'admin'` | Permission level |
| `created_at` | timestamptz | Defaults to now | When they joined |

## Table: `pets`

One row per animal.

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, auto-generated | Unique id |
| `owner_id` | uuid | References `auth.users`, cascade delete | Who owns it |
| `name` | text | **Required** | Pet's name |
| `species` | text | Must be one of dog, cat, bird, rabbit, fish, reptile, small, other | Kind of animal |
| `breed` | text | Optional | Breed |
| `age` | text | Optional | Free text ("3 years") |
| `weight` | numeric | Must be greater than 0 if given | Kilograms |
| `sex` | text | male / female / unknown | Sex |
| `photo_url` | text | Optional | Photo |
| `created_at` | timestamptz | Defaults to now | When added |

## Table: `confessions` (the community wall)

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, auto-generated | Unique id |
| `text` | text | **Required**, 10–280 characters | The post |
| `mood` | text | happy / proud / help / sad | Tag |
| `hearts` | int | Default 0, cannot go negative | Like count |
| `created_at` | timestamptz | Defaults to now | When posted |

> There is deliberately **no** `user_id`. The wall is anonymous by design —
> nothing links a post to an account.

## Table: `vet_profiles`

The professional detail for a `vet` account. Separate from `profiles` so an
owner's row stays lean.

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, references `auth.users` | Same id as the login |
| `full_name` | text | **Required** | Name shown beside answers |
| `practice_name` | text | Optional | Clinic or practice |
| `city` / `country` | text | Optional | Where they practise |
| `registration_no` | text | Optional | Checked during verification |
| `specialities` | text | Optional | e.g. exotics, surgery |
| `bio` | text | Optional | Short professional bio |
| `verified` | boolean | Default **false** | Only true after an admin checks the register |
| `created_at` | timestamptz | Defaults to now | When registered |

## Table: `questions`

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, auto-generated | Unique id |
| `asker_id` | uuid | References `auth.users`, set null on delete | Who asked |
| `title` | text | **Required**, 10–140 characters | One-line summary |
| `body` | text | **Required**, 20–1200 characters | The detail |
| `species` | text | One of the eight species | What kind of pet |
| `resolved` | boolean | Default false | Author marks it done |
| `answer_count` | int | Default 0, cannot go negative | Kept in step by a trigger |
| `created_at` | timestamptz | Defaults to now | When asked |

## Table: `answers`

| Column | Type | Rules | Meaning |
|---|---|---|---|
| `id` | uuid | Primary key, auto-generated | Unique id |
| `question_id` | uuid | References `questions`, cascade delete | Which question |
| `vet_id` | uuid | References `auth.users`, set null on delete | Which vet |
| `body` | text | **Required**, 20–2000 characters | The answer |
| `created_at` | timestamptz | Defaults to now | When answered |

> **Trigger worth mentioning in your Design phase.** `answer_count` on a
> question is maintained by a database trigger (`bump_answer_count`) on insert
> and delete, rather than being recalculated by the app. The count can therefore
> never drift out of step with the rows it counts.

## Relationships (your ER diagram)

```
   auth.users  (managed by Supabase)
        │ 1
        ├───────── 1 ─────  profiles        (one-to-one extension, same id)
        │
        ├───────── 0..1 ──  vet_profiles    (only for a 'vet' account)
        │
        ├───────── 0..* ──  pets            (an owner owns many pets)
        │
        ├───────── 0..* ──  questions       (asker_id)
        │
        └───────── 0..* ──  answers         (vet_id)

   questions  ── 1 ────── 0..* ──  answers  (a question has many answers)

   confessions  ── standalone, no relationship (anonymous by design)
```

**In words, for your report:**
- One user **has one** profile (one-to-one).
- A user **may have** one vet profile — only if they registered as a
  professional (one-to-zero-or-one).
- One user **owns many** pets (one-to-many).
- One user **asks many** questions; one vet **writes many** answers.
- One question **has many** answers (one-to-many).
- `confessions` has no relationship to any other table.

**Cardinality notation:** `users (1) ──── (0..*) pets`

## Normalisation (they will ask)

The schema is in **Third Normal Form**:

| Form | Why it holds |
|---|---|
| **1NF** | Every column holds a single value. No repeating groups or comma-separated lists. |
| **2NF** | In 1NF, and every non-key column depends on the whole primary key. All three tables use a single-column key, so partial dependency is impossible. |
| **3NF** | In 2NF, and no non-key column depends on another non-key column. For example `pets.breed` depends only on `pets.id`, not on `pets.species`. |

## Data integrity and constraints

| Type | Where it is used | Example |
|---|---|---|
| **Primary key** | All three tables | `pets.id` |
| **Foreign key** | `profiles.id`, `pets.owner_id` | `pets.owner_id → auth.users.id` |
| **Referential integrity** | Cascade delete | Deleting a user deletes their pets automatically |
| **Check constraint** | species, sex, role, mood, hearts, text length | `hearts >= 0` |
| **Not null** | `pets.name`, `confessions.text` | A pet must have a name |
| **Default** | `created_at`, `hearts`, `role` | `hearts` starts at 0 |
| **Unique** | Primary keys | No two pets share an id |

## Security: Row-Level Security (RLS)

This is worth a whole section in your Design phase.

RLS means **the database itself** decides which rows a user may see — not the
app. Even if the front end had a bug, a user still could not read another user's
pets.

| Table | Rule |
|---|---|
| `profiles` | Read/update only where `auth.uid() = id` |
| `pets` | Read/insert/update/delete only where `auth.uid() = owner_id` |
| `confessions` | Anyone may read and insert (it is a public anonymous wall) |
| `vet_profiles` | Anyone may read (details appear beside answers); only the vet may insert or update their own |
| `questions` | Anyone may read; only a signed-in user may insert, and only as themselves |
| `answers` | Anyone may read; **only a verified vet may insert**, checked against `vet_profiles.verified` |

Hearts use a `SECURITY DEFINER` function instead of an update policy. Two
reasons, both worth stating: an update policy would also let anyone rewrite the
post text, and `hearts = hearts + 1` inside the database is atomic, so two
simultaneous likes cannot overwrite each other.

---

# Part 6 — How data moves (for your DFDs)

## Context diagram (Level 0)

The whole system as one box.

```
   ┌──────────┐   pet details, searches, posts    ┌─────────────┐
   │          │ ───────────────────────────────►  │             │
   │ Pet      │                                    │             │
   │ Owner    │ ◄─────────────────────────────── │   PetPal    │
   └──────────┘   plans, verdicts, vet lists       │   System    │
                                                    │             │
   ┌──────────┐   moderation actions               │             │
   │ Admin    │ ─────────────────────────────────► │             │
   └──────────┘                                    └──────┬──────┘
                                                           │
                    account + pet data  ┌──────────────────┴────┐
                    ◄──────────────────►│  Supabase (database)  │
                                         └───────────────────────┘
                    practice locations  ┌───────────────────────┐
                    ◄──────────────────►│  OpenStreetMap        │
                                         └───────────────────────┘
```

## Level 1 — the main processes

Draw these as numbered circles.

| # | Process | Input | Output | Data store used |
|---|---|---|---|---|
| 1.0 | Manage Account | email, password | session | D1 profiles |
| 2.0 | Manage Pets | pet details | saved profile | D2 pets |
| 3.0 | Calculate Feeding Plan | species, weight, stage, activity, condition | calories, grams, meals | none |
| 4.0 | Check Food Safety | search term | verdict + action | none (in-app database) |
| 5.0 | Find Vets | location | ranked practice list | external: OpenStreetMap |
| 6.0 | Assess Wellness | 8 answers | score + advice | none |
| 7.0 | Track Care Plan | ticked steps | progress % | browser storage |
| 8.0 | Community Wall | post text, mood | published post | D3 confessions |
| 9.0 | Administer | moderation actions, vet verification | updated content, verified vets | D1, D3, D4 |
| 10.0 | Ask a Vet | question text, species | published question | D5 questions |
| 11.0 | Answer a Question | answer text (verified vets only) | published answer | D5, D6 answers |

**Data stores:**
- **D1** — profiles
- **D2** — pets
- **D3** — confessions
- **D4** — vet_profiles
- **D5** — questions
- **D6** — answers
- **D7** — browser local storage (care plan progress, settings, hearts given)

## Level 2 example — Process 3.0, Calculate Feeding Plan

```
 species, weight,          ┌──────────────┐
 life stage, activity ────►│ 3.1 Validate │──► clamped, safe values
 body condition            │  and clamp   │
                           └──────┬───────┘
                                  ▼
                           ┌──────────────┐
                           │ 3.2 Calculate│  RER = 70 × weight^0.75
                           │     RER      │
                           └──────┬───────┘
                                  ▼
                           ┌──────────────┐
                           │ 3.3 Apply    │  × activity × life stage
                           │  multipliers │  × species × condition
                           └──────┬───────┘
                                  ▼
                           ┌──────────────┐
                           │ 3.4 Convert  │──► grams, meals, water, cups
                           │  to portions │
                           └──────────────┘
```

## Sequence: a user signs in

1. User types email and password, presses Sign In.
2. Browser sends them to Supabase Auth.
3. Supabase checks the credentials.
4. If correct, Supabase returns a session and the browser stores a cookie.
5. The browser navigates to `/dashboard`.
6. `proxy.ts` checks the cookie before the page loads.
7. The dashboard requests that user's pets.
8. Row-Level Security filters the result to that user's rows only.
9. The dashboard renders.

## Sequence: checking a food

1. User types "chicken".
2. The text is normalised (lowercased, punctuation stripped).
3. Every alias of all 89 entries is scored against it.
4. The highest-scoring (most specific) match wins.
5. The verdict, reason and action are displayed.
6. If nothing matches, an *unverified* message with suggestions is shown.

*No network request happens — the whole database ships with the app, so it works
offline and instantly.*

---

# Part 7 — Requirements, ready to paste

## Functional requirements

Numbered so you can reference them in test cases.

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow a visitor to create an account with an email address and a password of at least 8 characters. |
| FR-02 | The system shall allow a registered user to sign in and sign out. |
| FR-03 | The system shall allow a user to request a password-reset email. |
| FR-04 | The system shall prevent unauthenticated users from accessing the dashboard, pet management, settings and admin pages. |
| FR-05 | The system shall allow a signed-in user to create a pet profile recording name, species, breed, age, weight and sex. |
| FR-06 | The system shall display all pets belonging to the signed-in user, and only those pets. |
| FR-07 | The system shall calculate a daily energy requirement from species, body weight, life stage, activity level and body condition. |
| FR-08 | The system shall convert that energy requirement into food quantity in grams, meals per day and a daily water target. |
| FR-09 | The system shall support at least six species in the feeding calculation. |
| FR-10 | The system shall classify a searched food, plant or household item as safe, safe in moderation, or toxic. |
| FR-11 | The system shall display the clinical reason, the affected species and the recommended action for each safety result. |
| FR-12 | The system shall report an unrecognised item as unverified and shall not guess a verdict. |
| FR-13 | The system shall retrieve veterinary practices near the user's location from an external directory and rank them by distance. |
| FR-14 | The system shall display a practice's telephone number only where one is verified in the source data. |
| FR-15 | The system shall present an eight-question wellness assessment and produce a score from 0 to 100 with advice. |
| FR-16 | The system shall provide a four-week care plan with separate puppy and kitten tracks, and persist progress. |
| FR-17 | The system shall provide a searchable, filterable library of care guides. |
| FR-18 | The system shall allow any user to post anonymously to the community wall, between 10 and 280 characters. |
| FR-19 | The system shall permit one heart per post per browser. |
| FR-20 | The system shall allow a signed-in user to update their display name and interface preferences. |
| FR-21 | The system shall restrict the administration console to users with the administrator role. |
| FR-22 | The system shall provide a diagnostics page reporting the status of each external dependency. |
| FR-23 | The system shall allow a visitor to register either as a pet owner or as a veterinary professional. |
| FR-24 | The system shall capture a veterinary professional's full name, practice and registration number at sign-up. |
| FR-25 | The system shall create every veterinary professional account in an unverified state. |
| FR-26 | The system shall allow any signed-in user to post a question, specifying the species concerned. |
| FR-27 | The system shall permit only verified veterinary professionals to post answers. |
| FR-28 | The system shall display the answering professional's name, practice and verified status beside each answer. |
| FR-29 | The system shall make all questions and answers readable without an account. |
| FR-30 | The system shall state that Ask a Vet is not an emergency service and link to the vet finder. |

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Usability | Every core tool shall be usable without creating an account. |
| NFR-02 | Usability | The interface shall be operable on screens from 375 px to 2560 px wide. |
| NFR-03 | Accessibility | The system shall honour the operating system's "reduce motion" setting by disabling animation. |
| NFR-04 | Accessibility | Interactive controls shall be reachable by keyboard and shall expose accessible labels. |
| NFR-05 | Performance | The 3D scene shall stop rendering when not visible, and shall cap device pixel ratio at 2. |
| NFR-06 | Performance | The 3D assets shall be loaded only after the page text has rendered. |
| NFR-07 | Security | Each user's pet records shall be readable only by that user, enforced at database level. |
| NFR-08 | Security | Passwords shall never be stored by the application; authentication is delegated to Supabase. |
| NFR-09 | Security | Redirect targets supplied in a URL shall be validated as internal paths. |
| NFR-10 | Reliability | The system shall remain usable for its offline tools when the database is unreachable. |
| NFR-11 | Reliability | A failed database write shall be reported to the user, never reported as success. |
| NFR-12 | Integrity | The system shall never display fabricated clinical, safety or directory information. |
| NFR-13 | Maintainability | The feeding calculation shall exist in exactly one module used by every screen. |
| NFR-14 | Portability | The system shall run in current versions of Chrome, Firefox, Safari and Edge. |
| NFR-15 | Security | The restriction on who may answer a question shall be enforced by a database policy, not by the user interface. |
| NFR-16 | Integrity | A professional credential shall never be self-asserted; verification shall require an administrator to check the registration number. |

> **NFR-12 is worth highlighting in your report.** An earlier version of this
> system displayed invented veterinary practices with invented ratings and a
> fabricated emergency telephone number. Removing that and replacing it with a
> real data source is a genuine, defensible engineering decision — the kind of
> thing markers reward.

## Use cases

| ID | Use case | Actor | Pre-condition | Main flow | Post-condition |
|---|---|---|---|---|---|
| UC-01 | Register | Visitor | None | Enter details → submit → confirm email | Account exists |
| UC-02 | Sign in | Pet Owner | Account exists | Enter credentials → submit | Session active |
| UC-03 | Add a pet | Pet Owner | Signed in | Choose species → enter details → save | Pet stored |
| UC-04 | Plan feeding | Any | None | Set species, weight, stage, activity, condition | Plan displayed |
| UC-05 | Check a food | Any | None | Type item → read verdict | Verdict displayed |
| UC-06 | Find a vet | Any | Location permission | Allow location → view list | Practices listed |
| UC-07 | Assess wellness | Any | None | Answer 8 questions | Score displayed |
| UC-08 | Post to wall | Any | None | Type post → choose mood → post | Post published |
| UC-09 | Moderate | Admin | Admin role | Open console → act | Content updated |
| UC-10 | Register as a vet | Visitor | None | Choose "Veterinary pro" → enter name, practice, registration → submit | Unverified vet account exists |
| UC-11 | Verify a vet | Admin | Admin role, vet account exists | Check registration against the register → set verified | Vet may answer |
| UC-12 | Ask a question | Pet Owner | Signed in | Enter title, detail, species → post | Question visible to all |
| UC-13 | Answer a question | Verified Vet | Verified account | Open question → write answer → post | Answer published with a verified badge |

---

# Part 8 — Design detail

## Architecture — three tiers

```
┌──────────────────────────────────────────────────┐
│  PRESENTATION TIER  (the browser)                │
│  React components, Tailwind styling, Three.js    │
│  Runs on the user's device                       │
└───────────────────┬──────────────────────────────┘
                    │  HTTPS
┌───────────────────▼──────────────────────────────┐
│  APPLICATION TIER  (Next.js on Vercel)           │
│  Routing, proxy.ts access checks, page rendering │
│  Business logic in lib/                          │
└───────────────────┬──────────────────────────────┘
                    │  HTTPS + row-level security
┌───────────────────▼──────────────────────────────┐
│  DATA TIER  (Supabase / PostgreSQL)              │
│  Tables, constraints, RLS policies, functions    │
└──────────────────────────────────────────────────┘

External:  OpenStreetMap Overpass API  (vet practice data)
```

### Hardware architecture (for that section of Phase 4)

- **Client:** any device with a modern browser. Minimum practical: dual-core
  CPU, 2 GB RAM, a 375 px-wide screen. WebGL is used if available; the site works
  without it.
- **Application server:** Vercel's managed serverless platform. No server is
  owned or administered by the team.
- **Database server:** Supabase managed PostgreSQL.

### Network architecture

All traffic is HTTPS. The browser talks to Vercel; the browser also talks
directly to Supabase (using the public anon key, constrained by RLS) and to the
Overpass API. There is no direct browser-to-database socket — Supabase exposes a
REST layer.

## The feeding calculation

**Formula**

```
RER = 70 × (weight in kg) ^ 0.75
MER = RER × activity × lifeStage × species × bodyCondition
```

**Multipliers**

| Factor | Values |
|---|---|
| Activity | Low 1.3 · Normal 1.6 · High 2.0 |
| Life stage | Young 2.0 · Adult 1.0 · Senior 1.1 |
| Species | Dog 1.0 · Cat 0.9 · Rabbit 0.7 · Bird 1.3 · Reptile 0.35 · Small pet 1.1 |
| Body condition | Overweight (4–5) 0.85 · Ideal (3) 1.0 · Thin (1–2) 1.15 |

**Pseudocode — for your Program Design section**

```
FUNCTION ComputeFeedingPlan(species, weight, activity, lifeStage, bodyCondition)

    config ← SpeciesConfig[species]

    // Defend against blank, negative or absurd input
    IF weight is not a valid number THEN weight ← config.defaultWeight
    weight ← CLAMP(weight, 0.05, config.maxWeight)
    activity ← CLAMP(activity, 1.0, 2.5)
    bodyCondition ← CLAMP(bodyCondition, 1, 5)

    // Resting energy requirement
    RER ← 70 × POWER(weight, 0.75)

    // Adjust toward an ideal body condition
    IF bodyCondition ≥ 4 THEN conditionFactor ← 0.85
    ELSE IF bodyCondition ≤ 2 THEN conditionFactor ← 1.15
    ELSE conditionFactor ← 1.0

    stageFactor ← LifeStageFactor[lifeStage]

    MER ← ROUND(RER × activity × stageFactor × config.factor × conditionFactor)
    MER ← MAX(MER, 1)

    dryGrams ← ROUND(MER ÷ config.kcalPerGramDry)
    wetGrams ← ROUND(MER ÷ 1.2)
    meals    ← IF lifeStage = "young" THEN 3 ELSE 2
    water    ← ROUND(weight × config.waterMlPerKg)

    RETURN (MER, dryGrams, wetGrams, meals, dryGrams ÷ meals, water)

END FUNCTION
```

**Worked example** — a 12 kg adult dog, normal activity, ideal condition:

```
RER = 70 × 12^0.75 = 70 × 6.45 = 451 kcal
MER = 451 × 1.6 × 1.0 × 1.0 × 1.0 = 722 kcal/day
Dry food = 722 ÷ 3.5 = 206 g
Meals = 2, so 103 g each
Water = 12 × 55 = 660 ml
```

## The food-safety matching algorithm

**The problem it solves.** A naive substring match caused a dangerous bug: the
query "chicken" matched the alias "chicken bone" and reported plain cooked
chicken as **DO NOT FEED**. A safety tool that cries wolf on safe food trains
users to ignore the warnings that matter.

**Pseudocode**

```
FUNCTION LookupFood(query)

    q ← LOWERCASE(query), punctuation removed, spaces collapsed
    IF LENGTH(q) < 2 THEN RETURN Empty

    best ← NONE

    FOR EACH entry IN FoodDatabase
        FOR EACH alias IN entry.aliases
            score ← 0
            IF q = alias                    THEN score ← 1000
            ELSE IF Singular(q) = Singular(alias) THEN score ← 900
            ELSE IF alias appears as a WHOLE PHRASE inside q
                                            THEN score ← 500 + LENGTH(alias)
            // Deliberately NOT the reverse: "chicken" must not match
            // the alias "chicken bone".

            IF score > 0 AND (best is NONE OR score > best.score)
                best ← (entry, alias, score)
        END FOR
    END FOR

    IF best exists THEN RETURN Found(best.entry)
    RETURN Unverified(query, NearMissSuggestions(q))

END FUNCTION
```

**Why longest-alias-wins:** "chicken bone" (12 characters) outscores "chicken"
(7), so the specific warning still wins when it genuinely applies.

## The 3D animals (for your Implementation section)

The landing page and every tool header render a particle cloud shaped like a
real animal. This is worth writing up because it is the most technically
involved part of the system, and it was rebuilt three times before it worked.

### What it draws

Five specific breeds, not generic animals — a generic dog is nobody’s dog:

| Species | Breed | Modelled features |
|---|---|---|
| Dog | **Beagle** | Drop ears to the jawline, square muzzle, domed skull, barrel chest, tail carried high |
| Cat | **Maine Coon** | Rectangular body, neck ruff, tufted ears, very long bushy tail |
| Bird | **Cockatiel** | Swept-back crest, round head, slim body, long pointed tail |
| Rabbit | **Holland Lop** | Compact cobby body, flat face, ears hanging beside the head |
| Fish | **Ocellaris clownfish** | Deep oval body, blunt head, notched dorsal fin, rounded tail fan |

Two of these are named in the app’s own copy (Biscuit the beagle, Luna the
Maine Coon), so the 3D matches the story the site tells.

### How it is built

Each animal is defined as a **signed distance field** — a function that, for any
point in space, returns how far that point is from the surface. Roughly 30
primitive volumes (ellipsoids for body masses, tapered cones for necks, limbs,
tails and fins) each contribute a distance, and they are combined with a
**smooth minimum** so they fuse into one organic body rather than looking like
a pile of overlapping balls.

Points are then placed on that surface in four steps:

1. pick a primitive at random, weighted by its surface area,
2. take a point on that primitive’s own surface as a starting guess,
3. **project** it onto the fused surface with a few Newton steps — move along
   the gradient by the distance value, repeat,
4. the surface **normal** is the gradient at the final position, which is what
   makes the lighting correct.

### Why it was rebuilt three times (good material for a reflection section)

| Version | Approach | Why it failed |
|---|---|---|
| 1 | Points scattered in a flat slab | Read as cardboard; nothing to light |
| 2 | 2D silhouette inflated by a distance transform | Round, but only correct from one camera angle, and no left/right limbs |
| 3 | Union of 3D primitives, overlaps hard-culled | Correct from all angles, but visible seams at every joint |
| 4 | Signed distance field with smooth blending | One fused organic surface, exact normals |

### Performance decisions worth citing

- Sampling one animal costs about **150 ms**. Building all five on mount froze
  the page for most of a second, so only the opening animal is built
  synchronously and the rest are queued onto **idle time**.
- Distant primitives are skipped when evaluating the field, using a bounding
  sphere test — with 30 parts, only a handful matter at any given point.
- The gradient uses **four-tap tetrahedral** sampling rather than six-tap
  central differences, which is a third cheaper for the same quality.
- Only two shapes sit on the GPU at once; the morph is a lerp between them.
- Points are emitted in a consistent spatial order across all five species, so
  index *i* lands in a comparable place on every body. Without that ordering
  the morph looks like an explosion rather than a transformation.

---

## Interface design

### Menu structure

```
Signed out (top navigation bar)
├── Nutrition
├── Food Safety
├── Find a Vet
├── Wellness
├── Community
├── Guides
├── Sign In
└── Add Your Pet  (call to action)

Signed in (left sidebar)
├── Overview
├── My Pets
├── Add a Pet
├── Nutrition Planner
├── Food Safety
├── Wellness Check
├── Care Plan
├── Find a Vet
├── Community
├── Care Guides
├── Admin Panel   (administrators only)
├── Settings
└── Sign Out
```

### Input design

| Screen | Field | Control | Validation |
|---|---|---|---|
| Sign up | Email | text | valid email, unique |
| Sign up | Password | password | at least 8 characters |
| Add pet | Name | text | required |
| Add pet | Species | button group | one of eight |
| Add pet | Weight | number | greater than 0 |
| Nutrition | Weight | slider | clamped to species range |
| Nutrition | Body condition | slider | 1 to 5 |
| Food safety | Search | text | at least 2 characters |
| Wall | Post | textarea | 10 to 280 characters |

### Output design

| Screen | Output | Format |
|---|---|---|
| Nutrition | Daily energy | large number + "kcal / day" |
| Nutrition | Portions | grams, cups, meals, millilitres |
| Nutrition | Macro profile | radar chart |
| Food safety | Verdict | colour-coded card: green safe, amber moderation, red toxic |
| Vet finder | Practices | map pins + distance-sorted cards |
| Wellness | Score | 0–100 in a ring, with a verdict band |
| Care plan | Progress | percentage + bar |
| Dashboard | Weight trend | area chart |

### Colour palette

| Role | Colour | Hex |
|---|---|---|
| Background | Ink (warm violet-black) | `#0D0A14` |
| Card | Deep violet | `#171226` |
| Primary | Apricot | `#FFAE6D` |
| Secondary | Iris | `#8E8BF5` |
| Accent | Butter | `#FFD98E` |
| Safe | Pistachio | `#8FD9A8` |
| Danger | Rose | `#FF6B81` |
| Text | Off-white | `#F4EFF7` |

Typography: **Space Grotesk** for headings, **Inter** for body, **Instrument
Serif** italic for editorial accents.

## Security and backup design

| Concern | Measure |
|---|---|
| Password storage | Never stored by the app. Supabase hashes with bcrypt. |
| Session handling | HTTP-only cookies managed by Supabase. |
| Access control | Row-Level Security at database level, plus `proxy.ts` route guards. |
| Privilege separation | Anonymous public key in the browser; the service-role key is never used client-side. |
| Open redirect | `next` parameters validated as internal single-slash paths. |
| Injection | All queries go through the Supabase client, which parameterises. |
| Account enumeration | Password reset always shows the same confirmation. |
| Transport | HTTPS everywhere, enforced by Vercel. |
| Backup | Supabase takes automatic daily backups; point-in-time recovery on paid tiers. |
| Source backup | Full history in Git on GitHub. |

---

# Part 9 — What to write in each phase

## Phase 2 — Planning

| Required section | Where the material is |
|---|---|
| Identification of need | [Part 1 → The problem it solves](#the-problem-it-solves) |
| Preliminary investigation | Part 1 + the actor table |
| Feasibility — technical | [Part 2 → Why these choices](#why-these-choices-for-your-feasibility-section) |
| Feasibility — economic | All tools are free tier: hosting, database and libraries cost nothing at this scale |
| Feasibility — operational | Part 4: every tool works without an account, in a browser, with no install |
| Project planning | Your own team roles and task split |
| PERT and Gantt | Use the module deadlines; the phase list below gives the task names |
| SRS | [Part 7](#part-7--requirements-ready-to-paste) — copy the FR and NFR tables |
| Data models | [Part 5](#part-5--the-database) — ER diagram and table definitions |

## Phase 3 — Analysis

| Required section | Where the material is |
|---|---|
| Introduction | Part 1 |
| Information-gathering methodology | Describe what you actually did — observation of pet owners, interviews, reviewing existing apps. Be honest. |
| Analysis of the existing system | Compare against how owners manage now: paper records, memory, web searches, asking friends. Also review commercial apps. |
| Data analysis, integrity & constraints | [Part 5 → Data integrity and constraints](#data-integrity-and-constraints) |
| Weaknesses of the current system | Guessed portions; missed vaccination dates; unreliable web advice; no single record to show a vet |
| Functional requirements | [Part 7](#functional-requirements) |
| Non-functional requirements | [Part 7](#non-functional-requirements) |
| Data modelling | [Part 5](#relationships-your-er-diagram) + [Part 6](#part-6--how-data-moves-for-your-dfds) |

## Phase 4 — System Design

| Required section | Where the material is |
|---|---|
| Introduction | Part 1 |
| System design | [Part 4](#part-4--every-screen) |
| Architectural design | [Part 8 → Architecture](#architecture--three-tiers) — software, hardware and network are all covered |
| Class diagram | Use the `lib/types.ts` interfaces: `Pet`, `UserProfile`, `WallPost`, `VetPractice`, `FeedingPlan`, `FoodEntry` |
| Physical design | [Part 5](#part-5--the-database) — actual column types |
| Database design | [Part 5](#part-5--the-database) + `supabase/schema.sql` |
| Program design (pseudocode) | [Part 8](#the-feeding-calculation) and [the matching algorithm](#the-food-safety-matching-algorithm) |
| Interface design | [Part 8 → Interface design](#interface-design) |
| Security and backup | [Part 8 → Security and backup design](#security-and-backup-design) |

## Phase 5 — Implementation

| Required section | Where the material is |
|---|---|
| Introduction | Part 2 |
| Coding | [Part 3](#part-3--every-folder-and-file). Screenshot real files; the code is commented explaining *why*, not just what. |
| Testing | [Part 10](#part-10--test-cases) |
| System testing | [Part 10](#part-10--test-cases) — fill in the Actual Result column when you run them |
| Installation | `SETUP.md` — quote it directly |

## Screenshots worth taking

1. Landing page with the 3D dog
2. Landing page part-scrolled, mid-morph between animals
3. Nutrition Planner with a result
4. Food Safety — "chicken" (safe)
5. Food Safety — "chocolate" (toxic, with the emergency panel)
6. Food Safety — an unverified item showing suggestions
7. Find a Vet with real practices listed
8. Wellness Check result
9. Care Plan, both puppy and kitten tracks
10. Community Wall
11. Sign-in and sign-up
12. Dashboard with pets
13. `/setup` with all checks green
14. Mobile view of any two screens
15. Supabase Table Editor showing the three tables

---

# Part 10 — Test cases

Fill in the last two columns when you run them.

## Unit test cases

| ID | Module | Input | Expected | Actual | Pass |
|---|---|---|---|---|---|
| UT-01 | Feeding | dog, 12 kg, adult, normal, ideal | 722 kcal/day | | |
| UT-02 | Feeding | cat, 4.5 kg, adult, normal | 311 kcal/day, 82 g dry | | |
| UT-03 | Feeding | weight = 0 | Clamped, no NaN shown | | |
| UT-04 | Feeding | weight = −5 | Clamped to minimum | | |
| UT-05 | Feeding | weight = 99999 | Clamped to species maximum | | |
| UT-06 | Feeding | dog 12 kg, puppy stage | 1444 kcal/day, 3 meals | | |
| UT-07 | Food safety | "chicken" | SAFE | | |
| UT-08 | Food safety | "chicken bone" | TOXIC | | |
| UT-09 | Food safety | "my dog ate a chicken bone" | TOXIC | | |
| UT-10 | Food safety | "chocolate" | TOXIC | | |
| UT-11 | Food safety | "grapes" | TOXIC | | |
| UT-12 | Food safety | "milk" | CAUTION | | |
| UT-13 | Food safety | "" (empty) | No verdict shown | | |
| UT-14 | Food safety | "zzzzz" | Unverified + suggestions | | |
| UT-15 | Food safety | "🐶" | No verdict, no crash | | |
| UT-16 | Wellness | all best answers | Score 100, "Thriving" | | |
| UT-17 | Wellness | all worst answers | Score 0, "See a vet" | | |
| UT-18 | Distance | two known coordinates | Correct km to 1 decimal | | |

## System / integration test cases

| ID | Scenario | Steps | Expected | Actual | Pass |
|---|---|---|---|---|---|
| ST-01 | Register | Fill sign-up, submit | Account created, confirmation shown | | |
| ST-02 | Register — weak password | Enter 5 characters | Rejected with a message | | |
| ST-03 | Register — duplicate email | Reuse an email | Clear "already registered" message | | |
| ST-04 | Sign in — valid | Correct credentials | Lands on dashboard | | |
| ST-05 | Sign in — invalid | Wrong password | "Email and password don't match" | | |
| ST-06 | Sign in — database down | Disconnect network | "Can't reach the database" + link to /setup | | |
| ST-07 | Route guard | Open /dashboard signed out | Redirected to sign in | | |
| ST-08 | Return path | Open /settings signed out, then sign in | Lands on /settings, not /dashboard | | |
| ST-09 | Add pet | Complete the form | Appears in My Pets | | |
| ST-10 | Add pet — no name | Leave name blank | Rejected | | |
| ST-11 | Data isolation | Sign in as a second user | Cannot see the first user's pets | | |
| ST-12 | Vet finder — allow | Allow location | Real practices, sorted by distance | | |
| ST-13 | Vet finder — deny | Block location | Falls back to default city with a notice | | |
| ST-14 | Vet finder — offline | Disconnect | Error + retry, no invented clinics | | |
| ST-15 | Wall — post | Post 20 characters | Appears at the top | | |
| ST-16 | Wall — too short | Post 5 characters | Rejected | | |
| ST-17 | Wall — write fails | Disconnect, then post | Error shown, draft restored, no false success | | |
| ST-18 | Wall — heart twice | Heart, reload, heart again | Count rises once only | | |
| ST-19 | Care plan persists | Tick steps, reload | Ticks remain | | |
| ST-20 | Admin guard | Open /admin as a normal user | Access denied | | |
| ST-21 | Responsive | Resize to 375 px | No horizontal scrolling | | |
| ST-22 | Reduced motion | Enable in the OS, reload | Animation stops, content still readable | | |
| ST-23 | No WebGL | Disable it | Page still renders with a gradient instead | | |
| ST-24 | Setup page | Open /setup | Every check reports pass or a named fix | | |
| ST-25 | Register as vet | Choose "Veterinary pro", fill details | Account created, marked unverified | | |
| ST-26 | Vet without registration no. | Leave it blank | Rejected with a message | | |
| ST-27 | Unverified vet answers | Sign in unverified, try to answer | No answer box; direct insert refused by the database | | |
| ST-28 | Verified vet answers | Verify in SQL, sign in, answer | Answer published with a verified badge | | |
| ST-29 | Anonymous asks | Signed out, open /ask | Can read; asked to sign in to post | | |
| ST-30 | Answer count | Post an answer | Question's answer count rises by exactly one | | |

## Testing strategy (for the write-up)

- **Unit testing** — individual functions in isolation: the feeding calculation
  and the food-safety matcher. Both were tested with valid, boundary and invalid
  input.
- **Integration testing** — screens together with Supabase: sign-up through to a
  saved pet appearing on the dashboard.
- **System testing** — the complete deployed application against the functional
  requirements.
- **Boundary testing** — deliberately at the limits: 0 kg, negative weight,
  99999 kg, a 9-character post, a 281-character post.
- **Negative testing** — deliberately wrong: bad password, no network, blocked
  location, disabled WebGL, blocked browser storage.
- **Compatibility testing** — Chrome, Firefox, Edge; mobile and desktop widths.
- **Accessibility testing** — keyboard-only navigation and the reduce-motion
  setting.

---

# Part 11 — Glossary

| Term | Plain meaning |
|---|---|
| **API** | A way for one program to request data from another. |
| **Anon key** | The public Supabase key shipped in the browser. Safe, because database rules limit it. |
| **Client Component** | Code that runs in the visitor's browser. |
| **Component** | A reusable piece of interface. |
| **CRUD** | Create, Read, Update, Delete. |
| **Environment variable** | A setting kept outside the code, such as a database address. |
| **Foreign key** | A column pointing at a row in another table. |
| **Framework** | A structure that handles common plumbing for you. |
| **Git / GitHub** | Version history / the website that stores it. |
| **Hashing** | One-way scrambling, used for passwords. |
| **JSON** | A common text format for data. |
| **MER** | Maintenance Energy Requirement — calories needed per day. |
| **Normalisation** | Organising tables to avoid duplicated data. |
| **Primary key** | The column uniquely identifying a row. |
| **Proxy (middleware)** | Code that runs before a page loads; used here for access checks. |
| **RER** | Resting Energy Requirement — calories at complete rest. |
| **RLS** | Row-Level Security — the database decides which rows you may see. |
| **Server Component** | Code that runs on the server before the page is sent. |
| **Service-role key** | The admin Supabase key. Bypasses all rules. Never put in a browser. |
| **Shader** | A small program on the graphics card; used for the 3D animals. |
| **SQL** | The language used to talk to a relational database. |
| **Three.js** | The JavaScript library used for 3D graphics. |
| **TypeScript** | JavaScript with type checking. |
| **UUID** | A long unique identifier, e.g. `a3f5...`. |
| **WebGL** | The browser technology that draws 3D on the graphics card. |

---

## Honest limitations — state these in your report

Markers reward candour, and every one of these is defensible.

1. **The admin console shows demonstration data**, not live database records.
2. **Health reminders on the dashboard are illustrative.** There is no
   reminders table; adding one is future work.
3. **Vet data quality depends on OpenStreetMap.** Coverage varies by area and
   some practices have no phone number or opening hours. We show what exists
   rather than filling gaps with invented values.
4. **Pet profiles cannot yet be edited or deleted** from the interface, only
   created and listed.
5. **No photo upload yet.** The column exists; the upload flow does not.
6. **The wall has no moderation queue.** Posts appear immediately.
7. **The community table is still named `confessions`** internally, inherited
   from the project this was forked from. Renaming it would require a data
   migration.
8. **Vet verification is a manual SQL update.** There is no admin screen for it
   yet — an administrator runs
   `update vet_profiles set verified = true where id = '…';`. The security
   model is correct; only the tooling is missing.
9. **Vets have no dedicated dashboard.** A verified vet answers from the same
   `/ask` board an owner reads, rather than from a queue of unanswered
   questions sorted by urgency.

## Future scope

- Pet editing and deletion, and photo upload
- A real reminders system with email or push notification
- Weight history recorded over time rather than illustrated
- Wiring the admin console to live data
- Exporting a pet's record as a PDF to take to the vet
- An admin screen for verifying vets, replacing the manual SQL update
- A vet-side dashboard: unanswered questions, filters by species and speciality
- Letting an owner mark the answer that helped, and follow up on a thread
- Multi-language support
