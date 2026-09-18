# PetPal — Documentation

**Read this page first. It tells you which file you need and in what order.**

---

## What is in this folder

| File | What it is | When you need it |
|---|---|---|
| **`00-START-HERE.md`** | This page | Now |
| **`01-SYSTEM-REFERENCE.md`** | Everything the system is and does, in full | Constantly. This is the source of truth |
| **`02-PHASE-2-PLANNING.md`** | How to write the Planning document (25%) | Due 18 Sep 2026 |
| **`03-PHASE-3-ANALYSIS.md`** | How to write the Analysis document (20%) | Due 9 Oct 2026 |
| **`04-PHASE-4-DESIGN.md`** | How to write the Design document (20%) | Due 30 Oct 2026 |
| **`05-PHASE-5-IMPLEMENTATION.md`** | How to write the Implementation document (25%) | Due 9 Nov 2026 |

Two more files live in the project root:

| File | What it is |
|---|---|
| **`../SETUP.md`** | How to deploy the whole thing from nothing. Follow it exactly |
| **`../PROJECT-GUIDE.md`** | An earlier orientation guide. Superseded by `01-SYSTEM-REFERENCE.md` where they disagree |

---

## How the phase guides work

Each phase guide is a **build sheet**, not an essay. For every section the
guidelines require, it tells you:

1. What that section is for
2. How long it should be
3. What to write — with the actual PetPal content, so you are editing rather than
   inventing
4. What loses marks

**Do not paste a phase guide into your document.** They are instructions. Take
the content blocks out of them, put them in your own Word document with your own
cover page, and write the connecting prose in your own words.

---

## Do these four things before you write anything

### 1. Make sure the system actually runs

Open the live site. If it is down, nothing else matters.

**https://pet-pal-kappa.vercel.app**

If it does not load, work through `../SETUP.md`, and use `/setup` on the site —
it tells you exactly which piece is missing.

> ⚠️ **A free Supabase project pauses after about a week with no traffic.** If
> you have not opened the site in a while it will appear broken. Open the
> Supabase dashboard and restore it. **Do this the day before any
> demonstration.**

### 2. Set up your document template once

A4, single line spacing, page numbers on every page, automatic table of contents.
Build it once and reuse it for all four phases. The exact settings are at the top
of `02-PHASE-2-PLANNING.md`.

### 3. Read Part 1 of the System Reference

Ten minutes. It gives you the vocabulary for everything else.

### 4. Check what is already written

`01-SYSTEM-REFERENCE.md` already contains, ready to use:

- 50 numbered functional requirements (§7.1)
- 19 numbered non-functional requirements (§7.2)
- Every database table with every column (Part 5)
- Data flow descriptions for your DFDs (Part 6)
- Use cases (§7.3)
- The algorithms with worked examples (Part 8)
- The security model (Part 10)
- Ten honest limitations (Part 13)
- Design decisions with their reasons (Part 14)
- A glossary (Part 15)

---

## The three rules that will cost you marks if you break them

### Rule 1 — Number everything

The guidelines say it outright: *"All the pages, tables and figures must be
numbered. Tables and figures should contain titles."*

Every page. Every figure, with a caption **below** it. Every table, with a
caption **above** it.

### Rule 2 — Write about PetPal, not about theory

The guidelines say: *"whatever the theory in respect of these topics is available
in the reference books should be avoided as far as possible. The project
documentation should be in respect of your project only."*

Do not write a page explaining what a feasibility study is. Write the feasibility
study **for PetPal**. The marker knows what a DFD is; they want to see yours.

### Rule 3 — Keep the phases apart

| Phase | Answers |
|---|---|
| Analysis | **What** must the system do? |
| Design | **How** will it do it? |
| Implementation | **How** was it actually built and tested? |

If you are writing about tables and columns in Analysis, you have jumped to
Design and will have nothing left to say later.

---

## What makes this project score well — use these

Every project has a feature list. These are the things that separate a good mark
from an average one, and they are all real and documented:

**1. Defects with root-cause analysis.** The food-safety search once returned
**TOXIC for chicken**, because it tested whether the stored phrase contained the
search instead of the reverse. Full story in `01-SYSTEM-REFERENCE.md` §8.2 and
`05-PHASE-5-IMPLEMENTATION.md` D-01. Twelve defects are logged with causes and
fixes. Most student projects present a system that apparently never broke.

**2. Security enforced in the database, not the interface.** 24 row-level
security policies. Hiding a button stops a casual user; it does not stop anyone
who opens a browser console. Be able to say this in the presentation.

**3. Real external data, and a real failure plan.** The practice finder uses
OpenStreetMap. When every mirror failed in production, a bundled offline dataset
of 189 real practices was added — labelled with its extraction date, never
presented as live.

**4. Refusing to fabricate.** NFR-19: the system never displays invented data as
though it were real. Several features originally did — invented clinics with
invented ratings, invented user accounts, statistics computed from nothing. All
removed. This is unusual and it demonstrates judgement.

**5. Accessibility that actually works.** Reduce motion, high contrast, a real
light theme, keyboard operation. And an honest finding: a CSS-only reduce-motion
implementation *does not work*, because JavaScript animation does not use CSS
transitions.

**6. A genuinely difficult technical component.** The 3D animals are built from
signed distance fields with baked ambient occlusion and per-species coat depth,
generated in a Web Worker. Part 9 of the System Reference explains it.

---

## Presentation — it is half the mark

*"Project Documentation carries 50% of the overall project and Project
presentation by the individual student will carry 50%."*

**Every student is marked individually and must understand the whole system.**
The ten questions most likely to be asked, with where to find the answers, are at
the end of `05-PHASE-5-IMPLEMENTATION.md`.

---

## If you get stuck

| Problem | Where to look |
|---|---|
| The site will not load | `../SETUP.md`, then `/setup` on the site |
| Sign-in fails | `/setup` names the exact cause |
| No vets appear | Expected if the external service is down; the bundled fallback should cover South Africa |
| Admin Panel missing | Nobody is an administrator yet. `05-PHASE-5-IMPLEMENTATION.md` §5.5.3 |
| Vet cannot answer | They are not verified. Admin Panel → Vets → Verify |
| I do not understand a term | `01-SYSTEM-REFERENCE.md` Part 15 |
| I do not know what to write | The phase guide for that phase, section by section |

---

*Start with `01-SYSTEM-REFERENCE.md` Part 1, then open the phase guide for
whichever deadline is next.*
