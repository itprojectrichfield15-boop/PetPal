# Phase 3 — Analysis Phase Document

**Worth 20% of the project. Due 9 October 2026.**

The guidelines require exactly eight sections. They are listed below in order,
with what to write in each and the PetPal content to use.

**The single biggest trap in this phase:** Analysis and Design are different
things, and markers penalise mixing them. Analysis answers **what** the system
must do. Design answers **how** it will do it. If you find yourself writing about
tables, classes, screens or architecture, you have wandered into Phase 4 — stop
and move it there.

---

## Suggested length

| Section | Pages |
|---|---|
| 3.1 Introduction | 1–2 |
| 3.2 Information Gathering Methodology | 4–6 |
| 3.3 Analysis of Existing System | 4–5 |
| 3.4 Data Analysis | 4–5 |
| 3.5 Weaknesses of the Current System | 3–4 |
| 3.6 Analysis of Proposed System | 6–8 |
| 3.7 Non-Functional Requirements | 3–4 |
| 3.8 Data Modeling for Proposed System | 5–7 |
| **Total** | **30–41** |

---

# 3.1 Introduction

## What this section is

Sets up the phase. Short. Do not restate the whole project.

## What to write

1. **Purpose of the analysis phase** — one paragraph on what analysis is *for in
   this project*: to establish precisely what the system must do before deciding
   how to build it.
2. **What Phase 2 established** — three or four sentences summarising the need,
   the feasibility conclusion and the requirements captured.
3. **What this document covers** — a short list of the eight sections.
4. **Method** — one paragraph naming the three information-gathering techniques
   the guidelines specify: observation, participatory, interviews.

## Draft opening

> The planning phase established that pet owners make frequent care decisions
> using unreliable and scattered information, and confirmed that a web-based
> solution is technically, operationally and economically feasible. This document
> analyses that problem in depth. It records how information was gathered,
> examines how pet care decisions are currently made, identifies the specific
> weaknesses of those current approaches, and from that derives the functional
> and non-functional requirements of the proposed system, together with its data
> models.

---

# 3.2 Information Gathering Methodology

The guidelines name three methods explicitly: **Observation, participatory,
Interviews**. Cover all three under their own headings. If you did not literally
do one of them, say what you did instead and why — an honest account of a
substituted method scores better than a fabricated one.

## 3.2.1 Observation

**What to write:** what you watched, where, when, and what you concluded.

**For PetPal, real observation you can document:**

| Observed | Where | Finding |
|---|---|---|
| Feeding guidance on commercial pet food packaging | Retail | Guidance given in broad weight bands only; no account of life stage, neutering, activity or body condition |
| Search results for "can dogs eat X" | Web search | Contradictory answers across the first page; several results written for a different country's products |
| Search results for "vet near me" | Web search | Sponsored listings and aggregator pages before actual practices |
| Existing pet care applications | App stores / web | Most require an account before delivering any value; several are single-species |

Record the **date** you observed and the **specific items**. "We looked at three
brands of dog food packaging on 14 September 2026 and recorded their feeding
tables" is evidence. "We observed that packaging is vague" is an assertion.

## 3.2.2 Participatory

**What this means:** you participated in the activity yourself, rather than
watching someone else.

**For PetPal:**

- Group members who own pets recorded how they themselves decided portion sizes
  for one week, before building anything.
- Group members used the existing alternatives — searching for toxicity
  information, searching for a practice — and recorded time taken and confidence
  in the answer.
- Group members walked through the competitor applications as new users and
  recorded where each one demanded an account.

Write up what you found, with numbers where you have them ("finding a toxicity
answer we trusted took between 2 and 9 minutes across five attempts").

## 3.2.3 Interviews

**What to write:** who you interviewed, how many, what you asked, what they said.

**Structure it properly:**

1. **Sample** — how many people, how selected, what they own. Be honest about
   size: "eleven pet owners from among students and family members" is fine.
   Claiming a representative national sample is not.
2. **Instrument** — your question list. Put the full list in an appendix.
3. **Method** — structured, semi-structured or unstructured; in person or online.
4. **Findings** — grouped by theme, with representative quotes.
5. **Limitations** — small sample, convenience sampling, possible bias.

**Question set you can use** (adapt it):

*Feeding*
1. How do you decide how much to feed your pet?
2. Have you ever weighed your pet's food? How often?
3. Has a vet ever told you your pet was over- or under-weight?

*Safety*
4. Has your pet ever eaten something you were worried about?
5. What did you do? How long did it take to get an answer?
6. How confident were you in that answer?

*Veterinary access*
7. How did you choose your current vet?
8. Have you ever needed to find a vet urgently? What happened?

*Tools*
9. Do you use any app or website for pet care? Which?
10. What stopped you using one, if you tried?

*Proposed system*
11. Would a free tool that calculates exact portions be useful to you?
12. Would you trust an answer from a verified vet on a public question board?
13. What would stop you signing up?

### 3.2.4 Summary table

Close the section with a table tying each method to its findings, so the marker
can see the line from evidence to requirement:

| Method | Key finding | Leads to requirement |
|---|---|---|
| Observation | Packaging ignores life stage and activity | FR-13, FR-14 |
| Participatory | Toxicity answers take minutes and are low-confidence | FR-18 to FR-23 |
| Interviews | Owners will not create an account before seeing value | NFR — core tools work signed-out |
| Interviews | Owners would trust a *verified* professional | FR-31, FR-33 |
| Observation | Search returns sponsored and closed listings | FR-25, FR-27, FR-28 |

---

# 3.3 Analysis of the Existing System

## The trap in this section

There is no existing computerised system to replace. Do **not** invent one.

State that plainly, then analyse what people actually do instead — because there
*is* an existing process, it is just manual and fragmented. That is the honest
and the higher-scoring framing.

## Opening sentence

> PetPal does not replace an existing computerised system. Pet owners currently
> manage care through a fragmented manual process combining packaging guidance,
> general web search, informal advice and direct contact with a veterinary
> practice. That process is analysed here as the existing system.

## 3.3.1 The existing process, described

Describe each current path as a process with inputs, steps and outputs.

**Existing Process 1 — Deciding a portion**

| | |
|---|---|
| **Trigger** | Meal time, or acquiring a new animal |
| **Inputs** | The animal, the food packaging, the owner's judgement |
| **Steps** | Read the weight band on the packaging → estimate the animal's weight → scoop an approximate amount → adjust by eye over time |
| **Output** | A portion |
| **Time** | Seconds, repeated twice daily |
| **Accuracy** | Unmeasured. No account of life stage, neutering, activity or body condition |

**Existing Process 2 — Checking whether something is dangerous**

| | |
|---|---|
| **Trigger** | The animal has eaten, or is about to eat, something |
| **Inputs** | The item name, a search engine |
| **Steps** | Search → read several results → attempt to reconcile contradictions → decide |
| **Output** | A judgement, of uncertain reliability |
| **Time** | Minutes, under stress |
| **Accuracy** | Variable. Sources are often not species-specific and may be written for another country |

**Existing Process 3 — Finding a practice**

| | |
|---|---|
| **Trigger** | Routine care, or an emergency |
| **Inputs** | Location, a search engine or word of mouth |
| **Steps** | Search → filter sponsored results → check whether still trading → check hours → call |
| **Output** | A practice, possibly |
| **Time** | Minutes |
| **Accuracy** | Listings may be stale or closed |

**Existing Process 4 — Getting professional advice on a non-urgent question**

| | |
|---|---|
| **Trigger** | A question that does not justify an appointment |
| **Inputs** | The question |
| **Steps** | Ask a friend, post in a forum, wait, or book an appointment |
| **Output** | An unverified answer, or a paid consultation |
| **Cost** | Free and unreliable, or reliable and paid |

## 3.3.2 Existing system flowchart

Draw the current manual process as a flowchart — **Figure 3.x**. Show the
decision points and, critically, the loops where the owner goes back to searching
because the answer was unsatisfactory. Those loops are your evidence of waste.

## 3.3.3 Existing system data

What information exists today, and where it lives:

| Data | Where it lives now | Problem |
|---|---|---|
| Pet details | The owner's memory, or paper vet records | Not accessible when needed; lost when changing practice |
| Feeding history | Not recorded | Cannot detect drift |
| Weight history | The practice's records only | Owner cannot see the trend |
| Toxicity knowledge | Distributed across the web | Inconsistent; not species-aware |
| Practice details | Search engines, directories | Stale; commercially ranked |
| Professional advice | Consultations, forums | Paid, or unverified |

---

# 3.4 Data Analysis (Data Integrity and Constraints)

## What this section is

What data the system handles, what rules that data must obey, and how integrity
is maintained.

**Stay analytical.** Describe the rules the data must satisfy, not the SQL that
implements them — the SQL belongs in Phase 4.

## 3.4.1 Data entities identified

| Entity | Represents | Key attributes |
|---|---|---|
| User profile | A registered person | Identifier, email, display name, role |
| Pet | An animal owned by a user | Name, species, breed, age, weight, sex |
| Professional record | A veterinary professional's credentials | Full name, practice, registration number, verification status, availability |
| Saved reply | A professional's reusable text | Title, body, usage count |
| Question | A query from an owner | Title, body, species, answer count |
| Answer | A professional's reply | Body, author, question |
| Community post | An anonymous message | Text, mood, hearts |

## 3.4.2 Integrity rules

Group these under the three standard headings — markers look for the terms.

### Entity integrity

Every entity has a unique identifier that is never null and never reused.

| Entity | Identifier | Rule |
|---|---|---|
| User profile | Account identifier | Unique, never null |
| Pet | Generated identifier | Unique, never null |
| Question / Answer | Generated identifier | Unique, never null |

### Referential integrity

Every reference must point at something that exists, and deletions must be
defined.

| Relationship | Rule on delete |
|---|---|
| Pet → owner | Deleting the account deletes the pets (cascade) |
| Professional record → account | Cascade |
| Saved reply → professional | Cascade |
| Answer → question | Cascade |
| Answer → professional | Cascade |

Justify the cascade choice: when a user deletes their account, their personal
data must go with it. Leaving orphaned pet records would be both a data-quality
failure and a privacy failure.

### Domain integrity

Every value must be of the right type and within the permitted range.

| Attribute | Domain rule | Reason |
|---|---|---|
| Pet species | One of: dog, cat, bird, rabbit, fish, reptile, small, other, invert | A typo must not create a new species |
| Pet weight | Greater than zero, or absent | A negative weight is meaningless and would break the calculation |
| Pet sex | male, female, unknown | |
| User role | user, vet, admin | |
| Community post text | 10–280 characters | Too short says nothing; too long is not a wall post |
| Community mood | happy, proud, help, sad | |
| Hearts | Zero or greater | A negative count is impossible |
| Question title | 10–140 characters | |
| Question body | 20–1200 characters | Enough context to answer |
| Answer body | 20–2000 characters | A professional answer needs substance |
| Saved reply title | 2–80 characters | |
| Saved reply body | 20–2000 characters | |
| Answer count | Zero or greater | |

## 3.4.3 Derived data

One attribute is derived: the number of answers on a question.

**Analysis:** strictly this is redundant, since it can be counted from the
answers themselves. Storing it is a deliberate denormalisation for performance —
the question list would otherwise require a count for every row on every page
load.

**Integrity consequence:** a stored derived value can drift from the truth. The
rule is therefore that it must be maintained by the data layer itself, not by any
client, so that it cannot be forgotten.

Raise the issue here in Analysis; state the mechanism in Design.

## 3.4.4 Data volume and growth

| Entity | Expected rows in year one | Growth driver |
|---|---|---|
| User profiles | Hundreds | Sign-ups |
| Pets | 1–3 per user | Sign-ups |
| Questions | Tens per month | Engagement |
| Answers | 1–3 per question | Professional availability |
| Community posts | Tens per month | Engagement |
| Professional records | Tens | Verification throughput |

All far below the free-tier storage limit identified in Phase 2.

## 3.4.5 Data security requirements

State the requirement here; the mechanism is Phase 4.

- Pet records must be readable only by their owner
- Profile records must be readable only by their owner and by an administrator
- Saved replies must be readable only by their author
- Community posts must carry no author identifier
- Answers must be writable only by a verified professional
- Access control must be enforced by the data layer, so that a fault in the
  interface cannot expose data

---

# 3.5 Weaknesses of the Current System

## What this section is

The evidence-backed case for change. Every weakness should trace to something you
found in §3.2 and lead to a requirement in §3.6.

## Structure

Number them. For each: the weakness, the evidence, the consequence.

| # | Weakness | Evidence | Consequence |
|---|---|---|---|
| W1 | Portion guidance ignores life stage, activity and body condition | Observation of packaging | Systematic over- and under-feeding |
| W2 | Portions are never measured | Participatory record; interviews | Drift goes undetected |
| W3 | Toxicity information is contradictory | Participatory search records | Owner cannot determine the correct action |
| W4 | Toxicity information is rarely species-specific | Observation | Advice correct for a dog may be wrong for a cat or rabbit |
| W5 | Answers are slow to obtain under stress | Participatory timing | Delay in a situation where time matters |
| W6 | Practice listings are commercially ranked | Observation of search results | Nearest or most suitable practice is not surfaced |
| W7 | Listings may be stale | Observation | Owner contacts a closed business |
| W8 | No route to professional advice short of an appointment | Interviews | Minor questions go unanswered, or are answered by non-experts |
| W9 | Nothing records the animal's history | Interviews | Trends invisible to the owner |
| W10 | Existing tools demand an account before delivering value | Participatory walkthrough | Owners abandon before benefit |
| W11 | Existing tools are often single-species | Observation | Owners of rabbits, birds and reptiles are poorly served |
| W12 | Information is spread across many places | All methods | No single reference point |

## Closing paragraph

> These weaknesses are not independent. They share a root cause: the information
> required to care for an animal well exists, but it is fragmented across
> sources of varying reliability, none of which is tailored to the specific
> animal in question. The proposed system addresses the root cause by bringing
> the routine decisions into one place and making each one specific to the
> species, and where relevant to the individual animal.

---

# 3.6 Analysis of the Proposed System (Functional Requirements)

## What this section is

What the new system must do, derived from the weaknesses above.

## 3.6.1 Proposed system overview

One page: what PetPal is, its scope boundary, and a diagram. Use the one-paragraph
description and the scope statement from `01-SYSTEM-REFERENCE.md` §1.1 and §1.4.

## 3.6.2 Traceability — weaknesses to requirements

**Include this table.** It is the single most valuable thing in the section
because it proves the requirements were derived rather than imagined.

| Weakness | Requirement(s) | How it is addressed |
|---|---|---|
| W1, W2 | FR-13, FR-14, FR-16 | Calculation using species, weight, life stage, activity, body condition; output in grams |
| W3, W4 | FR-18 to FR-23 | Curated database; verdict, reason and action; species-specific |
| W5 | FR-18, NFR-01 | Single search, immediate result |
| W6, W7 | FR-25, FR-27, FR-28 | Distance-sorted open data; only facts held by the source; no ranking |
| W8 | FR-30 to FR-34 | Ask a Vet with database-enforced verification |
| W9 | FR-08 to FR-10 | Pet profiles |
| W10 | NFR (signed-out access) | Core tools work without an account |
| W11 | FR-12, FR-13 | Nine species supported throughout |
| W12 | All | One application |

## 3.6.3 Functional requirements

Copy the full FR-01 to FR-50 table from `01-SYSTEM-REFERENCE.md` §7.1, organised
under the same subheadings.

**Add a priority column** using MoSCoW:

| Priority | Meaning | Examples |
|---|---|---|
| **Must** | Without it the system fails its purpose | FR-13 nutrition, FR-18 food safety, FR-31 verified answers |
| **Should** | Important, not fatal to omit | FR-25 practice finder, FR-35 vet queue |
| **Could** | Desirable | FR-38 saved replies, FR-47 themes |
| **Won't (this release)** | Explicitly excluded | Booking, payments, messaging |

Listing the **Won't** items is as valuable as the others — it demonstrates
controlled scope.

## 3.6.4 Use cases in full

Write out at least six use cases using this template:

```
Use Case ID:        UC-xx
Use Case Name:
Actor(s):
Description:
Preconditions:
Postconditions:
Main Flow:          1. …
                    2. …
Alternative Flows:  A1. …
Exception Flows:    E1. …
Related Requirements:
```

Start from the four in `01-SYSTEM-REFERENCE.md` §7.3 and add sign-up, posting a
question, and verifying a professional.

**Write at least one exception flow for each.** Most student documents write only
the happy path, and the exceptions are where the marks are. Good ones for this
project:

- Location permission refused → system falls back to a stated default and says so
- Live practice directory unreachable → system serves bundled data and states
  that it is a saved copy
- Unverified professional attempts to answer → refused by the data layer
- Searched food not in the database → system states it has no entry rather than
  guessing

---

# 3.7 Non-Functional Requirements

Copy NFR-01 to NFR-19 from `01-SYSTEM-REFERENCE.md` §7.2, grouped under
Performance, Security, Reliability, Usability, Accessibility, Portability,
Maintainability and Integrity.

## Make each one measurable

A non-functional requirement that cannot be tested is not a requirement. Compare:

| Weak | Strong |
|---|---|
| "The system should be fast" | "A page shall be interactive within 3 seconds on a mid-range mobile device over 4G" |
| "The system should be secure" | "A user shall be able to read only their own pet records, enforced by the data layer" |
| "The system should be accessible" | "The interface shall be usable at 200% browser zoom" |

## Give NFR-19 its own subsection

This is the requirement that distinguishes the project. Write two or three
paragraphs:

> **NFR-19 — The system shall never display invented data as though it were real.**
>
> This requirement was introduced after analysis of an early prototype found
> several instances of fabricated information presented as fact: a set of
> veterinary practices generated in code, each with a manufactured rating and a
> single shared telephone number; an administrative screen listing clinics that
> did not exist alongside an approval control that changed nothing; a list of
> registered users that was hard-coded; growth statistics with no underlying
> measurement; and a search fault that reported an ordinary safe food as toxic.
>
> In a system that people consult about the welfare of an animal, fabricated
> information is not a cosmetic defect. A manufactured practice listing sends
> someone to an address that does not exist at the moment they most need one. A
> false toxicity verdict causes either unnecessary panic or, in the opposite
> direction, inaction.
>
> The requirement is therefore stated positively: where the system does not hold
> a fact, it must say so rather than supply a plausible substitute. A practice
> with no recorded telephone number displays no call control. An unreachable data
> source produces an explicit message. A statistic that cannot be measured is not
> shown.

## Quality attribute scenarios (optional, scores well)

Express two or three NFRs as scenarios:

> **Source:** A user on a mobile device
> **Stimulus:** Opens the practice finder while the external directory is down
> **Environment:** Normal operation, external dependency unavailable
> **Response:** The system serves bundled practice data and displays a notice
> stating that the data is a saved copy, with its date
> **Measure:** Results displayed within 45 seconds; the notice is always present
> when bundled data is used

---

# 3.8 Data Modeling for the Proposed System

## What goes here versus Phase 4

- **Here (Analysis):** the *logical* model — entities, attributes, relationships,
  and the flow of data. Technology-neutral.
- **Phase 4 (Design):** the *physical* model — tables, column types, indexes,
  keys, constraints as implemented.

Students routinely put the physical model here and have nothing left for Design.
Keep them separate.

## 3.8.1 Logical ER model

Entities and relationships from `01-SYSTEM-REFERENCE.md` §5.1 and §2.7.1 of the
Phase 2 guide.

**At this stage:**
- Name entities and attributes in business language, not column names —
  "Professional Record", not `vet_profiles`
- Show cardinality and optionality
- Do **not** give data types yet — that is physical design

## 3.8.2 Normalisation

Show the working. Markers want to see the process, not just the conclusion.

**Start from an unnormalised form.** Take a realistic flat record:

```
UNF: Question(questionID, title, body, species, askerEmail, askerName,
              answer1Body, answer1VetName, answer1VetPractice, answer1Verified,
              answer2Body, answer2VetName, answer2VetPractice, answer2Verified)
```

**To 1NF** — remove repeating groups. The repeated answer columns become their
own rows:

```
1NF: Question(questionID, title, body, species, askerEmail, askerName)
     Answer(questionID, answerNo, body, vetName, vetPractice, verified)
```

**To 2NF** — remove partial dependencies on a composite key. In `Answer`, the key
is (questionID, answerNo), but the vet's details depend on the vet, not on that
pair:

```
2NF: Question(questionID, title, body, species, askerID)
     Answer(answerID, questionID, vetID, body)
     Vet(vetID, vetName, vetPractice, verified)
     User(askerID, email, name)
```

**To 3NF** — remove transitive dependencies. Confirm no non-key attribute depends
on another non-key attribute. The practice name depends on the vet, and the vet
is a key in its own table, so this holds.

**Then state the deliberate exception:** `answer_count` on Question is a stored
derived value, justified in §3.4.3.

## 3.8.3 Data dictionary

The guidelines mention data dictionaries in the expected outcomes. Include one.

| Attribute | Entity | Type | Length | Required | Domain | Description |
|---|---|---|---|---|---|---|
| Pet name | Pet | Text | — | Yes | Any | The animal's name |
| Species | Pet | Text | — | Yes | 9 permitted values | The kind of animal |
| Weight | Pet | Decimal | — | No | > 0 | Bodyweight in kilograms |
| Verification status | Professional | Boolean | — | Yes | true/false | Whether an administrator has confirmed the registration |
| Availability | Professional | Boolean | — | Yes | true/false | Whether taking questions |
| Answer count | Question | Integer | — | Yes | ≥ 0 | Derived; number of answers |

Extend it to cover every attribute. It is tedious and it earns marks.

## 3.8.4 Data flow diagrams

Levels 0, 1 and one Level 2, as set out in the Phase 2 guide §2.7.2. If you
produced them for Phase 2, **refine rather than repeat** — analysis is where they
should gain detail.

## 3.8.5 Process specifications

The expected outcomes mention **structured English, decision tables and decision
trees**. Include one of each; they are quick and they are explicitly listed.

### Structured English — the feeding calculation

```
BEGIN CalculateFeedingPlan
    GET species, weight, lifeStage, activity, bodyCondition
    IF weight NOT within permitted range FOR species THEN
        CONSTRAIN weight to nearest permitted value
    ENDIF
    COMPUTE restingEnergy = 70 * (weight ^ 0.75)
    SET activityFactor   FROM activity
    SET stageFactor      FROM lifeStage
    SET speciesFactor    FROM species
    SET conditionFactor  FROM bodyCondition
    COMPUTE dailyEnergy = restingEnergy * activityFactor * stageFactor
                          * speciesFactor * conditionFactor
    COMPUTE dryGrams  = dailyEnergy / dryFoodDensity
    COMPUTE wetGrams  = dailyEnergy / wetFoodDensity
    SET mealCount FROM species AND lifeStage
    COMPUTE gramsPerMeal = dryGrams / mealCount
    RETURN dailyEnergy, dryGrams, wetGrams, mealCount, gramsPerMeal
END
```

### Decision table — may this user answer a question?

| Condition | R1 | R2 | R3 | R4 |
|---|---|---|---|---|
| Signed in | N | Y | Y | Y |
| Has professional record | – | N | Y | Y |
| Verified | – | – | N | Y |
| **Action** | | | | |
| Show composer | – | – | – | ✓ |
| Show "sign in" | ✓ | – | – | – |
| Show queue read-only | – | ✓ | ✓ | – |
| Show "verification pending" | – | – | ✓ | – |

### Decision tree — food safety result

```
Search term entered
├── Matches an entry exactly or as a whole phrase
│   ├── Verdict = toxic   → red result, clinical reason, "contact a vet now"
│   ├── Verdict = caution → amber result, reason, safe quantity guidance
│   └── Verdict = safe    → green result, reason, any conditions
└── No match
    └── State that the database holds no entry for this item;
        do not infer a verdict
```

That final branch is the important one. Say in the text why: inferring a verdict
for an unknown item is exactly how a system produces a confidently wrong answer
about something dangerous.

---

# Final checklist before you submit Phase 3

- [ ] Cover page and automatic table of contents
- [ ] All pages, figures and tables numbered and captioned
- [ ] 3.1 Introduction — short, does not restate the whole project
- [ ] 3.2 All three methods covered: observation, participatory, interviews
- [ ] Interview instrument in an appendix
- [ ] Sample size and limitations stated honestly
- [ ] 3.3 States plainly that there is no existing computerised system
- [ ] 3.3 Current manual process analysed with a flowchart
- [ ] 3.4 Entity, referential and domain integrity each covered
- [ ] 3.4 Derived data identified and justified
- [ ] 3.5 Weaknesses numbered, each with evidence
- [ ] 3.6 Traceability table from weaknesses to requirements
- [ ] 3.6 Functional requirements numbered, testable, prioritised
- [ ] 3.6 At least six full use cases **with exception flows**
- [ ] 3.7 Non-functional requirements measurable
- [ ] 3.7 NFR-19 given its own discussion
- [ ] 3.8 Logical ER model (not physical)
- [ ] 3.8 Normalisation shown UNF → 1NF → 2NF → 3NF with working
- [ ] 3.8 Data dictionary
- [ ] 3.8 Structured English, decision table and decision tree
- [ ] No design detail has crept in — no tables, no classes, no screens
- [ ] References
- [ ] Exported to PDF and checked

---

*Next: `04-PHASE-4-DESIGN.md`*
