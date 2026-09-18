# Phase 4 — System Design Phase Document

**Worth 20% of the project. Due 30 October 2026.**

Design answers **how**. Phase 3 established what the system must do; this
document specifies how it will do it, in enough detail that someone else could
build it.

The guidelines require eight sections. They are covered below in order.

---

## Suggested length

| Section | Pages |
|---|---|
| 4.1 Introduction | 1–2 |
| 4.2 System Design | 3–4 |
| 4.3 Architectural Design | 8–10 |
| 4.4 Physical Design | 4–5 |
| 4.5 Database Design | 8–10 |
| 4.6 Program Design | 6–8 |
| 4.7 Interface Design | 8–12 |
| 4.8 Security and Backup Design | 4–5 |
| **Total** | **42–56** |

---

# 4.1 Introduction

Short. State:

1. What design is for in this project — translating the analysed requirements
   into a specification that can be built
2. What Phase 3 produced
3. What this document covers — the eight sections
4. The design principles you followed

## The design principles — state these, they recur throughout

**Separation of concerns.** Logic lives in `lib/` with no user interface;
interface lives in `components/` and `app/`. Anything in `lib/` can be run and
tested without a browser.

**Security in the data layer.** Access rules are enforced by the database, not by
the interface. Hiding a control stops a casual user; it does not stop anyone who
opens a browser console.

**Graceful degradation.** Every feature that can work without the database does
work without it. Every external dependency has a defined failure path.

**Honest absence.** Where the system does not hold a fact, the design shows
nothing rather than a placeholder. This is NFR-19 expressed as a design rule.

---

# 4.2 System Design (Description of the Proposed System)

A narrative overview before the diagrams.

## What to cover

1. **System overview** — reuse the one-paragraph description
2. **Design goals**, derived from the non-functional requirements:
   - Usable without an account for the core tools
   - Usable on a phone
   - Zero operating cost
   - Secure by default at the data layer
   - Resilient to external failure
3. **Major subsystems** — the table below
4. **How they interact** — the layer diagram

## Subsystem decomposition

| Subsystem | Responsibility | Principal components |
|---|---|---|
| Presentation | Rendering, interaction, routing | `app/`, `components/` |
| Domain logic | Calculations and rules | `lib/nutrition.ts`, `lib/food-safety.ts`, `lib/vets.ts`, `lib/animal-shapes.ts` |
| Data access | Talking to the database | `lib/supabase/*` |
| Persistence | Storage and access control | Supabase PostgreSQL |
| Identity | Authentication and sessions | Supabase Auth |
| External data | Practice records and map tiles | Overpass API, OSM tiles, bundled extract |
| Visual system | 3D rendering | `AnimalField`, `AuraCanvas`, `shape-worker` |

---

# 4.3 Architectural Design

The guidelines require software, hardware **and** network architecture, plus a
class diagram. Do all four with their own headings.

## 4.3.1 Software Architectural Design

### Architectural style

**Three-tier, client–server, with a serverless application tier.**

Justify the choice:

- **Three-tier** because presentation, logic and data have genuinely different
  concerns and change at different rates.
- **Serverless** because the application tier has no long-running state; each
  request is independent. This is what makes zero-cost hosting possible.
- **Not monolithic MVC** because there is no server-rendered template layer
  holding session state.
- **Not microservices** because the system is small; the operational cost of
  multiple services would exceed any benefit.

Include the layer diagram from `01-SYSTEM-REFERENCE.md` §2.1 as **Figure 4.1**.

### Component diagram

Draw a UML component diagram showing:

- The browser client, with its sub-components: pages, shared components, the 3D
  worker
- The Vercel application tier, with the `/api/vets` route
- Supabase, with Auth and PostgreSQL
- External: Overpass mirrors, OSM tiles
- The bundled dataset as an artifact inside the application

Show interfaces as lollipops with their protocols: HTTPS/REST between client and
Supabase, HTTPS/POST between the API route and Overpass.

### Key architectural decision — why `/api/vets` exists

This deserves its own subsection because it is a genuine architectural decision
forced by a real constraint.

> The practice finder originally called the Overpass API directly from the
> browser. That design failed in production when Overpass ceased returning
> `Access-Control-Allow-Origin` headers: the browser's same-origin policy blocked
> every response, and the feature failed on every request.
>
> Cross-origin restrictions are enforced by browsers, not by servers. Introducing
> a server-side route removes the constraint entirely, because the request to
> Overpass then originates from the application server rather than from the
> page.
>
> The route also provides three further benefits that the direct call could not:
> a descriptive User-Agent, which Overpass asks API consumers to send; a
> ten-minute response cache, so a donated public service is not queried once per
> keystroke; and a single place to implement the fallback to bundled data.

Draw this as a before-and-after diagram. It is one of the strongest pieces of
evidence in the whole document that the design responded to real findings.

### Design patterns used

Name them — markers look for the vocabulary:

| Pattern | Where | Why |
|---|---|---|
| **Layered architecture** | Whole system | Separation of concerns |
| **Repository-ish data access** | `lib/supabase/*` | One place that knows how to talk to the database |
| **Facade** | `computePlan()` | One call hides the multi-step calculation |
| **Strategy** | Species configuration in nutrition | Per-species behaviour selected at run time |
| **Observer** | Preference changes | Components react to a broadcast rather than polling |
| **Worker / offload** | 3D shape generation | Keeps expensive work off the main thread |
| **Circuit-breaker-ish fallback** | Practice lookup | Try mirrors, then degrade to bundled data |
| **Guard clause** | API route validation | Reject bad input before doing work |

### Class diagram

The application is largely functional rather than object-oriented, so model the
**data structures and modules** rather than inventing classes that do not exist.
Say so in the text — an honest model scores better than a fabricated one.

Model these as classes with attributes and operations:

```
┌───────────────────────┐        ┌──────────────────────┐
│      <<entity>>       │        │     <<entity>>       │
│       Profile         │1      *│         Pet          │
│───────────────────────│────────│──────────────────────│
│ -id: UUID             │  owns  │ -id: UUID            │
│ -email: string        │        │ -ownerId: UUID       │
│ -displayName: string  │        │ -name: string        │
│ -role: Role           │        │ -species: Species    │
│ -createdAt: Date      │        │ -weight: number      │
└───────────────────────┘        └──────────────────────┘
          │1
          │
          │0..1
┌───────────────────────┐        ┌──────────────────────┐
│     <<entity>>        │1      *│    <<entity>>        │
│    VetProfile         │────────│    SavedReply        │
│───────────────────────│        │──────────────────────│
│ -id: UUID             │        │ -id: UUID            │
│ -fullName: string     │        │ -vetId: UUID         │
│ -practiceName: string │        │ -title: string       │
│ -registrationNo:string│        │ -body: string        │
│ -verified: boolean    │        │ -uses: number        │
│ -accepting: boolean   │        └──────────────────────┘
│───────────────────────│
│ +canAnswer(): boolean │
└───────────────────────┘

┌───────────────────────┐        ┌──────────────────────┐
│     <<entity>>        │1      *│    <<entity>>        │
│      Question         │────────│       Answer         │
│───────────────────────│        │──────────────────────│
│ -id: UUID             │        │ -id: UUID            │
│ -askerId: UUID        │        │ -questionId: UUID    │
│ -title: string        │        │ -vetId: UUID         │
│ -species: Species     │        │ -body: string        │
│ -answerCount: number  │        └──────────────────────┘
└───────────────────────┘

┌────────────────────────────────┐  ┌───────────────────────────────┐
│        <<service>>             │  │       <<service>>             │
│      NutritionService          │  │      FoodSafetyService        │
│────────────────────────────────│  │───────────────────────────────│
│ +computePlan(input): Plan      │  │ +search(q, species): Result[] │
│ -restingEnergy(kg): number     │  │ -matchAlias(q, a): boolean    │
│ -multipliers(...): number      │  │ -rankBySpecificity(...)       │
└────────────────────────────────┘  └───────────────────────────────┘

┌────────────────────────────────┐  ┌───────────────────────────────┐
│        <<service>>             │  │       <<service>>             │
│         VetService             │  │      ShapeGenerator           │
│────────────────────────────────│  │───────────────────────────────│
│ +fetchNearby(centre, r): Vet[] │  │ +sampleAnimal(key, n): Shape  │
│ +bundledNear(centre, r): Vet[] │  │ -signedDistance(p): number    │
│ +haversine(a, b): number       │  │ -gradient(p): Vec3            │
│ -parseOverpass(json): Vet[]    │  │ -occlusion(p, n): number      │
└────────────────────────────────┘  └───────────────────────────────┘
```

Add an enumeration for `Species` with its nine values and `Role` with its three.

## 4.3.2 Hardware Architectural Design

### Client requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| Device | Smartphone, tablet or computer | Any |
| Browser | Chrome 108+, Firefox 101+, Safari 15.4+, Edge 108+ | Current |
| Screen width | 375px | 1280px+ |
| RAM | 2GB | 4GB+ |
| Graphics | WebGL-capable | Any modern GPU |
| Network | 3G | 4G or broadband |

**State the version floor and why:** the light theme uses the CSS `lvh` unit and
`color-mix()`, which set the browser minimums above. The application degrades
without WebGL — the 3D layer is replaced by a gradient rather than breaking.

### Server requirements

There are no owned servers. State that explicitly and describe the managed
infrastructure:

| Tier | Provider | Specification |
|---|---|---|
| Application | Vercel serverless functions | Allocated per invocation |
| Database | Supabase shared PostgreSQL | 500MB storage on the free tier |
| Static assets | Vercel edge CDN | Globally distributed |

### Development hardware

| Item | Specification |
|---|---|
| Developer machines | Standard laptops, 8GB+ RAM |
| Software | Node.js 20+, Git, a code editor, a browser |

## 4.3.3 Network Architectural Design

### Topology

```
    ┌──────────┐      HTTPS 443      ┌──────────────┐
    │  Client  │────────────────────▶│ Vercel Edge  │
    │ Browser  │◀────────────────────│     CDN      │
    └──────────┘                     └──────────────┘
         │                                   │
         │                                   ▼
         │                          ┌──────────────────┐
         │                          │ Vercel Functions │
         │                          │   /api/vets      │
         │                          └──────────────────┘
         │                                   │
         │  HTTPS 443                        │ HTTPS 443
         ▼                                   ▼
    ┌──────────────┐                 ┌──────────────────┐
    │   Supabase   │                 │ Overpass mirrors │
    │  Auth + DB   │                 │   (4 endpoints)  │
    └──────────────┘                 └──────────────────┘
         ▲
         │ HTTPS 443
    ┌──────────┐
    │  Client  │ (direct, using the publishable key)
    └──────────┘
```

### Protocols and ports

| Path | Protocol | Port | Notes |
|---|---|---|---|
| Client → Vercel | HTTPS | 443 | TLS terminated at the edge |
| Client → Supabase | HTTPS/REST | 443 | Publishable key; RLS enforced |
| Client → OSM tiles | HTTPS | 443 | Map imagery |
| Vercel → Overpass | HTTPS/POST | 443 | Four mirrors, 10s timeout each |

### Why the client talks to Supabase directly

Worth a paragraph. Routing every database call through the application server
would add latency and serve no security purpose, because row-level security
enforces access at the database regardless of who connects. The publishable key
is safe in the browser **because** those policies exist.

### Network failure handling

| Failure | Detection | Response |
|---|---|---|
| Supabase unreachable | Fetch rejection | Features that do not need it continue; `/setup` diagnoses |
| Overpass mirror slow | 10-second timeout | Try the next mirror |
| All mirrors down | All four exhausted | Serve bundled data, flagged as a saved copy |
| Map tiles unavailable | Tile error event | Fall back to a second tile source |
| Client offline | Fetch rejection | Explicit message |

---

# 4.4 Physical Design

## What this section is

The physical realisation: deployment topology, file organisation, technology
bindings.

## 4.4.1 Deployment diagram

A UML deployment diagram with nodes and artifacts:

```
┌─────────────────────────┐    ┌──────────────────────────┐
│ <<device>> User Device  │    │ <<execution environment>>│
│  ┌────────────────────┐ │    │        Vercel            │
│  │ <<artifact>>       │ │    │ ┌──────────────────────┐ │
│  │ Browser runtime    │ │    │ │ <<artifact>>         │ │
│  │  - app bundle      │◀┼────┼─│ .next build output   │ │
│  │  - shape worker    │ │    │ │ vets-za.json         │ │
│  └────────────────────┘ │    │ └──────────────────────┘ │
└─────────────────────────┘    └──────────────────────────┘
             │                              │
             ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│ <<execution environment>> Supabase                      │
│  ┌───────────────────┐  ┌────────────────────────────┐  │
│  │ <<artifact>>      │  │ <<artifact>>               │  │
│  │ GoTrue auth       │  │ PostgreSQL + RLS policies  │  │
│  └───────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 4.4.2 File and folder organisation

Reproduce the repository map from `01-SYSTEM-REFERENCE.md` Part 3, and explain the
organising principle:

- `app/` — routing. The folder path *is* the URL.
- `components/` — reusable interface, split into `public/`, `layout/` and `ui/`
- `lib/` — logic with no interface, therefore testable without a browser
- `supabase/` — the complete schema, in version control

Explain the `(dashboard)` route group: parentheses group pages so they share the
sidebar layout **without** adding a segment to the URL.

## 4.4.3 Build and deployment pipeline

```
Developer commits
  → git push origin master
  → GitHub stores the commit
  → Vercel webhook fires
  → npm install
  → next build      (TypeScript check → compile → prerender)
  → artifacts uploaded
  → production alias updated
```

Document the environment variables and the fact that **they are compiled in at
build time**, so a change requires a rebuild.

## 4.4.4 Storage design

| Data | Where | Why |
|---|---|---|
| User accounts, pets, questions, answers, professional records | Supabase PostgreSQL | Shared, relational, needs access control |
| Care plan progress | Browser local storage | Device-specific, no account required |
| Appearance preferences | Browser local storage | Device-specific by nature |
| Bundled practice data | Static JSON in the build | Must be available when the network is not |
| Care guides, food-safety database | TypeScript source | Editorial content; version-controlled and reviewable |

Justify the last one: putting the food-safety database in source rather than in
the database means every change to a toxicity verdict goes through version
control and can be reviewed. For safety-relevant content that is a feature, not a
limitation.

---

# 4.5 Database Design

The physical model. This is where the tables finally appear.

## 4.5.1 From logical to physical

Show the mapping: each logical entity from Phase 3 becomes a table; each
attribute becomes a column with a concrete type.

| Logical entity | Physical table |
|---|---|
| User profile | `profiles` |
| Pet | `pets` |
| Professional record | `vet_profiles` |
| Saved reply | `vet_replies` |
| Question | `questions` |
| Answer | `answers` |
| Community post | `confessions` |

## 4.5.2 Table specifications

Reproduce every table from `01-SYSTEM-REFERENCE.md` Part 5 in this format:

**Table: `pets`**

| Column | Type | Null | Default | Key | Constraint |
|---|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK | — |
| `owner_id` | uuid | Yes | — | FK → `auth.users(id)` | On delete cascade |
| `name` | text | No | — | — | — |
| `species` | text | No | `'dog'` | — | In 9 permitted values |
| `breed` | text | Yes | — | — | — |
| `age` | text | Yes | — | — | — |
| `weight` | numeric | Yes | — | — | Null or > 0 |
| `sex` | text | Yes | `'male'` | — | male/female/unknown |
| `photo_url` | text | Yes | — | — | — |
| `created_at` | timestamptz | Yes | `now()` | — | — |

Do this for all seven tables.

## 4.5.3 Physical ER diagram

Unlike the logical diagram in Phase 3, this one shows **table names, column names,
data types, primary keys, foreign keys and constraints**. Crow's Foot notation.

## 4.5.4 Indexes

| Index | Table | Columns | Why |
|---|---|---|---|
| Primary keys | All | `id` | Automatic |
| `pets_owner_created_idx` | `pets` | `(owner_id, created_at desc)` | The dashboard always filters by owner and sorts by date |
| `confessions_created_idx` | `confessions` | `(created_at desc)` | The wall is always newest-first |
| `questions_created_idx` | `questions` | `(created_at desc)` | Same |
| `answers_question_idx` | `answers` | `(question_id, created_at)` | Fetching a question's answers in order |
| `vet_replies_owner_idx` | `vet_replies` | `(vet_id, created_at desc)` | A professional's own list |

Explain the principle: index the columns you filter and sort by, not every column.
Every index speeds reads and slows writes.

## 4.5.5 Constraints

Group by type, as in Phase 3 §3.4.2, but now give the implementation:

- **Primary key** — every table
- **Foreign key with cascade** — described per relationship, with justification
- **Check constraints** — enumerated values and ranges, listed per column
- **Not null** — on every attribute the business rules make mandatory
- **Default values** — listed

## 4.5.6 Stored procedures and triggers

| Object | Type | Purpose |
|---|---|---|
| `handle_new_user()` | Function + trigger | Creates the profile, and the professional record when applicable |
| `bump_answer_count()` | Function + trigger | Keeps the derived answer count correct |
| `increment_hearts(uuid)` | Function | Atomic heart increment without an update policy |
| `is_admin()` | Function | Administrator check, used inside policies |

For each, document: name, parameters, return type, security context, and what it
does. Give the pseudocode.

**`handle_new_user` deserves a full explanation,** including *why* it is a trigger
rather than client code — see `01-SYSTEM-REFERENCE.md` §4.2.1. This is a design
decision forced by a real constraint (no session exists at sign-up when email
confirmation is enabled) and it demonstrates understanding of the authentication
lifecycle.

**`is_admin` deserves an explanation too:** a policy on `profiles` that itself
queries `profiles` recurses infinitely. `SECURITY DEFINER` breaks the recursion.

## 4.5.7 Row-level security policy design

Present the full policy matrix — **24 policies**:

| Table | Operation | Who | Rule |
|---|---|---|---|
| `profiles` | select | Owner | `auth.uid() = id` |
| `profiles` | select | Administrator | `is_admin()` |
| `profiles` | insert / update | Owner | `auth.uid() = id` |
| `pets` | all four | Owner | `auth.uid() = owner_id` |
| `confessions` | select / insert | Anyone | `true` |
| `confessions` | update | **Nobody** | No policy exists |
| `vet_profiles` | select | Anyone | `true` |
| `vet_profiles` | insert / update | Self | `auth.uid() = id` |
| `vet_profiles` | update | Administrator | `is_admin()` |
| `vet_replies` | all four | Author | `auth.uid() = vet_id` |
| `questions` | select | Anyone | `true` |
| `questions` | insert | Signed in | `auth.uid() = asker_id` |
| `answers` | select | Anyone | `true` |
| `answers` | insert | **Verified vet only** | `auth.uid() = vet_id AND verified` |

For each non-obvious one, give the design rationale. The two most interesting:

- **`confessions` has no update policy** — because a policy permissive enough to
  increment a counter would also permit rewriting the post. Hearts therefore go
  through a function.
- **`answers` insert requires verification** — the interface also hides the
  composer, but that is a courtesy. The database is the control.

## 4.5.8 Backup and recovery design

Covered fully in §4.8, but note here that the schema itself is in version control
and is idempotent, so the structure can be rebuilt from `supabase/schema.sql` at
any time.

---

# 4.6 Program Design

The guidelines ask for **program pseudocode**. Give pseudocode for the
algorithmically interesting parts, not for CRUD.

## 4.6.1 Modularisation

Explain the decomposition: `lib/` holds logic with no interface; each module has
one responsibility; modules do not import from `app/`, so the dependency graph
has no cycles.

Draw a module dependency diagram.

## 4.6.2 Pseudocode — feeding calculation

Use the structured English from the Phase 3 guide §3.8.5, expanded with the
actual multiplier tables.

## 4.6.3 Pseudocode — food safety matching

This one is worth full detail because of the bug it fixes:

```
FUNCTION SearchFoodSafety(query, species)
    normalised = LOWERCASE(TRIM(query))
    IF normalised IS EMPTY THEN RETURN empty list

    matches = empty list
    FOR EACH entry IN database
        FOR EACH alias IN entry.aliases
            // One-directional, whole-phrase.
            // The ALIAS must appear in the QUERY, never the reverse.
            // Reversing this caused "chicken" to match the alias
            // "chicken bones" and report a safe food as TOXIC.
            IF ContainsWholePhrase(normalised, alias) THEN
                ADD { entry, specificity: LENGTH(alias) } TO matches
                BREAK
            ENDIF
        ENDFOR
    ENDFOR

    IF matches IS EMPTY THEN
        RETURN no-entry result      // never infer a verdict
    ENDIF

    SORT matches BY specificity DESCENDING
    FILTER matches WHERE entry APPLIES TO species
    RETURN matches
END

FUNCTION ContainsWholePhrase(haystack, needle)
    // Word-boundary match, so "cat" does not match "catnip"
    RETURN haystack matches /(^|\W)needle(\W|$)/
END
```

## 4.6.4 Pseudocode — practice lookup with fallback

```
FUNCTION GetNearbyPractices(lat, lng, radius)
    VALIDATE lat IN [-90, 90], lng IN [-180, 180], radius IN (0, 50000]
    IF invalid THEN RETURN error 400

    query = BuildOverpassQuery(lat, lng, radius)
    attempts = empty list

    FOR EACH mirror IN [mirror1, mirror2, mirror3, mirror4]
        TRY
            response = POST query TO mirror WITH timeout 10 seconds
            IF response.ok THEN
                RETURN { practices: Parse(response), source: mirror }
            ELSE
                RECORD attempt failure
            ENDIF
        CATCH timeout OR network error
            RECORD attempt failure
        ENDTRY
    ENDFOR

    // Every mirror failed.
    IF (lat, lng) IS INSIDE bundled region THEN
        practices = BundledPracticesNear(lat, lng, radius)
        IF practices NOT EMPTY THEN
            RETURN { practices, source: "bundled", stale: TRUE,
                     extracted: dataset.date }
        ENDIF
    ENDIF

    RETURN error 502 WITH attempts   // honest failure, never invented data
END
```

## 4.6.5 Pseudocode — 3D shape generation

Worth including; it is the most distinctive algorithm in the project.

```
FUNCTION SampleAnimal(species, pointCount, seed)
    parts   = PartDefinitions(species)      // ellipsoids and capsules
    field   = BuildSignedDistanceField(parts)
    marking = MarkingFunction(species)
    coat    = CoatDepth(species)

    points = empty list
    WHILE COUNT(points) < pointCount AND attempts < limit
        part  = PickPartWeightedBySurfaceArea(parts)
        p     = RandomPointOnSurfaceOf(part)

        // Project onto the fused surface
        REPEAT 4 TIMES
            d = field(p)
            IF |d| < tolerance THEN BREAK
            p = p - gradient(p) * d
        ENDREPEAT

        IF |field(p)| > tolerance THEN CONTINUE   // did not converge

        n   = gradient(p)                 // the true surface normal
        ao  = Occlusion(p, n, field)      // march along n, compare free space
        tone = marking(p)                 // coat pattern, -1 to +1
        ADD { p, n, ao, tone } TO points
    ENDWHILE

    SORT points SPATIALLY      // so the morph between animals is coherent

    FOR EACH point
        lift = coat * random()^2          // biased towards the skin
        position = point.p + point.n * lift
        // normal deliberately NOT changed: lighting stays that of the solid body
    ENDFOR

    RETURN positions, normals, tones, occlusion
END
```

## 4.6.6 Error handling design

State the strategy, then the rules:

| Error class | Strategy | Example |
|---|---|---|
| Invalid user input | Prevent, then validate, then explain | Weight slider constrained to species range |
| External service failure | Retry alternatives, then degrade, then report | Four mirrors → bundled data → honest error |
| Database unreachable | Degrade to offline features; diagnose | `/setup` names the exact problem |
| Permission refused | Report accurately, never silently | Unverified answer attempt is reported |
| Programming error | Fail loudly in development, degrade in production | Type checking catches most before runtime |

**The rule that matters most:** an operation that fails must never report success.
State that explicitly. Several defects found during development were of exactly
this kind — a control that showed a success message while changing nothing.

## 4.6.7 Code standards

| Standard | Rule |
|---|---|
| Language | TypeScript, strict mode |
| Linting | ESLint, zero errors permitted |
| Naming | `camelCase` values, `PascalCase` components and types, `SCREAMING_SNAKE` module constants |
| Files | One component per file, named after the component |
| Comments | Explain *why*, not *what*. Record the reasoning behind non-obvious decisions |
| Functions | One responsibility |
| Imports | Absolute via the `@/` alias |

---

# 4.7 Interface Design

The guidelines require **menu, input and output** design.

## 4.7.1 Design system

Document the visual language before the screens.

**Colour.** The palette is "Ink & Apricot": a warm violet-black ground, apricot
primary, iris secondary, with butter, pistachio and rose as support. Chosen
deliberately against the dark-SaaS default of coral/teal on neutral grey, which
reads as a template.

Give the tokens:

| Token | Dark | Light |
|---|---|---|
| Background | `#0D0A14` | `#FBF7F4` |
| Foreground | `#F4EFF7` | `#24192E` |
| Card | `#171226` | `#FFFFFF` |
| Primary | `#FFAE6D` | user-selectable |
| Secondary | `#8E8BF5` | — |

**Typography.** A display face for headings, a body face for text, a serif italic
for accents. Give the scale.

**Spacing.** A consistent scale based on multiples of 4px.

**Components.** Buttons, cards, inputs, badges, tables, dialogs — show each state:
default, hover, focus, active, disabled, error.

## 4.7.2 Menu Interface Design

Two navigation systems, and a rule for choosing between them:

**Public navigation** (visitors): a floating pill navbar with the brand, seven
section links, sign in, and the primary call to action.

**Application sidebar** (signed in): a vertical list of eleven owner tools, plus
conditional sections:

- **Professional** — appears only when the user has a professional record
- **Admin** — appears only when the user's role is administrator

Draw the site map as a tree. Show which nodes require authentication and which
require a role.

**State the conditional-navigation rule explicitly:** navigation reflects
capability. A user never sees a control they cannot use, and the control's absence
is backed by a database rule rather than only by the interface.

## 4.7.3 Input Design

For every form, document: fields, types, validation, and error messages.

**Sign-up form**

| Field | Type | Required | Validation | Error message |
|---|---|---|---|---|
| Account kind | Toggle | Yes | owner or professional | — |
| Email | Email | Yes | Valid format | "Enter a valid email address" |
| Password | Password | Yes | ≥ 8 characters | "Password must be at least 8 characters" |
| Display name | Text | Owner: no; Professional: yes | Non-empty for professionals | "Professional accounts need your full name" |
| Practice name | Text | No | — | — |
| Registration number | Text | Professional: yes | Non-empty | "Enter your registration number so we can verify you" |

Do this for: add a pet, nutrition planner, food safety search, wellness check,
ask a question, post an answer, saved reply, professional profile, community post,
settings.

**Input design principles to state:**

- **Prevent rather than validate** where possible. The weight control is a slider
  constrained to the species range, so an impossible weight cannot be entered at
  all.
- **Constrain rather than free-type** where the domain is closed. Species is a
  set of buttons, not a text field.
- **Validate at the point of entry**, not on submit, where feasible.
- **Validate again in the database.** Interface validation is for helpfulness;
  database constraints are for correctness.

## 4.7.4 Output Design

For each screen, document what is produced and how it is presented.

| Output | Screen | Form | Notes |
|---|---|---|---|
| Feeding plan | Nutrition | Figures, table, radar chart | Calories, grams, meals, water, macros |
| Safety verdict | Food safety | Colour-coded card | Verdict, reason, action, species scope |
| Practice list | Find a vet | List + interactive map | Distance-sorted; **only fields the source holds** |
| Wellness result | Wellness | Score, band, guidance | Advises consultation at moderate scores |
| Question thread | Ask a Vet | Thread with verification badges | Public |
| Vet queue | Vet console | Filterable list + bar chart | Chart counted from the actual queue |
| Admin tables | Admin | Data tables | Real rows only |

**Output design principles to state:**

- **Show the working.** The nutrition output states the formula basis so the
  number is checkable rather than magical.
- **Colour is never the only carrier.** A toxic verdict is red *and* says "Toxic"
  *and* carries an icon.
- **Absent data shows nothing.** A practice with no telephone number displays no
  call control — never a placeholder.
- **Degraded data is labelled.** Bundled practice results carry a visible notice
  with the extraction date.

## 4.7.5 Screen designs

Include a wireframe or annotated screenshot for each major screen. For each,
label: layout regions, navigation, primary action, and the responsive behaviour.

Cover at minimum: landing, sign-up, dashboard, nutrition, food safety, find a
vet, ask a vet, vet console, admin, settings.

## 4.7.6 Responsive design

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column; sidebar becomes a drawer; 3D subject centred below the copy |
| Tablet | 640–1024px | Two columns where useful |
| Desktop | > 1024px | Full layout; persistent sidebar; 3D subject beside the headline |

**Document the mobile 3D repositioning as a design decision.** On a portrait phone
the desktop composition placed the 3D subject's centre beyond the right edge of
the screen, so it was effectively invisible. Portrait therefore has its own
composition rather than a scaled-down desktop one.

## 4.7.7 Accessibility design

| Requirement | Mechanism |
|---|---|
| Keyboard operable | Every control reachable and operable by keyboard |
| Visible focus | Focus ring on every interactive element |
| Contrast | Text meets WCAG AA; high-contrast mode available |
| Motion | Reduce-motion setting, plus respect for the OS preference |
| Zoom | Usable at 200% |
| Screen readers | Semantic HTML; labels on inputs; decorative elements hidden |
| Colour independence | Meaning never carried by colour alone |

**Note the design constraint discovered in implementation:** a CSS-only
reduce-motion implementation is insufficient, because JavaScript animation
libraries do not use CSS transitions. The setting must be carried into the
animation library itself.

---

# 4.8 Security and Backup Design

## 4.8.1 Security architecture

State the principle first: **defence in depth, with the database as the final
authority.**

| Layer | Control |
|---|---|
| Transport | HTTPS everywhere; TLS terminated at the edge |
| Authentication | Supabase Auth; the application never handles passwords |
| Session | JWT in cookies; refreshed automatically |
| Authorisation — interface | Controls hidden when unusable (courtesy) |
| Authorisation — data | Row-level security on every table (the actual control) |
| Input validation — client | Constrained inputs, immediate feedback |
| Input validation — database | Check constraints, not-null, foreign keys |
| Secrets | Only the publishable key reaches the browser |

## 4.8.2 Authentication design

Document the flows:

**Sign-up:** credentials → Supabase → confirmation email → account created →
trigger creates profile (and professional record if applicable) → user confirms →
first sign-in.

**Sign-in:** credentials → Supabase → JWT issued → stored in a cookie → sent with
every request.

**Password reset:** email requested → Supabase sends a link → user follows it →
sets a new password.

**Sign out others:** revokes every session except the current one.

## 4.8.3 Authorisation design

The full policy matrix from §4.5.7, with the two-tier explanation: the interface
hides what the user cannot do; the database refuses it.

**Include the worked example** of the verification gate, showing both tiers, and
state which one is the control.

## 4.8.4 Data protection

| Concern | Design |
|---|---|
| Personal data at rest | Stored by Supabase; encrypted at rest by the provider |
| Personal data in transit | HTTPS only |
| Passwords | Never stored by the application; hashed by Supabase |
| Pet records | Owner-only, enforced by policy; not visible to administrators |
| Community posts | No author identifier stored at all — anonymity is structural |
| Saved replies | Author-only |
| Account deletion | Cascades to pets, questions, answers and replies |

## 4.8.5 The key-handling rule

Give this its own subsection with an explicit warning:

> Supabase issues two classes of key. The publishable key is designed to be
> exposed and is constrained by row-level security. The secret key bypasses every
> policy.
>
> Any environment variable whose name begins `NEXT_PUBLIC_` is compiled into the
> JavaScript delivered to every visitor. A secret key given that prefix would
> grant every visitor unrestricted read and write access to the entire database.
>
> The design rule is therefore absolute: **no secret key is referenced anywhere
> in the application source.** The application reads exactly two variables, both
> of which are safe to expose.

## 4.8.6 Backup design

| Asset | Backup | Recovery |
|---|---|---|
| Database content | Automated daily backup by Supabase | Restore from the dashboard |
| Database structure | `supabase/schema.sql` in version control | Re-run the script; it is idempotent |
| Application source | Git, hosted on GitHub | Clone and redeploy |
| Deployment configuration | Vercel project settings | Documented in `SETUP.md` |
| Bundled practice data | In the repository | Re-extract from OpenStreetMap |

**State the recovery objectives:**

| Scenario | RPO | RTO | Procedure |
|---|---|---|---|
| Accidental data deletion | 24h | < 1h | Restore the Supabase backup |
| Schema corruption | 0 | < 15 min | Re-run `schema.sql` |
| Hosting failure | 0 | < 30 min | Redeploy from Git |
| Total loss | 24h | < 2h | New Supabase project, run schema, redeploy, set variables |

**Note the free-tier caveat honestly:** backup retention on the free tier is
limited, and a free project pauses after roughly a week of inactivity. Both are
acceptable for a student project and both should be stated rather than glossed
over.

---

# Final checklist before you submit Phase 4

- [ ] Cover page, table of contents, numbering throughout
- [ ] 4.1 Design principles stated
- [ ] 4.2 Subsystem decomposition
- [ ] 4.3 Software architecture with style justified
- [ ] 4.3 Component diagram
- [ ] 4.3 The `/api/vets` decision documented with before-and-after
- [ ] 4.3 Design patterns named
- [ ] 4.3 **Class diagram** (explicitly required)
- [ ] 4.3 **Hardware** architecture — client and server
- [ ] 4.3 **Network** architecture with topology and protocols
- [ ] 4.4 Deployment diagram
- [ ] 4.4 File organisation and build pipeline
- [ ] 4.5 Every table specified with types, keys and constraints
- [ ] 4.5 Physical ER diagram
- [ ] 4.5 Indexes with justification
- [ ] 4.5 Triggers and functions documented
- [ ] 4.5 Full RLS policy matrix
- [ ] 4.6 **Pseudocode** (explicitly required)
- [ ] 4.6 Error-handling strategy
- [ ] 4.6 Coding standards
- [ ] 4.7 **Menu** design with site map
- [ ] 4.7 **Input** design with validation tables
- [ ] 4.7 **Output** design
- [ ] 4.7 Wireframes or annotated screenshots
- [ ] 4.7 Responsive and accessibility design
- [ ] 4.8 Security architecture
- [ ] 4.8 **Backup** design with RPO/RTO
- [ ] No implementation detail has crept in — no test results, no screenshots of
      the finished system used as design
- [ ] References
- [ ] Exported to PDF and checked

---

*Next: `05-PHASE-5-IMPLEMENTATION.md`*
