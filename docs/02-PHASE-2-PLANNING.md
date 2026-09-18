# Phase 2 — Planning Phase Document

**Worth 25% of the project. Due 18 September 2026.**

This is a build sheet. Work top to bottom. Every section tells you what to write,
how long it should be, and gives you the actual content for PetPal so you are
editing rather than inventing.

**Do not copy this file into your document.** Copy the *content blocks*, then put
them in your own layout with your own cover page and headers.

---

## Before you start — the document shell

Set this up once and reuse it for Phases 3, 4 and 5.

| Setting | Value |
|---|---|
| Paper | A4 |
| Line spacing | Single (the guidelines say so explicitly) |
| Font | One serif or sans throughout, 11pt or 12pt |
| Margins | 2.5cm all round |
| Page numbers | **Every page**, bottom centre or bottom right |
| Figure numbers | **Every figure**, with a caption below it |
| Table numbers | **Every table**, with a caption above it |

### The four things that lose easy marks

1. **Unnumbered figures and tables.** The guidelines say "All the pages, tables
   and figures must be numbered. Tables and figures should contain titles."
   That is an explicit instruction. Number every one: *Figure 2.1 — Gantt chart*,
   *Table 2.3 — Cost breakdown*.
2. **Generic theory.** The guidelines say: *"whatever the theory in respect of
   these topics is available in the reference books should be avoided as far as
   possible. The project documentation should be in respect of your project
   only."* Do not write half a page defining what a feasibility study is. Write
   the feasibility study **for PetPal**.
3. **No table of contents with page numbers.** Use Word's automatic table of
   contents so the numbers are right.
4. **Missing cover page.** Module code, project title, group members with student
   numbers, supervisor name, date.

### Suggested length

| Section | Pages |
|---|---|
| 2.1 Identification of Need | 2–3 |
| 2.2 Preliminary Investigation | 3–4 |
| 2.3 Feasibility Study | 4–5 |
| 2.4 Project Planning | 3–4 |
| 2.5 Project Scheduling | 3–4 (mostly charts) |
| 2.6 Software Requirement Specification | 8–12 |
| 2.7 Data Models | 5–8 |
| **Total** | **28–40** |

---

# 2.1 Identification of Need

## What this section is

Why does this system need to exist? You are proving there is a real problem
before proposing a solution.

## Structure

1. Background — the context
2. The problem statement
3. Evidence the problem is real
4. Who is affected
5. Why existing options do not solve it
6. Statement of need

## Content for PetPal

### Background

Pet ownership carries daily decisions that most owners are not trained to make.
How much food is the right amount. Whether a particular human food is dangerous.
Whether a symptom warrants a veterinary visit. These decisions are made many
times a week, usually with no reference material to hand.

### The problem statement

Write it as one sentence, then unpack it:

> Pet owners make frequent, consequential care decisions using scattered,
> inconsistent and sometimes incorrect information, and no single accessible tool
> brings the routine parts of pet care together.

Then give the three specific failures, each as its own paragraph:

**Portion sizes are guessed.** Feeding guides on packaging are given in broad
weight bands and take no account of life stage, neutering status, activity level
or body condition. Owners feed by scoop or by the picture on the bag.
Over-feeding is the most common preventable health problem in companion animals.

**Toxicity information is unreliable.** An owner whose animal has just eaten
something unknown searches the web and receives contradictory answers from
forums, content farms and pages written for a different country. The moment they
most need a clear answer is the moment they are least able to evaluate sources.

**Finding a practice under pressure is hard.** General search returns sponsored
listings, closed businesses and aggregator pages rather than a nearby practice
with a real address and a real phone number.

### Evidence

You need to support these claims. Options, in order of preference:

1. **Your own survey.** Even 20 responses from students and family is primary
   evidence, and primary evidence scores well. See Phase 3 for how to run it.
2. **Published veterinary sources** on companion-animal obesity prevalence.
3. **Observation** — document what you saw when you looked at existing apps.

Cite everything properly. An unreferenced statistic is worse than no statistic.

### Who is affected

Reference the actor table in `01-SYSTEM-REFERENCE.md` §1.5.

### Statement of need

> There is a need for a single, free, accessible web application that provides
> pet owners with accurate feeding calculations, reliable toxicity information,
> real veterinary practice locations, and access to verified professional advice,
> without requiring payment or specialist knowledge.

---

# 2.2 Preliminary Investigation

## What this section is

What you found out before committing to the design. It shows you looked before
you built.

## Structure

1. Objectives of the investigation
2. Methods used
3. Existing systems reviewed
4. Findings
5. Conclusion and recommendation

## Content for PetPal

### Objectives

- Establish whether the problem is real and how widely felt
- Identify existing solutions and their shortcomings
- Determine what a solution would need to do
- Establish whether it can be built within the time and skills available

### Methods

Be specific and honest. State exactly what you did:

| Method | What you did | What it gave you |
|---|---|---|
| Document review | Reviewed packaging feeding guides and published veterinary energy formulas | Confirmed packaging guidance is coarse; identified RER/MER as the correct basis |
| Competitor review | Examined existing pet care applications and websites | Identified the gaps in the table below |
| Technical investigation | Tested OpenStreetMap Overpass API, Supabase free tier, Vercel free tier | Confirmed all three are viable at zero cost |
| Informal interviews | Spoke to pet owners about how they decide portions | Confirmed portions are guessed |

### Existing systems reviewed

| System | Type | Strengths | Weaknesses for our purpose |
|---|---|---|---|
| Packaging feeding guides | Print | Always present | Broad weight bands; ignore life stage, activity, condition |
| General web search | Web | Fast | Contradictory; often written for another country; ad-driven |
| Commercial pet apps | Mobile | Polished | Paid or subscription; often single-species; require account before any use |
| Veterinary practice sites | Web | Authoritative | Single practice only; no tools |
| Online toxicity lists | Web | Often authoritative | Usually a plain list; no search that accounts for species |

### Findings

State them as numbered findings — markers like numbered findings:

- **F1.** No reviewed system combined feeding calculation, toxicity checking and
  practice location.
- **F2.** Most tools required an account before any value was delivered.
- **F3.** Toxicity information was rarely species-specific.
- **F4.** No reviewed system offered access to a verified professional.
- **F5.** The required external data (OpenStreetMap) is available without a key
  or payment.
- **F6.** The required hosting and database (Vercel, Supabase) have free tiers
  sufficient for this project.

### Conclusion

> The investigation confirms an unmet need and establishes that the necessary
> technology is available at no cost. Development is recommended to proceed.

---

# 2.3 Feasibility Study

The guidelines require **Technical, Operational and Economical**. Do all three
with headings, and add Schedule and Legal — they cost little and show breadth.

## 2.3.1 Technical Feasibility

**Question:** can this be built with available technology and skills?

### Technology assessment

| Requirement | Chosen technology | Available? | Justification |
|---|---|---|---|
| Web application | Next.js 16 + React 19 | ✅ | Free, open source, well documented |
| Language | TypeScript 5 | ✅ | Catches errors before runtime |
| Database | PostgreSQL via Supabase | ✅ | Free tier; relational data suits the model |
| Authentication | Supabase Auth | ✅ | Free; avoids writing our own |
| Hosting | Vercel | ✅ | Free tier; built for Next.js |
| Map data | OpenStreetMap | ✅ | No key, no account, open licence |
| 3D graphics | Three.js | ✅ | Free; runs in all target browsers |
| Charts | Recharts | ✅ | Free |

### Skills assessment

Be honest. A table like this, with a mitigation column, scores better than
claiming you already knew everything:

| Skill | Team position | Mitigation |
|---|---|---|
| HTML/CSS/JavaScript | Held | — |
| React | Partial | Official documentation; incremental build |
| TypeScript | Partial | Gradual adoption; compiler guides |
| SQL / relational design | Held from prior module | — |
| Row-level security | New | Supabase documentation; tested against real PostgreSQL |
| Three.js / WebGL | New | Highest-risk area; prototyped first |

### Technical risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 3D performance poor on mobile | Medium | Medium | Scale particle count to viewport; move generation to a Web Worker |
| External map service unavailable | **Realised** | High | Four mirrors; bundled offline dataset |
| Browser blocks cross-origin request | **Realised** | High | Route the call through our own server |
| Free tier limits exceeded | Low | Medium | Usage is far below limits |

Marking the two realised risks is deliberate and honest — both actually happened
during development and both were mitigated. Say so.

**Conclusion:** technically feasible.

## 2.3.2 Operational Feasibility

**Question:** will it actually be used, and can it be operated?

### Will people use it?

- No payment, no subscription.
- Most tools work **without an account** — nutrition, food safety, practice
  finder and guides all work for a visitor. Value is delivered before any
  commitment is asked for.
- Runs in a browser; nothing to install.
- Works on a phone.

### Can it be operated?

| Operational task | Who | Effort |
|---|---|---|
| Verifying professionals | Administrator | Minutes per applicant |
| Moderating the community wall | Administrator | Occasional |
| Updating the food-safety database | Developer | Code change and redeploy |
| Refreshing bundled practice data | Developer | Re-run the extract |
| Hosting and database upkeep | Automatic | None |

### Organisational fit

There is no existing system to replace, so no migration, no retraining and no
resistance to change. This is a greenfield deployment.

**Conclusion:** operationally feasible.

## 2.3.3 Economic Feasibility

**Question:** is it worth it, and can it be afforded?

### Development cost

Cost the labour even though it is unpaid — a feasibility study that reports zero
cost looks unconsidered.

| Item | Basis | Cost |
|---|---|---|
| Development labour | *N* members × *H* hours × notional rate | Fill in |
| Software licences | All tools free/open source | R0 |
| Hardware | Existing student machines | R0 |
| Training | Self-directed, free documentation | R0 |

### Operating cost

| Service | Tier | Monthly |
|---|---|---|
| Vercel | Hobby | R0 |
| Supabase | Free | R0 |
| GitHub | Free | R0 |
| OpenStreetMap | Open data | R0 |
| Domain (optional) | — | ~R200/year |
| **Total** | | **R0** |

### Free-tier limits, and headroom

State the actual numbers. It shows you checked rather than assumed:

| Resource | Limit | Expected use |
|---|---|---|
| Supabase database | 500MB | Well under |
| Supabase monthly active users | 50,000 | Well under |
| Vercel bandwidth | 100GB/month | Well under |

**One operational caveat worth stating:** a free Supabase project **pauses after
about a week with no traffic**. Restoring it takes a minute from the dashboard,
but if the system is left idle before a demonstration it will appear broken. Plan
to open it the day before.

### Benefits

Tangible and intangible, honestly labelled:

- **Intangible:** better-informed owners; earlier veterinary intervention;
  reduced over-feeding.
- **Not claimed:** revenue. There is no monetisation in this project and
  pretending otherwise would be dishonest.

### Cost-benefit conclusion

> Operating cost is zero and development cost is student labour already committed
> to the module. The benefit is a working, deployed system meeting a real need.
> Economically feasible.

## 2.3.4 Schedule Feasibility

Map the phases against the deadlines in the guidelines:

| Phase | Due | Weight |
|---|---|---|
| 1 Proposal | 28 Aug 2026 | 10% |
| 2 Planning | 18 Sep 2026 | 25% |
| 3 Analysis | 9 Oct 2026 | 20% |
| 4 Design | 30 Oct 2026 | 20% |
| 5 Implementation | 9 Nov 2026 | 25% |

State whether the remaining work fits, and what you will cut first if it does not.

## 2.3.5 Legal and Ethical Feasibility

Short but valuable — most groups omit it entirely.

- **Data protection (POPIA).** The system stores email addresses, display names
  and pet details. Personal data is restricted to its owner by row-level
  security. Community posts carry no author identifier.
- **Licensing.** OpenStreetMap data is used under the Open Database Licence and
  attributed on the map. All libraries are MIT or similarly permissive.
- **Professional responsibility.** The system gives guidance, not diagnosis, and
  says so on every health-adjacent screen. Only administrator-verified
  professionals may answer questions, and that rule is enforced by the database.
- **No payment data** is collected anywhere, so PCI requirements do not arise.

---

# 2.4 Project Planning

## What this section is

How the work is organised: scope, breakdown, team, risks, communication.

## 2.4.1 Scope statement

**In scope:** the twelve features listed in `01-SYSTEM-REFERENCE.md` Part 4.

**Out of scope** — state this explicitly, it protects you:

- Appointment booking
- Payments or e-commerce
- Native mobile applications
- Diagnosis
- Practice ratings or reviews
- Messaging between users

## 2.4.2 Work Breakdown Structure

The guidelines explicitly require a WBS. Draw it as a tree or an indented list.

```
1  PetPal
   1.1  Project Management
        1.1.1  Proposal
        1.1.2  Planning documentation
        1.1.3  Analysis documentation
        1.1.4  Design documentation
        1.1.5  Implementation documentation
        1.1.6  Supervisor meetings and minutes
   1.2  Requirements
        1.2.1  Identify need
        1.2.2  Preliminary investigation
        1.2.3  Feasibility study
        1.2.4  Software requirement specification
   1.3  Design
        1.3.1  Database schema
        1.3.2  Data models (ERD, DFD)
        1.3.3  Architecture
        1.3.4  Interface design
   1.4  Development
        1.4.1  Project setup and configuration
        1.4.2  Authentication and accounts
        1.4.3  Pet management
        1.4.4  Nutrition planner
        1.4.5  Food safety checker
        1.4.6  Veterinary practice finder
        1.4.7  Wellness check
        1.4.8  Care plan
        1.4.9  Community wall
        1.4.10 Care guides
        1.4.11 Ask a Vet
        1.4.12 Vet console
        1.4.13 Admin panel
        1.4.14 Settings, themes and accessibility
        1.4.15 3D visual system
   1.5  Testing
        1.5.1  Unit testing
        1.5.2  Integration testing
        1.5.3  System testing
        1.5.4  User acceptance testing
   1.6  Deployment
        1.6.1  Database provisioning
        1.6.2  Hosting configuration
        1.6.3  Production release
```

## 2.4.3 Team and responsibilities

A RACI table (Responsible, Accountable, Consulted, Informed) reads well:

| Work package | Member A | Member B | Member C |
|---|---|---|---|
| Documentation | A | R | C |
| Database | C | A | R |
| Front end | R | C | A |
| Testing | R | R | A |

Fill in your real names and real division of work.

## 2.4.4 Risk register

| ID | Risk | L | I | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|
| R1 | Member unavailable | M | H | 6 | Cross-train; no single owner for any package | PM |
| R2 | 3D too slow on mobile | M | M | 4 | Scale to viewport; Web Worker | Dev |
| R3 | External map API unavailable | **H** | H | 9 | Four mirrors; bundled dataset | Dev |
| R4 | Scope creep | M | M | 4 | Written scope statement; change control | PM |
| R5 | Free tier limits | L | M | 2 | Monitor usage | Dev |
| R6 | Data loss | L | H | 3 | Managed database with backups; schema in version control | Dev |
| R7 | Deadline slip | M | H | 6 | Weekly checkpoints against the Gantt | PM |

Use Likelihood × Impact on a 1–3 scale to get the score. Order by score
descending.

## 2.4.5 Communication plan

| What | Who | How often | Record |
|---|---|---|---|
| Supervisor meeting | Group + supervisor | As scheduled | Minutes, chaired in rotation |
| Group stand-up | Group | Weekly | Minutes |
| Code changes | Developers | Continuous | Git commit history |

The guidelines state meetings must be **chaired and minuted by members in
rotation**, and that minutes must **record attendance**. Put a sample minute in
your appendix.

## 2.4.6 Software Engineering Paradigm

The guidelines list this explicitly. State the model and defend it.

**Chosen model: Iterative and Incremental, aligned to the five assessed phases.**

**Why not pure Waterfall?** Requirements were not fully known at the start. The
3D system, the practice finder and the professional workflow all changed
materially once built and tested. Waterfall provides no route back.

**Why not pure Agile?** The module imposes fixed phase deliverables with fixed
dates and fixed weightings. A pure Agile process with no up-front planning
documentation would not satisfy the assessment.

**The chosen approach** keeps the phase structure the module requires, while
allowing each feature to be built, tested and revised inside its phase. Evidence
that this happened is in the version-control history: the practice finder alone
went through four distinct revisions in response to failures found by testing.

Include a diagram: the five phases in sequence, with feedback arrows returning
from Implementation to Design and from Design to Analysis.

---

# 2.5 Project Scheduling

The guidelines require **both** a PERT chart and a Gantt chart. Producing only
one loses marks.

## 2.5.1 Activity list

Build this table first; both charts come from it.

| ID | Activity | Duration (days) | Predecessor |
|---|---|---|---|
| A | Project proposal | 5 | — |
| B | Identify need & preliminary investigation | 5 | A |
| C | Feasibility study | 4 | B |
| D | Project planning & scheduling | 4 | C |
| E | Software requirement specification | 7 | C |
| F | Data models (ERD, DFD) | 5 | E |
| G | Analysis of existing system | 4 | B |
| H | Requirements analysis | 6 | E, G |
| I | Database design | 5 | F |
| J | Architectural design | 4 | H |
| K | Interface design | 6 | J |
| L | Environment setup | 2 | I |
| M | Authentication & accounts | 4 | L |
| N | Pet management | 3 | M |
| O | Nutrition planner | 4 | L |
| P | Food safety checker | 4 | L |
| Q | Practice finder | 5 | L |
| R | Wellness & care plan | 4 | N |
| S | Community wall | 3 | M |
| T | Ask a Vet | 5 | M |
| U | Vet console | 6 | T |
| V | Admin panel | 4 | T |
| W | Settings & theming | 4 | M |
| X | 3D visual system | 8 | L |
| Y | Testing | 7 | R, S, U, V, W, X, O, P, Q |
| Z | Deployment & final documentation | 4 | Y |

Adjust durations to your real effort. Keep the dependencies.

## 2.5.2 Gantt chart

**How to make it in Excel** (no special software needed):

1. Columns: Task, Start date, Duration.
2. Select the data → Insert → **Stacked Bar** chart.
3. Add two series: Start (bar 1) and Duration (bar 2).
4. Select the Start series → Format → Fill → **No fill**. The bars now float.
5. Select the vertical axis → Format Axis → tick **Categories in reverse order**,
   so task A is at the top.
6. Set the horizontal axis minimum to your project start date.
7. Add a title, then screenshot it into your document as **Figure 2.x**.

Microsoft Project, if you have it, produces this directly — the guidelines
mention Project by name.

## 2.5.3 PERT chart

A PERT chart is a **network diagram**: nodes are activities, arrows are
dependencies. It is not a bar chart.

**Steps:**

1. Draw a node per activity from the table, showing ID and duration.
2. Draw an arrow from each predecessor to its successor.
3. **Forward pass** — compute Earliest Start (ES) and Earliest Finish (EF):
   - ES = the largest EF of all predecessors
   - EF = ES + duration
4. **Backward pass** — compute Latest Start (LS) and Latest Finish (LF):
   - LF = the smallest LS of all successors
   - LS = LF − duration
5. **Float** = LS − ES.
6. **The critical path** is every activity with float = 0. Mark it in a different
   colour and state its total length in days.

You must **state the critical path explicitly** in the text. Markers look for it.

### Three-point estimation (optional, scores well)

PERT proper uses:

```
Expected = (Optimistic + 4 × Most likely + Pessimistic) ÷ 6
```

Apply it to two or three uncertain activities — the 3D system is the obvious
candidate — and show the arithmetic.

## 2.5.4 Milestones

| Milestone | Date |
|---|---|
| M1 Proposal approved | 28 Aug 2026 |
| M2 Planning complete | 18 Sep 2026 |
| M3 Analysis complete | 9 Oct 2026 |
| M4 Design complete | 30 Oct 2026 |
| M5 System deployed and documented | 9 Nov 2026 |

---

# 2.6 Software Requirement Specification

The largest section. Follow the **IEEE 830** structure below — it is the expected
shape and using it signals competence.

## Structure to follow

```
1. Introduction
   1.1 Purpose
   1.2 Scope
   1.3 Definitions, Acronyms and Abbreviations
   1.4 References
   1.5 Overview
2. Overall Description
   2.1 Product Perspective
   2.2 Product Functions
   2.3 User Characteristics
   2.4 Constraints
   2.5 Assumptions and Dependencies
3. Specific Requirements
   3.1 External Interface Requirements
   3.2 Functional Requirements
   3.3 Non-Functional Requirements
   3.4 Other Requirements
```

## What goes in each part

**1.1 Purpose.** One paragraph: what this SRS specifies and who it is for.

**1.2 Scope.** Product name, what it does, what it does not do. Use the scope
statement from §2.4.1.

**1.3 Definitions.** Copy the glossary from `01-SYSTEM-REFERENCE.md` Part 15 and
keep the terms you actually use.

**1.4 References.** The guidelines PDF, the Schwalbe textbook, Next.js docs,
Supabase docs, OpenStreetMap, and your veterinary sources for RER/MER.

**2.1 Product Perspective.** PetPal is a self-contained web application. Include
the layer diagram from `01-SYSTEM-REFERENCE.md` §2.1 as a figure.

**2.2 Product Functions.** A bulleted summary of the twelve features — detail
comes in section 3.

**2.3 User Characteristics.** The four actors from §1.5, with assumed technical
ability. Pet owners are assumed to have no technical training. Professionals are
assumed to be domain experts but not technical.

**2.4 Constraints.**
- Must run in a browser; no installation
- Must work on a phone
- Must cost nothing to operate
- Must be complete by 9 November 2026
- Team skill level as assessed in §2.3.1

**2.5 Assumptions and Dependencies.**
- Users have an internet connection
- Users have a modern browser
- Supabase, Vercel and OpenStreetMap remain available on their current terms
- **Dependency risk stated:** OpenStreetMap Overpass has no uptime guarantee.
  Mitigated by a bundled dataset.

**3.1 External Interface Requirements.**
- *User interfaces* — reference the screens in Part 4; put wireframes here or in
  Phase 4
- *Hardware interfaces* — device geolocation (optional, with a stated fallback)
- *Software interfaces* — Supabase REST and Auth; OpenStreetMap Overpass; OSM
  tile server
- *Communications interfaces* — HTTPS throughout

**3.2 Functional Requirements.** Copy the FR-01 to FR-50 table from
`01-SYSTEM-REFERENCE.md` §7.1 wholesale. It is already in the right form.

**3.3 Non-Functional Requirements.** Copy NFR-01 to NFR-19 from §7.2.

Pay particular attention to **NFR-19** — that the system never displays invented
data as though it were real. Explain it in a short paragraph. It is an unusual
requirement and it demonstrates judgement.

---

# 2.7 Data Models

The guidelines list: DFDs, control flow diagrams, state/sequence diagrams, the
ER model, and class/use-case/activity diagrams "depending upon your project
requirements".

**Do these five.** They are the ones that suit this project.

## 2.7.1 Entity Relationship Diagram

**Entities:** profiles, pets, vet_profiles, vet_replies, questions, answers,
confessions.

**Relationships:**

| From | To | Cardinality | Meaning |
|---|---|---|---|
| profiles | pets | 1 : M | An owner has many pets |
| profiles | vet_profiles | 1 : 0..1 | A user may be a professional |
| vet_profiles | vet_replies | 1 : M | A professional saves many replies |
| profiles | questions | 1 : M | A user asks many questions |
| questions | answers | 1 : M | A question receives many answers |
| vet_profiles | answers | 1 : M | A professional writes many answers |
| confessions | — | — | Belongs to nobody, by design |

**Notation.** Use Crow's Foot. Show the primary key underlined, foreign keys
marked, and every attribute with its data type. Take the attributes from
`01-SYSTEM-REFERENCE.md` Part 5 — they are the real columns.

**Tools:** draw.io (free, browser-based) or Lucidchart. Export as PNG and insert
as a numbered figure.

## 2.7.2 Data Flow Diagrams

**Level 0 (context).** One process, four external entities. Copy the diagram from
`01-SYSTEM-REFERENCE.md` §6.1 and redraw it properly.

**Level 1.** The ten processes in §6.2, with the data stores they touch.

**Level 2.** Decompose **Process 3.0 Calculate Feeding Plan** using §6.3. One
Level 2 is enough; decomposing everything wastes pages.

**Rules that lose marks if broken:**
- A process must have at least one input **and** one output
- Data cannot flow store-to-store directly; a process must sit between them
- Data cannot flow entity-to-entity directly
- Number consistently: 1.0, 2.0 at Level 1; 3.1, 3.2 at Level 2
- Every flow must be labelled with the data it carries

## 2.7.3 Use Case Diagram

**Actors:** Visitor, Pet Owner, Veterinary Professional, Administrator.

Show inheritance: Pet Owner extends Visitor; Professional and Administrator each
extend Pet Owner. This visually encodes the "one account type" decision and is
worth calling out in the text.

**Use cases:** the twelve features, plus sign up, sign in, verify professional.

Use `<<include>>` for authentication where required, and `<<extend>>` for
optional behaviour such as saving a wellness result to a pet.

Write four to six use cases out in full, in the template from §7.3.

## 2.7.4 Activity Diagram

Draw **two**:

1. **Asking and answering a question** — the two-sided flow, with a decision node
   at "is the vet verified?"
2. **Finding a veterinary practice** — with decision nodes at "location
   granted?" and "live directory reachable?", showing both fallback paths.

The second one is worth drawing because it documents real resilience behaviour,
not a happy path.

## 2.7.5 Sequence Diagram

Draw **two**, using the traces in §6.4 and §6.5:

1. A professional answering a question — browser, server, database, with the
   row-level security check and the trigger shown.
2. A practice lookup with all four mirrors failing and the bundled fallback
   serving.

## 2.7.6 State Transition Diagram (optional but cheap)

The professional account is a natural state machine:

```
[Registered] ──administrator verifies──▶ [Verified]
     │                                        │
     │                             marks unavailable
     │                                        ▼
     │                                  [Unavailable]
     │                                        │
     └◀──── administrator revokes ────────────┘
```

---

# Final checklist before you submit Phase 2

- [ ] Cover page: module, title, members with student numbers, supervisor, date
- [ ] Automatic table of contents with page numbers
- [ ] Every page numbered
- [ ] Every figure numbered with a caption **below**
- [ ] Every table numbered with a caption **above**
- [ ] Single line spacing, A4
- [ ] 2.1 Identification of Need
- [ ] 2.2 Preliminary Investigation
- [ ] 2.3 Feasibility — Technical, Operational **and** Economic, each headed
- [ ] 2.4 Project Planning, including the WBS
- [ ] 2.5 **Both** the Gantt chart **and** the PERT chart
- [ ] The critical path stated in words, not only drawn
- [ ] 2.6 SRS in IEEE 830 structure
- [ ] Functional requirements numbered and testable
- [ ] Non-functional requirements numbered
- [ ] 2.7 ERD, DFD levels 0/1/2, use case, activity, sequence
- [ ] References list, properly formatted
- [ ] Appendix: sample meeting minutes with attendance
- [ ] Spell-check run
- [ ] Exported to PDF, opened, and checked that nothing shifted

---

*Next: `03-PHASE-3-ANALYSIS.md`*
