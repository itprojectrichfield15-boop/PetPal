# PetPal — Setup Guide

**Read this first. Follow it top to bottom. Do not skip a step.**

This guide takes you from an empty computer to a working, deployed copy of PetPal
under your own accounts. It assumes you have never used Supabase or Vercel before.

Total time: about 30 minutes.

---

## What you are building

PetPal is a website. It has two halves:

| Half | What it is | Where it lives |
|---|---|---|
| **The app** | The pages, the design, the 3D animals, all the code | GitHub → Vercel |
| **The database** | Accounts, saved pets, community posts | Supabase |

They are separate services and both are free. The app talks to the database using
two settings called **environment variables**. If those two settings are wrong,
the app loads but sign-in fails with *"Can't reach the database"*.

---

## Step 0 — Accounts you need

Create these three free accounts first. Use the same email for all three so you
don't lose track.

1. **GitHub** — https://github.com (stores the code)
2. **Supabase** — https://supabase.com (the database)
3. **Vercel** — https://vercel.com (puts the website online)

> Sign in to Supabase and Vercel **with your GitHub account**. It saves a lot of
> clicking later.

---

## Step 1 — Put the code on your GitHub

1. Download this project folder to your computer.
2. Go to https://github.com/new and make a new repository.
   - Name it `petpal`
   - Set it to **Public**
   - Do **not** tick "Add a README"
   - Click **Create repository**
3. On your computer, open a terminal **inside the project folder** and run these
   lines one at a time. Replace `YOUR-USERNAME` with your GitHub username.

```bash
git init
git add .
git commit -m "PetPal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/petpal.git
git push -u origin main
```

4. Refresh your GitHub page. The files should be there.

---

## Step 2 — Create the database

1. Go to https://supabase.com/dashboard and click **New project**.
2. Fill in:
   - **Name**: `petpal`
   - **Database Password**: click Generate, then **save it somewhere** — you
     cannot see it again
   - **Region**: pick the one closest to you
3. Click **Create new project** and wait. It takes about two minutes.

> ⚠️ **Free Supabase projects pause after about a week with no traffic.** If
> sign-in stops working weeks later, this is almost always why. Open the
> dashboard and click **Restore** — it takes a minute and loses nothing.

---

## Step 3 — Create the tables

The database is empty. This step creates the six tables the app needs.

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file **`supabase/schema.sql`** from this project.
4. Copy **the entire file** and paste it into the SQL Editor.
5. Click **Run** (or press Ctrl+Enter).

You should see **Success. No rows returned**. That is correct — it means it worked.

To check: click **Table Editor** in the sidebar. You should now see six tables:
`profiles`, `pets`, `confessions`, `vet_profiles`, `questions` and `answers`.

> You can run this file again later without breaking anything. It repairs a
> half-finished setup rather than erroring.

---

## Step 4 — Get your two keys

You need two values from Supabase. Keep this tab open.

1. In Supabase, click the **gear icon** (Project Settings) at the bottom left.
2. Click **Data API**.
3. Copy the **Project URL**. It looks like:
   ```
   https://abcdefghijklmnop.supabase.co
   ```
4. Now click **API Keys** in the same settings menu.
5. Copy the **anon** key (also labelled **public** or **publishable**). It is a
   very long string starting with `eyJ...`.

### Which key is which — this matters

| Key | Safe to put in the website? | Use it here? |
|---|---|---|
| **anon / public** | ✅ Yes — it is designed to be public and is limited by database rules | ✅ **Yes, this is the one** |
| **service_role / secret** | ❌ **NEVER** — it bypasses every security rule | ❌ No |

> 🚨 **Never** put the `service_role` key into a variable whose name starts with
> `NEXT_PUBLIC_`. Anything with that prefix is downloaded by every visitor's
> browser. Publishing the service_role key gives strangers full read and write
> access to your entire database.

---

## Step 5 — Deploy to Vercel

1. Go to https://vercel.com/new
2. Find your `petpal` repository and click **Import**.
3. **Before clicking Deploy**, expand **Environment Variables** and add these
   two. Type the names **exactly** — a single typo is the most common reason
   this fails.

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from Step 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key from Step 4 |

Copy-paste these names rather than typing them:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

4. Click **Deploy** and wait two or three minutes.
5. Vercel gives you a link like `https://petpal-xyz.vercel.app`. That is your
   live website.

### Common mistakes in this step

- **Pasting the URL with a trailing slash or extra path.** It must be exactly
  `https://something.supabase.co` and nothing more.
- **Pasting the wrong key.** The anon key is long (hundreds of characters).
- **A space at the start or end.** Vercel keeps it. Delete and re-paste.

---

## Step 6 — Check it worked

Open your live site and add `/setup` to the end of the address:

```
https://your-site.vercel.app/setup
```

This page runs every check and tells you exactly what is wrong if something is.
Work down the list until all of them are green.

| What it says | What to do |
|---|---|
| Variable not set | Go back to Step 5. Add it, then **redeploy** (below). |
| URL doesn't look like a Supabase URL | Re-copy it from Step 4. No trailing slash. |
| Project does not respond | The project is paused or deleted. Open Supabase and Restore it. |
| Anon key rejected | You copied the wrong key. Get the **anon** one. |
| Table not found | You skipped Step 3. Run `supabase/schema.sql`. |

Then create an account on your site to confirm sign-up works.

---

## ⚠️ You must redeploy after changing a variable

Environment variables are baked into the website **when it is built**. Changing
one in Vercel does **nothing** until you rebuild.

1. Vercel → your project → **Deployments**
2. Click the **…** menu on the newest deployment
3. Click **Redeploy**

If you change a variable and it still doesn't work, you almost certainly forgot
this.

---

## Running it on your own computer (optional)

You only need this if you want to edit the code.

1. Install Node.js (version 20 or newer) from https://nodejs.org
2. In the project folder, create a file called exactly `.env.local`
3. Put this in it, with your own values:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-long-key...
```

4. Then run:

```bash
npm install
npm run dev
```

5. Open http://localhost:3000

> `.env.local` is listed in `.gitignore`, so your keys are never uploaded to
> GitHub. Keep it that way.

---

## Making yourself an admin

The admin console at `/admin` only opens for an admin account.

1. Sign up on your site normally.
2. Supabase → **SQL Editor** → New query.
3. Run this with your own email:

```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

4. Sign out and back in.

---

## Verifying a veterinary professional

PetPal has two kinds of account. Anyone can register as a **veterinary
professional**, but nobody is trusted automatically — a new professional account
is created with `verified = false` and cannot post answers until an
administrator confirms them.

**Why it works this way:** a self-declared "vet" badge on clinical advice is
dangerous. Someone could tell an owner that a toxic food is safe while wearing a
professional badge. The restriction is enforced by a database policy, so hiding
the button in the interface is not what stops it.

To verify someone:

1. Ask them for their registration number and check it against the professional
   register yourself.
2. Supabase → **SQL Editor** → New query.
3. Find them:

```sql
select id, full_name, practice_name, registration_no, verified
from vet_profiles
order by created_at desc;
```

4. Verify the right person, using their id from that list:

```sql
update vet_profiles set verified = true where id = 'paste-their-id-here';
```

They can answer questions on **Ask a Vet** from their next page load.

> There is no admin screen for this yet — it is a deliberate known limitation,
> listed in PROJECT-GUIDE.md. The security model is correct; only the tooling is
> missing.

---

## The four variables you may see

The original deployment had four environment variables. Only two of them do
anything:

| Variable | Needed? | Why |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ **Required** | Where the database is |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ **Required** | Lets the app talk to it |
| `NEXT_PUBLIC_SITE_URL` | ❌ Not used | Left over. Harmless, but no code reads it. |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Not used | Left over. No code reads it. **Never** rename it to start with `NEXT_PUBLIC_`. |

You can safely delete the bottom two.

---

## Troubleshooting

**"Failed to fetch" / "Can't reach the database" when signing in**
The request never reached Supabase. In order of likelihood: the project is
paused, the URL is wrong, or you're offline. Open `/setup`.

**"Invalid login credentials"**
This one really is a wrong email or password — the connection is fine.

**Sign-up works but no confirmation email arrives**
Supabase's built-in email sender is rate-limited and often lands in spam. For a
demo, turn confirmation off: Supabase → **Authentication** → **Sign In / Up** →
**Email** → turn off *Confirm email*.

**The site builds but every page is blank**
Check Vercel → Deployments → the failed build's **Logs**. The error is usually
on the last few lines.

**The map is empty on Find a Vet**
The practice list comes from OpenStreetMap, which is free and needs no key. If
tiles fail to load the app falls back to a second provider, then shows a notice.
The list and Directions links keep working regardless.

---

## Quick reference

```
Live site        https://<your-project>.vercel.app
Setup check      https://<your-project>.vercel.app/setup
Supabase         https://supabase.com/dashboard
Vercel           https://vercel.com/dashboard
Schema to run    supabase/schema.sql
```
