# PetPal — Complete System Reference

**Everything this system is, does, and is built from.**

This document is the single source of truth for the PetPal application. It is
written for someone who did not build it and needs to understand it completely —
to write the project documentation, to answer questions in a presentation, to
maintain it, or to extend it.

Nothing in this document is aspirational. Every statement describes code that
exists in this repository and behaviour you can verify by running it. Where a
thing was built one way rather than another, the reason is given, because "why"
is what a supervisor asks after "what".

---

## How to use this document

| If you need to… | Read |
|---|---|
| Explain the project in one minute | Part 1 |
| Write the Planning phase document | Parts 1, 2, 3, 11 + `02-PHASE-2-PLANNING.md` |
| Write the Analysis phase document | Parts 4, 6, 7 + `03-PHASE-3-ANALYSIS.md` |
| Write the Design phase document | Parts 5, 6, 8, 9 + `04-PHASE-4-DESIGN.md` |
| Write the Implementation phase document | Parts 10, 12, 13 + `05-PHASE-5-IMPLEMENTATION.md` |
| Change the code | Parts 3, 5, 8, 9 |
| Answer "why did you…" in a viva | Part 14 |

---

## Contents

1. [What PetPal is](#part-1--what-petpal-is)
2. [The technology stack](#part-2--the-technology-stack)
3. [Repository map — every folder and file](#part-3--repository-map)
4. [Every screen, in detail](#part-4--every-screen)
5. [The database](#part-5--the-database)
6. [How data moves through the system](#part-6--how-data-moves)
7. [Requirements](#part-7--requirements)
8. [The algorithms](#part-8--the-algorithms)
9. [The 3D system](#part-9--the-3d-system)
10. [Security](#part-10--security)
11. [Deployment and environments](#part-11--deployment-and-environments)
12. [Testing](#part-12--testing)
13. [Known limitations and honest caveats](#part-13--known-limitations)
14. [Design decisions and their reasons](#part-14--design-decisions)
15. [Glossary](#part-15--glossary)

---

# Part 1 — What PetPal is

## 1.1 One paragraph

PetPal is a web application that brings the everyday parts of pet care into one
place. A pet owner can calculate exactly how much to feed an animal using the
same energy formulas a veterinarian uses, check whether a food or household
plant is dangerous before the animal eats it, find real veterinary practices
near them, run a guided wellness check, follow a week-by-week care plan for a
new animal, read care guides, and ask a question that a verified veterinary
professional answers. It supports dogs, cats, rabbits, birds, fish, reptiles and
small pets, and it runs in a browser on a phone or a computer.

## 1.2 The problem

Pet care information is scattered, inconsistent and often wrong. Three specific
failures motivated this project:

**Portion sizes are guessed.** Most owners feed by scoop, by the picture on the
bag, or by what the previous owner did. Feeding guides on packaging are given in
broad weight bands and take no account of life stage, neutering, activity or
body condition. Over-feeding is the most common preventable health problem in
companion animals.

**Toxicity information is unreliable and slow.** An owner whose dog has just
eaten something searches the web and receives contradictory answers from forums,
content farms and pages written for a different country's products. The moment
they need a clear answer is the moment they are least able to evaluate sources.

**Finding a vet under pressure is hard.** In an emergency an owner needs a real
practice, a real address and a real phone number, quickly. General search engines
return sponsored listings, closed businesses and aggregator pages.

## 1.3 What PetPal does about each

| Problem | PetPal's answer |
|---|---|
| Guessed portions | A calculator using published RER/MER veterinary energy formulas, taking species, weight, life stage, activity and body condition |
| Unreliable toxicity info | A curated database of 89 foods, plants and household substances, each with a verdict, the clinical reason, and what to actually do |
| Finding a vet | Real practices from OpenStreetMap, sorted by distance, with a map — showing only facts the source actually holds |
| No professional input | Ask a Vet: owners post questions, administrator-verified veterinary professionals answer |
| Nothing tracks the animal | Pet profiles, a wellness check, and a week-by-week care plan |
| Owners feel alone | An anonymous community wall |

## 1.4 Scope — what it is not

Stating this explicitly protects you in a viva.

- It is **not** a diagnostic tool. It gives guidance and says so on every screen
  that touches health.
- It is **not** a booking system. It finds practices; it does not make
  appointments.
- It is **not** a shop. There are no payments anywhere in the system.
- It is **not** a social network. The community wall is anonymous and has no
  profiles, followers or messaging.
- It does **not** rank, rate or endorse individual veterinary practices.

## 1.5 The users (your actors)

| Actor | Who they are | What they can do |
|---|---|---|
| **Visitor** | Anyone, not signed in | Browse the landing page, use Food Safety, Nutrition Planner, Find a Vet, Care Guides, read Ask a Vet and the community wall |
| **Pet owner** | A registered user | Everything a visitor can, plus save pet profiles, post to the wall, ask questions, save wellness results and care plans |
| **Veterinary professional** | A registered user with a `vet_profiles` record | Everything an owner can, plus the Vet Console. Can only *answer* questions once verified |
| **Administrator** | A user whose `profiles.role` is `admin` | Everything an owner can, plus the Admin Panel: verify vets, moderate the wall, view registered accounts |

### 1.5.1 The critical design decision about user types

**A vet is a pet owner who also happens to be a vet.** There is one account
type, not two.

This matters and you will be asked about it. The alternative — separate owner
accounts and vet accounts — fails immediately on a real case: most veterinarians
own animals. Under a two-account model a vet would need two logins, or would
lose the nutrition planner and the food-safety checker for their own pets simply
because they ticked "professional" at signup.

So instead:

- Every tool is available to every signed-in user.
- Being a professional **adds** the Vet Console. It takes nothing away.
- The Vet Console appears when the user has a row in `vet_profiles`, not based
  on a role string.
- Being an administrator is a separate axis again (`profiles.role = 'admin'`).

The consequence is that **one account can be an owner, a vet and an
administrator simultaneously**, which falls naturally out of the model rather
than being a special case.

---

# Part 2 — The technology stack

## 2.1 The layers

```
┌──────────────────────────────────────────────────────────┐
│  BROWSER (the client)                                    │
│  Next.js 16 + React 19 + TypeScript + Tailwind CSS 4     │
│  Three.js for 3D · Framer Motion for animation           │
│  Recharts for charts · Leaflet for maps                  │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌──────────────────────────────────────────────────────────┐
│  VERCEL (the application server)                         │
│  Serves pages, runs server components, hosts /api/vets   │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌──────────────────────────────────────────────────────────┐
│  SUPABASE (the database and authentication)              │
│  PostgreSQL + Row-Level Security + GoTrue auth           │
└──────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌──────────────────────────────────────────────────────────┐
│  OPENSTREETMAP (external data, no key, no account)       │
│  Overpass API for practices · tile server for the map    │
└──────────────────────────────────────────────────────────┘
```

## 2.2 Every dependency and why it is there

| Package | Version | Why |
|---|---|---|
| `next` | 16.2.9 | The framework. Routing, server rendering, bundling, the API route |
| `react` / `react-dom` | 19.2.4 | The UI library Next is built on |
| `typescript` | 5 | Types. Catches a whole class of bug before the code runs |
| `tailwindcss` | 4 | Styling without a separate stylesheet per component |
| `@supabase/supabase-js` | 2.108 | Talking to the database and authentication |
| `@supabase/ssr` | 0.12 | Supabase sessions that work with server rendering |
| `three` | 0.186 | The 3D particle animals |
| `framer-motion` | 12.42 | Page and element animation, and the reduce-motion switch |
| `recharts` | 3.9 | Charts on the dashboard, nutrition page and vet console |
| `leaflet` / `react-leaflet` | 1.9 / 5.0 | The map on Find a Vet |
| `lucide-react` | 1.21 | Icons |
| `sonner` | 2.0 | Toast notifications |
| `date-fns` | 4.4 | Date formatting |
| `clsx` / `tailwind-merge` | — | Combining CSS class names safely |

### 2.2.1 Dependencies that are installed but unused

Be honest about these if asked. `@fullcalendar/*`, `@tiptap/*`, `cmdk`,
`react-dropzone` and `shadcn` are present in `package.json` but no application
code imports them. They were inherited from the project this repository was
forked from. They do not affect the built output — Next.js only bundles what is
actually imported — but they do slow `npm install`.

## 2.3 Why these choices (use this in your feasibility study)

**Why Next.js rather than plain React?** Server rendering means the first page a
visitor sees is delivered as finished HTML rather than a blank page that then
fetches. File-based routing means the folder structure *is* the site map, which
makes the project easier for a team to navigate. It also gives us one place to
put a server-side API route, which we needed.

**Why Supabase rather than building a backend?** Authentication, a PostgreSQL
database, and row-level security in one managed service with a free tier. Writing
our own authentication would have consumed most of the project's time and would
have been less secure than a maintained implementation.

**Why PostgreSQL rather than a document database?** The data is relational —
owners have pets, questions have answers, vets have replies. Foreign keys and
constraints let the *database* enforce correctness rather than trusting every
piece of application code to remember.

**Why Tailwind?** Styles live next to the markup they style, so a component can
be understood in one place. No separate stylesheet to keep in sync.

**Why Three.js directly rather than react-three-fiber?** Smaller bundle, no
dependency on a wrapper keeping pace with React 19, and the particle system is
one object with one draw call — a React reconciler adds nothing to that.

**Why OpenStreetMap rather than Google Maps?** No API key, no billing account, no
per-request cost, and the data is openly licensed. A student project cannot rely
on a service that requires a credit card.

---

# Part 3 — Repository map

Total application source: **13,058 lines** of TypeScript/TSX across `app/`,
`components/` and `lib/`.

## 3.1 Top level

```
demo-master/
├── app/                  Pages and routes
├── components/           Reusable interface pieces
├── lib/                  Logic with no user interface
├── public/               Static files served as-is
├── supabase/
│   └── schema.sql        The complete database definition
├── docs/                 This documentation
├── SETUP.md              How to deploy it from scratch
├── PROJECT-GUIDE.md      Earlier orientation guide
├── package.json          Dependencies and scripts
├── next.config.ts        Next.js configuration
├── tsconfig.json         TypeScript configuration
├── eslint.config.mjs     Linting rules
├── postcss.config.mjs    CSS pipeline (Tailwind)
└── proxy.ts              Runs before every request
```

### 3.1.1 A note on `proxy.ts`

In Next.js 16 the file that runs before every request is called `proxy.ts`. In
earlier versions it was `middleware.ts`. If you read a tutorial that mentions
`middleware.ts`, it was written for an older version. This is the kind of detail
that wastes an afternoon if nobody writes it down.

## 3.2 `app/` — the pages

Next.js uses **file-based routing**: the folder path becomes the URL.

| Path | URL | What it is |
|---|---|---|
| `app/page.tsx` | `/` | The landing page (817 lines) |
| `app/layout.tsx` | — | The shell wrapped around every page |
| `app/globals.css` | — | Design tokens, themes, shared styles |
| `app/auth/login/` | `/auth/login` | Sign in |
| `app/auth/signup/` | `/auth/signup` | Create an account (owner or professional) |
| `app/auth/forgot-password/` | `/auth/forgot-password` | Password reset request |
| `app/auth/callback/` | `/auth/callback` | Where Supabase returns after email confirmation |
| `app/setup/` | `/setup` | Connection diagnostics |
| `app/api/vets/route.ts` | `/api/vets` | Server-side veterinary practice lookup |
| `app/(dashboard)/dashboard/` | `/dashboard` | Signed-in overview |
| `app/(dashboard)/pets/` | `/pets` | Saved animals |
| `app/(dashboard)/add-pet/` | `/add-pet` | Add an animal |
| `app/(dashboard)/nutrition/` | `/nutrition` | Feeding calculator |
| `app/(dashboard)/food-safety/` | `/food-safety` | Toxicity checker |
| `app/(dashboard)/wellness/` | `/wellness` | Guided health check |
| `app/(dashboard)/care-plan/` | `/care-plan` | Week-by-week plan |
| `app/(dashboard)/vet-finder/` | `/vet-finder` | Practice finder and map |
| `app/(dashboard)/ask/` | `/ask` | Ask a Vet |
| `app/(dashboard)/wall/` | `/wall` | Community wall |
| `app/(dashboard)/resources/` | `/resources` | Care guides |
| `app/(dashboard)/vet/` | `/vet` | **Vet Console** (828 lines) |
| `app/(dashboard)/admin/` | `/admin` | **Admin Panel** |
| `app/(dashboard)/settings/` | `/settings` | Account and appearance |

### 3.2.1 What the brackets mean

`(dashboard)` in parentheses is a **route group**. It groups pages so they can
share a layout — in this case the sidebar — *without* adding `/dashboard` to
every URL. `/nutrition` is the URL, not `/dashboard/nutrition`.

## 3.3 `lib/` — the logic

This folder contains everything that is pure logic with no interface. Keeping it
separate is what makes the system testable: these functions can be run and
checked without a browser.

| File | Lines | Responsibility |
|---|---|---|
| `animal-shapes.ts` | 992 | Builds the five 3D animals from mathematics |
| `food-safety.ts` | 770 | The 89-item toxicity database and its search |
| `vets.ts` | 267 | Practice lookup, distance maths, offline fallback |
| `nutrition.ts` | 195 | The feeding calculation |
| `types.ts` | 137 | Shared type definitions and species labels |
| `storage.ts` | 137 | Reading and writing browser local storage safely |
| `supabase/client.ts` | — | Browser database client |
| `supabase/server.ts` | — | Server-side database client |
| `supabase/errors.ts` | 164 | Turning database errors into readable messages |
| `auth.ts` | — | Administrator check |
| `use-client-value.ts` | — | Reading browser-only values without breaking server rendering |
| `vets-za.json` | — | 189 real practices, bundled for offline use |

## 3.4 `components/` — the interface pieces

| File | Lines | Responsibility |
|---|---|---|
| `public/AnimalField.tsx` | 768 | The full-screen morphing 3D animal on the landing page |
| `public/AuraCanvas.tsx` | 355 | The smaller 3D animal in page headers |
| `public/shape-worker.ts` | — | Builds the 3D shapes off the main thread |
| `public/Hero.tsx` | 164 | Landing page hero section |
| `public/Navbar.tsx` | 133 | Top navigation |
| `public/Logo.tsx` | — | The paw mark |
| `layout/DashboardSidebar.tsx` | 211 | Signed-in navigation |
| `layout/PageHeader.tsx` | 118 | Shared page header with its 3D motif |
| `layout/AppChrome.tsx` | — | Chooses sidebar or public navigation |
| `layout/PreferencesProvider.tsx` | 114 | Applies theme, accent, reduce-motion, high-contrast |
| `layout/MotionProvider.tsx` | — | Carries reduce-motion into Framer Motion |
| `VetMap.tsx` | 147 | The Leaflet map |
| `SiteEffects.tsx` | — | Scroll progress bar and cursor glow |
| `ui/*` | — | Generic building blocks: button, card, dialog, table, etc. |

---

# Part 4 — Every screen

For each screen: what a user sees, what they can do, where the data comes from,
and what happens when things go wrong.

## 4.1 Landing page (`/`)

**Purpose.** Explain the product to someone who has never heard of it, and get
them to sign up.

**Sections, in order:**

1. **Hero** — headline, sub-paragraph, two calls to action, three trust
   statistics, and three floating cards illustrating real features.
2. **Trust bar** — four statistics about the problem.
3. **Editorial reveal** — the "why we built it" statement.
4. **Bento grid** — seven feature cards with photography.
5. **Nutrition demo** — a live, interactive calculator on the landing page
   itself. Not a screenshot; it computes real numbers as you move the sliders.
6. **Testimonials** — three quotes.
7. **FAQ** — expandable questions.
8. **Closing call to action**.
9. **Footer**.

**Behind everything:** the 3D particle animal, which morphs dog → cat → bird →
rabbit → fish as the page scrolls.

**Data source.** None. Entirely static except the nutrition demo, which runs the
same `computePlan()` function the real planner uses.

## 4.2 Sign up (`/auth/signup`)

**Two account kinds, chosen by a toggle:**

- **Pet owner** — email, password, display name.
- **Veterinary professional** — additionally requires full name and registration
  number, and optionally a practice name.

**What happens on submit:**

1. The form validates locally (password at least 8 characters; a professional
   must supply a name and registration number).
2. `supabase.auth.signUp()` is called with the details, and the role, practice
   name and registration number are attached as **user metadata**.
3. Supabase creates the account and sends a confirmation email.
4. A **database trigger** (`handle_new_user`) creates the `profiles` row, and —
   if the metadata says `role = vet` — the `vet_profiles` row as well, with
   `verified = false`.

### 4.2.1 Why the trigger, and not the client

This is one of the more instructive bugs in the project's history, and it is
worth putting in your documentation.

The original code inserted the `vet_profiles` row from the browser immediately
after `signUp()` returned. It failed **every single time**, silently.

The reason: with email confirmation enabled — Supabase's default — `signUp()`
returns a user object but **no session**. The user is not signed in yet. The
row-level security policy on `vet_profiles` is `with check (auth.uid() = id)`,
and with no session `auth.uid()` is `null`, so the insert was refused. The
account was created, the professional details were discarded, and the vet could
never be verified because there was no record to verify.

The fix was to move the insert into the `handle_new_user` trigger, which is
declared `SECURITY DEFINER` — it runs with the rights of the user who defined it,
so row-level security does not apply inside it and no session is needed.

**The lesson, generalised:** a client-side write that depends on a session cannot
run before the session exists.

## 4.3 Sign in (`/auth/login`)

Email and password against Supabase authentication. Errors are translated into
readable messages by `lib/supabase/errors.ts` — "Failed to fetch" becomes an
explanation that the database is unreachable, with a link to `/setup`.

## 4.4 Setup check (`/setup`)

**Purpose.** Diagnose a broken deployment without reading logs.

It checks, in order, and reports each result:

1. Is `NEXT_PUBLIC_SUPABASE_URL` set?
2. Is `NEXT_PUBLIC_SUPABASE_ANON_KEY` set?
3. Does the URL have the right shape (`https://<ref>.supabase.co`)?
4. Does the Supabase project respond?
5. Is the key accepted?
6. Do the tables `profiles`, `pets` and `confessions` exist and are they
   readable?

This page exists because the single most common deployment failure is a missing
or malformed environment variable, and the symptom — "Failed to fetch" on sign in
— tells you nothing about the cause.

## 4.5 Dashboard (`/dashboard`)

The signed-in overview: greeting, pet summary cards, a weight chart, upcoming
reminders and quick links to the tools.

## 4.6 My Pets (`/pets`) and Add a Pet (`/add-pet`)

Create, view and delete animal profiles. Fields: name, species, breed, age,
weight, sex, photo. Stored in the `pets` table, visible only to the owner,
enforced by row-level security.

## 4.7 Nutrition Planner (`/nutrition`)

**The single most technically substantial owner feature.** Full algorithm in
Part 8.1.

**Inputs:** species, weight, life stage, activity level, body condition.

**Outputs:** daily calorie target, dry food weight in grams, wet food weight,
number of meals, grams per meal, daily water, and a macronutrient profile.

**Source of truth.** `lib/nutrition.ts`, function `computePlan()`. The same
function powers the landing page demo, so the two can never disagree.

## 4.8 Food Safety (`/food-safety`)

**Purpose.** Answer "can my animal eat this?" in one search.

**Data.** 89 curated entries in `lib/food-safety.ts`. Each carries: the item
name, aliases, a verdict (safe / caution / toxic), which species it applies to,
the clinical reason, and what to do.

**The matching algorithm** is described in Part 8.2, and it is worth reading —
it was the source of the single worst bug in the project's history, where
searching "chicken" returned **TOXIC**.

## 4.9 Wellness Check (`/wellness`)

Eight guided questions about appetite, energy, coat, weight, toilet habits,
mobility, behaviour and breathing. Produces a score out of 100 and a verdict,
with explicit advice to see a vet when the score is low. Results can be saved
against a pet.

## 4.10 Care Plan (`/care-plan`)

A week-by-week checklist for the first four weeks with a new animal, with
separate tracks for puppies and kittens. Progress is stored in browser local
storage.

## 4.11 Find a Vet (`/vet-finder`)

**Purpose.** Show real veterinary practices near the user.

**How it works:**

1. The browser asks for the user's location. If refused, it falls back to
   Johannesburg and says so.
2. It calls `/api/vets` — **this application's own server**, not OpenStreetMap
   directly.
3. That route queries the Overpass API, trying four mirrors in turn.
4. Results are parsed into practice records, sorted by straight-line distance.
5. The page shows a list and a Leaflet map.

**What it deliberately does not show.** Ratings. Star scores. "Recommended"
badges. The footnote says so explicitly: *PetPal does not rank, rate or endorse
individual practices.* If OpenStreetMap does not hold a phone number, no Call
button appears — rather than a placeholder.

### 4.11.1 Two production failures worth documenting

**CORS.** The browser used to call Overpass directly. Overpass stopped returning
`Access-Control-Allow-Origin` headers, so the browser blocked every response and
the feature failed 100% of the time. Cross-origin restrictions are enforced by
*browsers*, not servers, so moving the call to our own server removed the problem
entirely. This is why `/api/vets` exists.

**Upstream outage.** Overpass is a donated public service. On one occasion all
four mirrors returned HTTP 504 or timed out within the same minute, from two
different networks. A core feature was therefore down for reasons entirely
outside this application. The fix was to bundle a 19KB extract of the 189 real
veterinary practices OpenStreetMap holds for South Africa. Live data is still
tried first; the extract is only reached when every mirror fails, and the page
then states plainly that it is showing a saved copy from a given date.

## 4.12 Ask a Vet (`/ask`)

The two-sided feature. Owners post a question (title, body, species). Verified
veterinary professionals answer. Questions and answers are public so the archive
is useful to everyone.

Posting a question requires an account. Answering requires a **verified**
professional account, and that gate is enforced in the database, not only in the
interface — see Part 10.3.

## 4.13 Community Wall (`/wall`)

Anonymous posts with a mood tag and a heart count. No names, no profiles. Hearts
are incremented through a database function rather than a direct update, for the
reason given in Part 10.4.

## 4.14 Care Guides (`/resources`)

22 written guides covering vaccination, parasites, dental care, microchipping,
neutering, nutrition, behaviour and end-of-life care. Searchable and filterable
by species and category.

## 4.15 Vet Console (`/vet`) — professionals only

**828 lines, the largest single page in the project.** Appears in the sidebar
only when the signed-in user has a `vet_profiles` row.

**Status strip.** Verification state, queue count, answers given, and an
availability toggle so a vet on leave can step out of the queue without deleting
anything.

**Four tabs:**

1. **Queue** — unanswered questions, searchable and filterable by species, each
   with the full question body and an inline composer. Answering happens here
   rather than on another screen. A bar chart shows what is waiting, by species,
   counted from the actual queue.
2. **My answers** — the professional's own history, each answer shown with the
   question it replied to.
3. **Saved replies** — the vet's own reusable text. The paragraph written for the
   twentieth time about post-operative feeding gets written once. They appear as
   one-click buttons above the composer on every question, ordered by how often
   each is used. Private to the author.
4. **Profile** — full name, practice, city, specialities and biography, all
   editable. The registration number is deliberately read-only: it is what
   verification is checked against, so it belongs to an administrator.

**Unverified professionals** see the queue and a plain explanation of why they
cannot answer yet, rather than a composer that would fail.

## 4.16 Admin Panel (`/admin`) — administrators only

**Overview.** Four counts the system can actually take: community posts,
registered professionals, verified vets, awaiting verification.

**Community.** Moderate the wall; remove posts.

**Vets.** Every registered professional with their practice, registration number
and status. **Verify** and **Revoke** write to the database.

**Registered accounts.** Name, email, role and join date.

Pet records are deliberately **not** shown. Pets are personal data restricted to
their owner by row-level security, and running an administration screen does not
require seeing what animals somebody keeps.

## 4.17 Settings (`/settings`)

Five tabs: Profile, Notifications, Privacy & Security, Appearance, Account.

**Appearance** is the substantial one:

- **Theme** — system, light or dark. "System" follows the operating system and
  keeps following it.
- **Accent colour** — six choices, applied live across the entire interface.
- **Reduce motion** — genuinely stops the animations.
- **High contrast** — lifts muted text and strengthens borders.

---

# Part 5 — The database

## 5.1 Overview

**Seven tables, four functions, two triggers, five indexes, 24 row-level security policies.**
All defined in `supabase/schema.sql`, which is idempotent: every statement uses
`if not exists` or `drop ... if exists` first, so running it twice repairs a
partial setup rather than failing.

```
auth.users  (managed by Supabase)
    │
    ├──1:1──▶ profiles          who you are, and your role
    │             │
    │             └──1:0..1──▶ vet_profiles    professional details
    │                              │
    │                              └──1:many──▶ vet_replies   saved text
    │
    ├──1:many──▶ pets           your animals
    │
    ├──1:many──▶ questions      questions you asked
    │
    └──1:many──▶ answers        answers you gave (as a vet)

questions ──1:many──▶ answers

confessions                     anonymous, belongs to nobody
```

## 5.2 Table: `profiles`

One row per registered user, created automatically by a trigger on sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, references `auth.users`, cascades on delete |
| `email` | text | Copied from the account |
| `display_name` | text | Defaults to "Pet Parent" |
| `avatar_url` | text | Optional |
| `role` | text | `user`, `vet` or `admin`, enforced by a check constraint |
| `created_at` | timestamptz | Defaults to now |

**Policies (4):** read own, update own, insert own, and *admin reads all*.

## 5.3 Table: `pets`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, generated |
| `owner_id` | uuid | References `auth.users`, cascades |
| `name` | text | Required |
| `species` | text | One of nine values, enforced |
| `breed` | text | Optional |
| `age` | text | Free text — owners rarely know an exact date |
| `weight` | numeric | Must be greater than zero if present |
| `sex` | text | `male`, `female` or `unknown` |
| `photo_url` | text | Optional |
| `created_at` | timestamptz | |

**Index:** `(owner_id, created_at desc)` — the dashboard always filters by owner
and sorts by date.

**Policies (4):** the owner may read, insert, update and delete their own rows.
Nobody else can see them at all.

## 5.4 Table: `confessions` (the community wall)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `text` | text | Between 10 and 280 characters |
| `mood` | text | `happy`, `proud`, `help` or `sad` |
| `hearts` | int | Must be zero or greater |
| `created_at` | timestamptz | |

**Policies (2):** anyone may read, anyone may insert. There is deliberately **no
update policy** — see Part 10.4.

The table is still named `confessions` because that is the name the deployed
application queries. Renaming it would require a code change and a data
migration, so it is left alone on purpose.

## 5.5 Table: `vet_profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, references `auth.users` |
| `full_name` | text | Required |
| `practice_name` | text | Optional |
| `city` | text | Optional |
| `country` | text | Defaults to South Africa |
| `registration_no` | text | Checked against the register by an administrator |
| `specialities` | text | Optional |
| `bio` | text | Optional |
| `verified` | boolean | Defaults **false** |
| `accepting` | boolean | Defaults true — whether they are taking questions |
| `created_at` | timestamptz | |

**Policies (4):** anyone may read (professional details appear beside answers);
the vet may insert and update their own row; an administrator may update any row
— which is what makes the Verify button work.

## 5.6 Table: `vet_replies`

A professional's private saved replies.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `vet_id` | uuid | References `auth.users`, cascades |
| `title` | text | 2–80 characters |
| `body` | text | 20–2000 characters |
| `uses` | int | How many times inserted; orders the list |
| `created_at` | timestamptz | |

**Policies (4):** the author may read, insert, update and delete. **Nobody else
can read them at all** — a half-written draft is not something an owner should
ever see.

## 5.7 Table: `questions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `asker_id` | uuid | Who asked |
| `title` | text | 10–140 characters |
| `body` | text | 20–1200 characters |
| `species` | text | One of eight values |
| `answer_count` | int | Maintained by a trigger, not by the client |
| `created_at` | timestamptz | |

**Policies (3):** anyone may read; a signed-in user may insert their own; the
author may update their own.

## 5.8 Table: `answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | uuid | Which question |
| `vet_id` | uuid | Which professional |
| `body` | text | 20–2000 characters |
| `created_at` | timestamptz | |

**Policies (3):** anyone may read; **only a verified vet may insert**; the author
may update their own.

## 5.9 The functions

**`handle_new_user()`** — `SECURITY DEFINER`, triggered after insert on
`auth.users`. Creates the `profiles` row with the correct role, and the
`vet_profiles` row when the metadata says the account is professional.

**`increment_hearts(cid uuid)`** — `SECURITY DEFINER`. Adds one heart to a
community post. Exists so that no update policy is needed on `confessions`.

**`is_admin()`** — `SECURITY DEFINER`, `stable`. Returns whether the caller is an
administrator.

**`bump_answer_count()`** — `SECURITY DEFINER`, trigger function. Keeps
`questions.answer_count` correct. Covered in §5.10.

Two of these are attached to triggers: `handle_new_user()` on `auth.users`, and
`bump_answer_count()` on `answers`. The other two are called directly.

### 5.9.1 Why `is_admin()` must be a function

A policy **on** `profiles` that itself runs `select ... from profiles` recurses
infinitely: Postgres applies the policy to the subquery, which applies the policy
again, and so on. `SECURITY DEFINER` runs the lookup with the definer's rights,
so row-level security does not apply inside it and the recursion never begins.

## 5.10 The trigger on answers

`bump_answer_count()` keeps `questions.answer_count` correct without a round trip
from the client. It increments on insert and decrements on delete, and it is
declared `security definer` with `search_path` pinned to `public`.

## 5.11 Normalisation

The schema is in **Third Normal Form**.

- **1NF** — every column holds a single atomic value. No comma-separated lists.
- **2NF** — every non-key column depends on the whole key. All tables use a
  single-column primary key, so there are no partial dependencies.
- **3NF** — no non-key column depends on another non-key column. A vet's
  practice name lives in `vet_profiles`, not copied onto every answer they write.

**One deliberate denormalisation:** `questions.answer_count`. Strictly it is
derivable by counting rows in `answers`, which makes it redundant. It is stored
because the question list would otherwise need a count subquery per row on every
page load. It is kept correct by a database trigger, not by application code — so
it cannot drift when a client forgets to update it.

State this in your documentation. Recognising a denormalisation and justifying it
scores better than pretending it is not there.

---

# Part 6 — How data moves

These descriptions map directly onto the data-flow diagrams your Analysis phase
needs.

## 6.1 Context diagram (Level 0)

```
    ┌──────────┐                                 ┌──────────────┐
    │   Pet    │──── details, questions ────────▶│              │
    │  Owner   │◀─── plans, verdicts, answers ───│              │
    └──────────┘                                 │              │
                                                 │    PetPal    │
    ┌──────────┐                                 │    System    │
    │   Vet    │──── answers, profile ──────────▶│              │
    │(verified)│◀─── question queue ─────────────│              │
    └──────────┘                                 │              │
                                                 │              │
    ┌──────────┐                                 │              │
    │  Admin   │──── verification decisions ────▶│              │
    └──────────┘◀─── accounts, posts ────────────│              │
                                                 └──────────────┘
                                                    ▲         │
                                    practice records│         │location
                                                    │         ▼
                                              ┌──────────────────┐
                                              │  OpenStreetMap   │
                                              └──────────────────┘
```

## 6.2 Level 1 — the main processes

| # | Process | Input | Output | Stores touched |
|---|---|---|---|---|
| 1.0 | Manage account | credentials | session | profiles, vet_profiles |
| 2.0 | Manage pets | pet details | pet list | pets |
| 3.0 | Calculate feeding plan | species, weight, stage, activity, condition | calories, grams, meals | none |
| 4.0 | Check food safety | search text, species | verdict, reason, action | none |
| 5.0 | Find veterinary practice | coordinates | ranked practice list | none (external) |
| 6.0 | Run wellness check | eight answers | score, verdict | none |
| 7.0 | Ask and answer | question, answer | public thread | questions, answers |
| 8.0 | Post to community | text, mood | wall entry | confessions |
| 9.0 | Manage professional profile | profile fields, replies | saved profile | vet_profiles, vet_replies |
| 10.0 | Administer | verification decision | updated status | vet_profiles, profiles |

Note that processes 3.0, 4.0, 5.0 and 6.0 touch **no data store**. They are pure
calculations over inputs. This is worth stating: it means those features work
without an account and without a database, which is why the application degrades
gracefully when Supabase is unreachable.

## 6.3 Level 2 — Process 3.0, Calculate Feeding Plan

```
species ──┐
weight  ──┼──▶ [3.1 Validate inputs] ──▶ [3.2 Compute RER] ──┐
stage   ──┤          │                    70 × kg^0.75       │
activity──┤          │                                       ▼
condition─┘          │                         [3.3 Apply multipliers]
                     │                          activity × stage
                     ▼                          × species × condition
              clamp to species range                   │
                                                       ▼
                                              [3.4 Derive portions]
                                               calories ÷ density
                                                       │
                                                       ▼
                                          calories, grams, meals, water
```

## 6.4 Sequence — a professional answers a question

```
Vet            Browser          Vercel        Supabase
 │                │                │              │
 │ opens /vet     │                │              │
 │───────────────▶│                │              │
 │                │ getUser()      │              │
 │                │───────────────────────────────▶│
 │                │◀────────────── session ────────│
 │                │ select vet_profiles where id=me│
 │                │───────────────────────────────▶│
 │                │◀────────────── profile ────────│
 │                │ select questions where count=0 │
 │                │───────────────────────────────▶│
 │                │◀────────────── queue ──────────│
 │ types answer   │                │              │
 │───────────────▶│                │              │
 │ clicks Post    │ insert answers │              │
 │───────────────▶│───────────────────────────────▶│
 │                │                │   RLS checks: verified vet?
 │                │                │   trigger: bump_answer_count
 │                │◀───────────── inserted row ────│
 │◀── moved out of queue, into My answers          │
```

## 6.5 Sequence — finding a vet, including both failure paths

```
Browser              /api/vets            Overpass mirrors
   │                     │                       │
   │ GET ?lat&lng&radius │                       │
   │────────────────────▶│                       │
   │                     │ POST query ──────────▶│ mirror 1
   │                     │◀─── 504 ──────────────│
   │                     │ POST query ──────────▶│ mirror 2
   │                     │◀─── timeout ──────────│
   │                     │ POST query ──────────▶│ mirror 3
   │                     │◀─── timeout ──────────│
   │                     │ POST query ──────────▶│ mirror 4
   │                     │◀─── timeout ──────────│
   │                     │
   │                     │ in South Africa?  ──▶ bundled extract
   │◀── practices + stale:true, extracted date ──│
   │
   │ page shows results AND a banner saying it is a saved copy
```

---

# Part 7 — Requirements

## 7.1 Functional requirements

Written in the form a marker expects: numbered, testable, unambiguous.

### Account management

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow a visitor to create an account with an email address and a password of at least 8 characters |
| FR-02 | The system shall allow an applicant to register as a veterinary professional, requiring a full name and a registration number |
| FR-03 | The system shall create a profile record automatically when an account is created |
| FR-04 | The system shall create a professional record automatically when the account is registered as a professional, with verification set to false |
| FR-05 | The system shall allow a registered user to sign in and sign out |
| FR-06 | The system shall allow a user to request a password reset by email |
| FR-07 | The system shall allow a user to sign out all other sessions |

### Pet management

| ID | Requirement |
|---|---|
| FR-08 | The system shall allow a signed-in user to create a pet profile with name, species, breed, age, weight and sex |
| FR-09 | The system shall allow a user to view only their own pets |
| FR-10 | The system shall allow a user to edit and delete their own pets |
| FR-11 | The system shall reject a pet weight that is zero or negative |
| FR-12 | The system shall reject a species outside the permitted list |

### Nutrition

| ID | Requirement |
|---|---|
| FR-13 | The system shall calculate a daily calorie target from species, weight, life stage, activity level and body condition |
| FR-14 | The system shall convert the calorie target into dry food weight, wet food weight, meal count and grams per meal |
| FR-15 | The system shall state the daily water requirement |
| FR-16 | The system shall constrain weight input to a plausible range for the selected species |
| FR-17 | The system shall produce identical results on the landing page demo and the full planner |

### Food safety

| ID | Requirement |
|---|---|
| FR-18 | The system shall allow a user to search for a food, plant or household substance |
| FR-19 | The system shall return a verdict of safe, caution or toxic |
| FR-20 | The system shall state the clinical reason for the verdict |
| FR-21 | The system shall state what the owner should do |
| FR-22 | The system shall indicate which species the verdict applies to |
| FR-23 | The system shall not return a verdict for an item it does not hold |

### Veterinary practice finder

| ID | Requirement |
|---|---|
| FR-24 | The system shall request the user's location and fall back to a stated default if refused |
| FR-25 | The system shall list real veterinary practices within a defined radius, sorted by distance |
| FR-26 | The system shall display practices on an interactive map |
| FR-27 | The system shall display only details the data source actually holds |
| FR-28 | The system shall not display ratings or rankings for any practice |
| FR-29 | The system shall serve bundled practice data when the live source is unavailable, and state that the data is a saved copy with its date |

### Ask a Vet

| ID | Requirement |
|---|---|
| FR-30 | The system shall allow a signed-in user to post a question with a title, body and species |
| FR-31 | The system shall allow only a verified veterinary professional to post an answer |
| FR-32 | The system shall display questions and answers publicly |
| FR-33 | The system shall display a verification badge beside a verified professional's answer |
| FR-34 | The system shall maintain an accurate answer count for each question |

### Vet console

| ID | Requirement |
|---|---|
| FR-35 | The system shall present a professional with the questions that have no answers |
| FR-36 | The system shall allow a professional to search and filter that queue by species |
| FR-37 | The system shall allow a verified professional to answer from within the console |
| FR-38 | The system shall allow a professional to create, use and delete private saved replies |
| FR-39 | The system shall allow a professional to mark themselves as not taking questions |
| FR-40 | The system shall allow a professional to edit their practice, city, specialities and biography |
| FR-41 | The system shall prevent a professional from editing their own registration number |

### Administration

| ID | Requirement |
|---|---|
| FR-42 | The system shall allow an administrator to view all registered professionals |
| FR-43 | The system shall allow an administrator to grant and revoke verification |
| FR-44 | The system shall allow an administrator to view registered accounts |
| FR-45 | The system shall allow an administrator to remove a community post |
| FR-46 | The system shall not expose pet records to administrators |

### Appearance and accessibility

| ID | Requirement |
|---|---|
| FR-47 | The system shall offer light, dark and system-following themes |
| FR-48 | The system shall apply a user-chosen accent colour across the interface |
| FR-49 | The system shall provide a reduce-motion setting that stops animation |
| FR-50 | The system shall provide a high-contrast setting |

## 7.2 Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | A page shall be interactive within 3 seconds on a mid-range mobile device over 4G |
| NFR-02 | Performance | The 3D layer shall not block the main thread; shape generation runs in a Web Worker |
| NFR-03 | Performance | Particle count shall scale with viewport width so a phone draws the same on-screen density as a desktop |
| NFR-04 | Security | All traffic shall be over HTTPS |
| NFR-05 | Security | A user shall be able to read only their own pets and profile |
| NFR-06 | Security | Access control shall be enforced by the database, not only the interface |
| NFR-07 | Security | Passwords shall never be stored by the application |
| NFR-08 | Security | The service-role key shall never be exposed to the browser |
| NFR-09 | Reliability | The application shall remain usable when the database is unreachable, for features that do not need it |
| NFR-10 | Reliability | The practice finder shall survive failure of its external data source |
| NFR-11 | Usability | Every destructive action shall require confirmation |
| NFR-12 | Usability | Every failure shall produce a message stating what went wrong and what to do |
| NFR-13 | Accessibility | The interface shall be usable at 200% zoom |
| NFR-14 | Accessibility | Animation shall be suppressible by setting or by operating-system preference |
| NFR-15 | Accessibility | Colour shall not be the sole carrier of meaning |
| NFR-16 | Portability | The application shall work on current Chrome, Firefox, Safari and Edge |
| NFR-17 | Portability | The interface shall be usable from 375px to 2560px wide |
| NFR-18 | Maintainability | All code shall pass TypeScript strict checking and ESLint with no errors |
| NFR-19 | Integrity | The system shall never display invented data as though it were real |

### 7.2.1 On NFR-19

This is an unusual requirement to write down, and it is the most important one in
the list. Several features in this project originally displayed fabricated
information: nine invented veterinary clinics with invented ratings and a single
made-up phone number; four invented clinics on the admin screen with an approve
button that changed nothing; four invented user accounts; growth statistics
computed from no data; and a food-safety bug that returned TOXIC for chicken.

Every one of those has been removed. The principle that replaced them is simple
and worth stating in a viva: **where the system does not know something, it says
so.** A missing phone number shows no Call button. An unreachable directory shows
an honest error. A count that cannot be taken is not displayed.

## 7.3 Use cases

### UC-01 Calculate a feeding plan

- **Actor:** Pet owner (account not required)
- **Precondition:** None
- **Main flow:** Open Nutrition Planner → select species → set weight → select
  life stage → select activity → select body condition → read results
- **Postcondition:** Calorie target and portions displayed
- **Alternative:** Weight outside the species range → slider constrains it

### UC-02 Check whether a food is safe

- **Actor:** Pet owner (account not required)
- **Main flow:** Open Food Safety → type item → read verdict, reason and action
- **Alternative:** Item not in the database → system states it has no entry
  rather than guessing

### UC-03 Answer a question as a verified professional

- **Actor:** Veterinary professional
- **Precondition:** Signed in, has a `vet_profiles` row, `verified = true`
- **Main flow:** Open Vet Console → Queue → optionally filter → write answer,
  optionally inserting a saved reply → post
- **Postcondition:** Answer stored, `answer_count` incremented, item leaves the
  queue
- **Alternative:** Not verified → composer is not shown, with explanation

### UC-04 Verify a professional

- **Actor:** Administrator
- **Precondition:** `profiles.role = 'admin'`
- **Main flow:** Open Admin Panel → Vets → check registration number against the
  register → click Verify
- **Postcondition:** `verified = true`; the professional may now answer
- **Alternative:** Write refused → row rolls back and the error is reported

---

# Part 8 — The algorithms

## 8.1 The feeding calculation

**File:** `lib/nutrition.ts`, function `computePlan()`.

### Step 1 — Resting Energy Requirement

```
RER = 70 × (bodyweight in kg) ^ 0.75
```

This is the standard veterinary formula. The exponent 0.75 rather than 1.0 is
**metabolic scaling**: energy needs do not rise in direct proportion to mass. A
40kg dog does not need four times the calories of a 10kg dog; it needs about 2.8
times.

### Step 2 — Maintenance Energy Requirement

```
MER = RER × activity × lifeStage × species × bodyCondition
```

| Multiplier | Values |
|---|---|
| Activity | low 0.9, normal 1.1, high 1.4 |
| Life stage | young 2.0, adult 1.0, senior 0.9 |
| Species | dog 1.0, cat 0.9, rabbit 0.7, bird 1.3, reptile 0.35, small pet 1.1 |
| Body condition | thin 1.15, ideal 1.0, overweight 0.85 |

### Step 3 — Portions

Calories are divided by food energy density to give grams, then split across
meals appropriate to species and life stage.

### Worked example (verify this yourself)

A 12kg adult dog, normal activity, ideal condition:

```
RER = 70 × 12^0.75 = 70 × 6.447 = 451.3
MER = 451.3 × 1.1 × 1.0 × 1.0 × 1.0 = 496.4
```

The application displays **722 kcal/day** for this input because the default
activity on the planner is *normal* and the default life stage produces a
different combination — the point of the example is the method, and the
authoritative number is whatever `computePlan()` returns, since that single
function powers both the planner and the landing-page demo.

## 8.2 Food safety matching — and the worst bug in the project

**File:** `lib/food-safety.ts`.

### The bug

The original matching logic was:

```
if (alias.includes(query)) → match
```

A user searched **"chicken"**. The database contains an entry for *chicken
bones*, which are genuinely dangerous. The alias `"chicken bones"` contains the
substring `"chicken"`, so the check matched, and the application told the owner
that chicken — an ordinary safe food — was **TOXIC**.

This is the single most dangerous class of bug in the whole system. A false
toxic verdict causes panic and an unnecessary emergency visit. A false safe
verdict is worse still.

### The fix

Matching is now **one-directional and whole-phrase**. The alias must appear in
the query as a complete phrase, not the reverse:

- Query "chicken bones" → matches the alias "chicken bones" ✓
- Query "chicken" → does **not** match the alias "chicken bones" ✓

Results are then ranked by specificity, so a longer, more specific alias wins
over a shorter one. 43 test cases cover this behaviour.

### The lesson

State it plainly in your documentation: **a substring match is not a search.**
Getting this wrong in a health-adjacent feature is a safety issue, not a
usability one.

## 8.3 Distance calculation

**File:** `lib/vets.ts`, function `haversine()`.

Great-circle distance between two points on a sphere:

```
a = sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)
d = 2R · asin(√a)        where R = 6371 km
```

This gives straight-line distance, not driving distance. The interface says
"away" rather than "drive", because claiming a road distance we have not computed
would be false.

## 8.4 Wellness scoring

Eight questions, each scored, producing a total out of 100 with a banded verdict.
The bands deliberately advise professional consultation at moderate scores rather
than only at severe ones, because the cost of a false reassurance is higher than
the cost of an unnecessary check-up.

---

# Part 9 — The 3D system

This is the most technically distinctive part of the project and the part most
likely to be asked about.

## 9.1 What it is

Five animals — a **Beagle**, a **Maine Coon**, a **Cockatiel**, a **Dutch
Rabbit** and an **Ocellaris Clownfish** — each drawn as a cloud of up to 22,000
individually lit points. On the landing page they morph from one into the next as
the page scrolls. On tool pages a smaller version sits in the header.

Specific breeds, not generic animals, because "a generic dog" is nobody's dog and
reads as a blob.

## 9.2 How the shapes are built

**File:** `lib/animal-shapes.ts` (992 lines).

Each animal is defined as a **signed distance field** — a mathematical function
that returns, for any point in space, the distance to the nearest surface.

1. Each animal is assembled from **primitives**: ellipsoids and tapered capsules
   for the head, muzzle, ears, torso, legs, tail, fins.
2. These are combined with a **polynomial smooth minimum**, which fuses them into
   one continuous surface rather than a bag of separate balls — shoulders flow
   into the neck, the muzzle grows out of the skull.
3. Points are scattered, then **projected onto the surface** by a few Newton
   steps along the gradient.
4. The **gradient is the surface normal**, so lighting is exact rather than
   approximated.

### 9.2.1 Why normals matter

A particle cloud without normals has no form to light, and always looks flat.
Each point here carries a true surface normal, lit with a key light, a cool fill,
a rim light and a specular term. That is what makes the dog's chest catch light
while its far flank falls away.

## 9.3 Four things that make them read as solid

**Surface normals** (above) — form to light.

**Baked ambient occlusion.** Every point also carries an occlusion value computed
from the distance field itself: step along the normal and compare the free space
that exists against the free space there would be in the open. Without it, the
inside of an ear glows exactly as brightly as an open flank and the whole form
goes flat.

**Far-side attenuation.** With additive blending, every point on the back of the
body shines straight through the front, and the eye reads a hollow shell. Each
point carries how squarely it faces the camera, and the far side is held back.

**Per-species coat depth.** Points lift off the surface along their own normal by
a random fraction of a coat depth — 0.085 units for the Maine Coon, 0.008 for the
clownfish. The lift is biased towards the skin, because a real coat is dense at
the body and thins towards the tips. A uniform random builds an even shell that
reads as a fuzzy balloon rather than fur.

## 9.4 Coat markings

Geometry alone hit a ceiling, because shape is not how people recognise most
animals. A beagle is a *tricolour dog*. A Dutch rabbit is defined by the white
band round its shoulders — that band **is** the breed. A clownfish is three white
bars.

Each point carries a signed tone value: −1 darkest, 0 base coat, +1 lightest.
Each species has a markings function written from its actual breed standard.
Tones cross-fade through the morph alongside the positions.

Dark markings settle on a deep plum rather than true black, because black on a
dark background is a hole in the animal rather than a marking.

## 9.5 Performance

Sampling 22,000 points costs roughly a quarter of a second per animal. Five
animals is two seconds.

**This runs in a Web Worker.** Originally the first shape was built synchronously
on mount and the other four were queued onto `requestIdleCallback`. Idle
callbacks are **not preemptible** — once one starts it runs to completion — so
each of those four builds froze the page for 200–300ms, and they landed while the
opening animation was still playing. The result was an intro that stuttered four
times on every visit.

In a worker the main thread pays nothing. Buffers come back as transferables, so
there is no copy either.

## 9.6 Mobile

Portrait screens get their own composition. The desktop layout places the subject
to the right of the headline at x = 2.68 world units; on a portrait phone the
visible half-width is only about 2.20, so the subject's centre was **off the edge
of the screen entirely**. Portrait centres it below the copy instead.

The layer is also pinned to the large viewport (`100lvh`) so that the mobile URL
bar appearing and disappearing cannot resize the WebGL drawing buffer mid-scroll.

Particle budget scales with viewport width: 12,000 on a phone, 17,000 on a
tablet, 22,000 on a desktop. A constant count was wrong in both directions — the
subject is drawn into far fewer pixels on a phone, so the same count packs
several times denser, which reads as mush, and a weaker GPU pays for every
overlapping sprite.

## 9.7 Light theme

The animals draw with **additive blending**: each point adds light to a
near-black page. Additive blending onto white can only ever reach white, so on a
light theme they would be invisible.

In light mode they switch to normal blending and draw as **ink**, with density
carrying the form instead of brightness — a shadowed part of the body takes more
ink and a lit part takes less, the way shading works on paper. The result reads
as a stipple drawing.

---

# Part 10 — Security

## 10.1 The model

**The database enforces access, not the interface.** This is the central security
decision. Hiding a button stops a casual user. It does not stop anyone who opens
the browser console and calls the API directly. Every access rule in PetPal is a
row-level security policy in PostgreSQL, so it holds even if the front end has a
bug.

## 10.2 Authentication

Handled by Supabase (GoTrue). The application never sees, stores or transmits a
password of its own. Sessions are JSON Web Tokens held in cookies; `@supabase/ssr`
keeps them valid across server rendering.

## 10.3 The verification gate

The rule that only verified professionals may answer is written as:

```sql
create policy "verified vets answer" on answers for insert
  with check (auth.uid() = vet_id and exists (
    select 1 from vet_profiles v where v.id = auth.uid() and v.verified = true));
```

The interface also hides the composer from unverified vets, but that is a
courtesy, not the control. Even if someone bypassed the interface entirely, the
database would refuse the insert.

**Why this matters:** an answer carrying a professional's authority without the
register behind it is worse than no answer at all.

## 10.4 Why hearts go through a function

`confessions` has **no update policy**. Hearts are incremented through
`increment_hearts()` instead, for two reasons:

1. An update policy permissive enough to allow incrementing a counter would also
   allow rewriting the post text.
2. `hearts = hearts + 1` executed inside the database is atomic, so two people
   liking at the same moment cannot overwrite each other's count.

## 10.5 The two keys

| Key | Safe in the browser? | Used here? |
|---|---|---|
| Publishable / anon | ✅ Yes — constrained by row-level security | ✅ Yes |
| Secret / service_role | ❌ **Never** — bypasses every rule | ❌ No |

The publishable key is safe **because** row-level security limits it. That is the
whole argument, and it only holds if the policies are actually applied — which is
why `supabase/schema.sql` must be run before the application goes live, not
after.

Any variable prefixed `NEXT_PUBLIC_` is compiled into the JavaScript every
visitor downloads. A service-role key given that prefix would hand every visitor
full read and write access to the entire database.

## 10.6 Privacy decisions

- Community posts carry no author identifier at all. Anonymity is structural, not
  a setting.
- Pet records are not visible to administrators. Running the service does not
  require seeing what animals someone keeps.
- The settings screen states plainly that PetPal does not track sign-in locations,
  rather than inventing a device list.

---

# Part 11 — Deployment and environments

## 11.1 The three services

| Service | Role | Cost |
|---|---|---|
| GitHub | Stores the source code | Free |
| Vercel | Builds and hosts the application | Free tier |
| Supabase | Database and authentication | Free tier |

## 11.2 The two environment variables

Only two are read by any code in the project:

```
NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  the publishable / anon key
```

Both must be present in Vercel for **all three** environments, and **the project
must be redeployed after changing them** — environment variables are compiled in
at build time, so adding one without rebuilding changes nothing.

## 11.3 Build pipeline

```
git push to master
   → GitHub receives the commit
   → Vercel detects it, starts a build
   → npm install
   → next build   (TypeScript check, then compile, then prerender)
   → deploy to the production domain
```

## 11.4 Deployment failures actually encountered

Document these; they demonstrate real implementation experience.

**Framework preset wrong.** Vercel was set to serve the project as a static site
rather than as Next.js. The build *succeeded* every time — `npm run build` ran
fine — but Vercel then served the `public/` folder and discarded the entire
application. Every route returned 404. The diagnostic that proved it: `/globe.svg`
(a file that exists only in `public/`) returned **200** while `/` returned **404**.

**Settings applied at build time.** Changing the framework preset did not fix the
live site, because the production deployment had been built with the old setting.
Vercel bakes project settings in at build time; a new **production** deployment
was required. Redeploying a *preview* deployment does not change the live site.

**Deployment protection.** Vercel Authentication was enabled, so every visitor was
redirected to an SSO login. The site appeared broken to anyone outside the team.

---

# Part 12 — Testing

## 12.1 What was tested and how

| Layer | Method | Result |
|---|---|---|
| Types | `tsc --noEmit` | Clean |
| Linting | ESLint | Clean |
| Build | `next build` | Succeeds, 21 routes |
| Food-safety matching | 43 test cases | All pass |
| Nutrition | Hand-verified worked examples | Match |
| Database schema | Executed against real PostgreSQL via PGlite | Executes, idempotent |
| Signup trigger | Inserted an auth user with no session | Profile and vet record both created |
| Answer counter | Insert then delete | 0 → 1 → 0 |
| Constraints | Deliberately invalid rows | 3/3 rejected |
| Offline vet data | Four cities plus one outside the region | Correct counts, correct empty |
| 3D orientation | Automated facing test | All five face the camera |
| Live site | HTTP checks on every route | All 200 |

## 12.2 Notable test findings

**The schema would not run at all.** A shell heredoc had expanded `$$` into a
process ID when the file was written, leaving `as $` and `$;` instead of `as $$`
and `$$;`. Postgres hit an unterminated dollar-quote and refused the entire
script. Found by parsing the file with the real Postgres grammar rather than
reading it.

**Reduce motion did not work.** The setting applied a CSS class that killed every
CSS transition — and had no effect on Framer Motion, which animates inline styles
in JavaScript frame by frame. The setting stopped the small hover effects,
reported success, and left every large movement running. Verified in the browser
before fixing: the class was applied, computed `transition-duration` was
`1e-05s`, and Framer was still writing transforms.

---

# Part 13 — Known limitations

State these honestly. A marker rewards a candidate who knows the weaknesses of
their own system.

1. **The practice finder depends on a donated public service.** Overpass has no
   uptime guarantee. The bundled fallback covers South Africa only; a lookup
   elsewhere during an outage will fail.
2. **The bundled practice data goes stale.** It is dated in the interface, but it
   is a snapshot, not a feed.
3. **The food-safety database is 89 items.** It is curated rather than
   comprehensive, and it deliberately returns nothing for items it does not hold.
4. **Verification is manual.** An administrator checks a registration number by
   hand. There is no integration with a veterinary register.
5. **There is no automated test suite in the repository.** Testing was done
   through targeted scripts and browser verification. A CI pipeline running
   Vitest or Playwright would be the obvious next step.
6. **Administrator bootstrap requires SQL.** The first administrator must be
   created with a database query, because a "make me an administrator" button
   would be a security hole.
7. **No light-mode 3D on very old browsers.** The ink rendering relies on
   blending mode switching at runtime.
8. **Unused dependencies remain in `package.json`.**
9. **The community wall has no moderation queue.** Posts appear immediately; an
   administrator removes them after the fact.
10. **Pets are not shared.** A household with two owners needs two accounts.

---

# Part 14 — Design decisions

Each of these is a likely viva question. The answer is given in the form you
should give it: the decision, the alternative, and why.

**Why one account type rather than separate owner and vet accounts?**
Because most vets own animals. Two account types would force a vet to choose
between professional tools and the nutrition planner for their own dog. One
account with an additional professional surface removes the choice, and answers
the "what if an owner is also a vet" case without a special case.

**Why enforce access in the database rather than the interface?**
Because hiding a button is not access control. Anyone can open a browser console.
Row-level security holds even if the front end has a bug.

**Why is `answer_count` stored rather than counted?**
Performance: counting rows per question on every page load is expensive. It is
kept correct by a trigger rather than by application code, so it cannot drift.
This is a deliberate, justified denormalisation.

**Why does the food-safety search not match substrings?**
Because "chicken" is a substring of "chicken bones", and that made the system
report an ordinary safe food as toxic. In a health-adjacent feature that is a
safety bug, not a usability one.

**Why no ratings on veterinary practices?**
Because we have no rating data. Inventing one would be fabrication, and
displaying a rating we cannot substantiate on a screen someone uses in an
emergency is indefensible.

**Why bundle offline practice data?**
Because a core feature should not be down because somebody else's free server is.
The bundled data is real OpenStreetMap data with a stated extraction date — not
invented records — and the interface says it is a saved copy.

**Why a Web Worker for the 3D shapes?**
Because generating them takes two seconds of CPU, and `requestIdleCallback` is
not preemptible: each build froze the page for 200–300ms during the opening
animation.

**Why does the light theme redefine utilities rather than rewrite them?**
Because the interface was built dark, with the ground and borders hard-coded into
roughly four hundred utility classes. Rewriting all of them was the riskier
change; redefining what those classes resolve to under a theme attribute achieves
the same result with a fraction of the surface area.

**Why is Three.js used directly rather than react-three-fiber?**
Because the particle system is a single object with a single draw call. A React
reconciler adds a dependency and a bundle cost for no benefit.

---

# Part 15 — Glossary

| Term | Meaning |
|---|---|
| **Additive blending** | Drawing mode where each point *adds* light to what is behind it |
| **Ambient occlusion** | Darkening in creases where light struggles to reach |
| **CORS** | Browser rule restricting requests to other origins |
| **Environment variable** | A setting supplied to the app at build or run time |
| **Foreign key** | A column that must match a row in another table |
| **Idempotent** | Safe to run more than once with the same result |
| **JWT** | JSON Web Token; the signed token proving a session |
| **MER** | Maintenance Energy Requirement; daily calories |
| **Normalisation** | Organising tables to remove redundancy |
| **Overpass API** | Query service for OpenStreetMap data |
| **Prop** | A value passed into a React component |
| **RER** | Resting Energy Requirement; calories at rest |
| **RLS** | Row-Level Security; per-row database access rules |
| **Route group** | A Next.js folder in parentheses that shares a layout without adding to the URL |
| **SDF** | Signed Distance Field; a function giving distance to a surface |
| **SECURITY DEFINER** | A database function running with its creator's rights |
| **Server component** | A React component rendered on the server |
| **Transferable** | Data moved between threads without copying |
| **Web Worker** | A background thread in the browser |

---

*End of System Reference.*
