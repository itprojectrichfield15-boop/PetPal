-- ════════════════════════════════════════════════════════════════════════════
--  PetPal — complete database schema
--
--  RUN THIS ONCE, IN FULL, in the Supabase SQL Editor.
--  (Supabase dashboard → your project → SQL Editor → New query → paste → Run)
--
--  It is safe to run more than once: every statement uses IF NOT EXISTS or
--  DROP ... IF EXISTS first, so re-running repairs a partial setup instead of
--  erroring.
--
--  This replaces the six older migration files. Those were inherited from the
--  unrelated project PetPal was forked from and created five tables the app
--  never queries (companies, toxicity_reports, burnout_assessments, resources,
--  report_upvotes). Everything PetPal actually uses is below: nine tables,
--  seven functions and four triggers.
--
--  If your database was set up from an older copy of this file, run this one
--  in full again — it adds the health-record tables and closes several
--  security holes, without touching existing data. tests/schema.test.mjs runs
--  this file in a real Postgres and attacks every policy (npm test).
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
--    One row per registered user, created automatically on sign-up.
--    Supabase already stores the login itself in auth.users; this table holds
--    the application-level details we are allowed to read and display.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  -- 'vet' is the second user type; see section 4.
  role         text default 'user' check (role in ('user', 'vet', 'admin')),
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

-- A user may read and update only their own profile.
drop policy if exists "read own profile" on profiles;
create policy "read own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "update own profile" on profiles;
create policy "update own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
  on profiles for insert
  with check (auth.uid() = id and role = 'user');

-- The update policy above decides WHICH ROW a user may touch; these grants
-- decide WHICH COLUMNS. Without them a user could run
--   update profiles set role = 'admin' where id = auth.uid()
-- from the browser console and is_admin() would believe it. A user may change
-- how they appear, never what they are allowed to do.
revoke update on profiles from anon, authenticated;
grant update (display_name, avatar_url) on profiles to authenticated;


/*
 * Is the caller an administrator?
 *
 * This has to be a SECURITY DEFINER function rather than a subquery inside the
 * policy. A policy ON profiles that itself SELECTs FROM profiles recurses
 * infinitely — Postgres applies the policy to the subquery, which applies the
 * policy again. SECURITY DEFINER runs the lookup with the definer's rights, so
 * row-level security does not apply inside it and the recursion never starts.
 */
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- The admin screen lists registered accounts. Without this an administrator
-- could read only their own row, so that screen had nothing real to show and
-- displayed four invented people instead.
drop policy if exists "admin reads profiles" on profiles;
create policy "admin reads profiles"
  on profiles for select
  using (is_admin());


-- When someone signs up, create their profile row automatically.
-- SECURITY DEFINER lets the trigger write to profiles even though the new user
-- has no permissions of their own at that instant.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', 'Pet Parent'),
    case when new.raw_user_meta_data->>'role' = 'vet' then 'vet' else 'user' end
  )
  on conflict (id) do nothing;

  /*
   * A professional signing up also gets their vet_profiles row here, and it
   * has to happen in this trigger rather than from the client.
   *
   * The signup page used to insert it straight after auth.signUp(). That
   * silently failed every time: with email confirmation on — Supabase's
   * default — signUp returns a user but no SESSION, so auth.uid() is null,
   * and the row-level policy on vet_profiles is `with check (auth.uid() = id)`.
   * The insert was rejected, the account was created without its professional
   * record, and the vet had no way to ever be verified. The table sat empty.
   *
   * This function is SECURITY DEFINER, so it runs with the definer's rights
   * and needs no session at all.
   *
   * verified stays false. An administrator checks the registration number
   * against the register before granting it — a fake vet answer is worse than
   * no answer.
   */
  if new.raw_user_meta_data->>'role' = 'vet' then
    insert into public.vet_profiles (id, full_name, practice_name, registration_no, verified)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'display_name', 'Veterinary professional'),
      nullif(new.raw_user_meta_data->>'practice_name', ''),
      nullif(new.raw_user_meta_data->>'registration_no', ''),
      false
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PETS
--    A pet profile belongs to exactly one owner. Row-level security means a
--    user can only ever see their own animals — this is enforced by the
--    database, not by the app, so it holds even if the front end has a bug.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pets (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid references auth.users(id) on delete cascade,
  name       text not null,
  species    text not null default 'dog'
             check (species in ('dog','cat','bird','rabbit','fish','reptile','small','other','invert')),
  breed      text,
  age        text,               -- free text: owners rarely know an exact date
  weight     numeric check (weight is null or weight > 0),
  sex        text default 'male' check (sex in ('male','female','unknown')),
  photo_url  text,
  created_at timestamptz default now()
);

-- Speeds up the dashboard query, which always filters by owner and sorts by date.
create index if not exists pets_owner_created_idx on pets (owner_id, created_at desc);

alter table pets enable row level security;

drop policy if exists "owner reads pets" on pets;
create policy "owner reads pets"
  on pets for select using (auth.uid() = owner_id);

drop policy if exists "owner inserts pets" on pets;
create policy "owner inserts pets"
  on pets for insert with check (auth.uid() = owner_id);

drop policy if exists "owner updates pets" on pets;
create policy "owner updates pets"
  on pets for update using (auth.uid() = owner_id);

drop policy if exists "owner deletes pets" on pets;
create policy "owner deletes pets"
  on pets for delete using (auth.uid() = owner_id);

-- Sanity limits the form also enforces. NOT VALID applies them to every new
-- or edited row without failing on rows written before they existed.
do $$ begin
  alter table pets add constraint pets_name_length
    check (char_length(btrim(name)) between 1 and 40) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table pets add constraint pets_weight_max
    check (weight is null or weight <= 200) not valid;
exception when duplicate_object then null; end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. HEALTH RECORDS  ·  reminders and a weight log, per pet
--     The dashboard used to show a weight chart and an "Upcoming" list that were
--     hard-coded for an example dog, to every user. These two tables are where
--     those numbers now come from. Both belong to the pet's owner alone.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists pet_reminders (
  id         uuid primary key default gen_random_uuid(),
  pet_id     uuid not null references pets(id) on delete cascade,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'other'
             check (kind in ('vaccine','vet_visit','medication','deworming','grooming','other')),
  title      text not null check (char_length(btrim(title)) between 2 and 80),
  due_on     date not null,
  done       boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists pet_reminders_owner_due_idx on pet_reminders (owner_id, done, due_on);

alter table pet_reminders enable row level security;

-- The pet must belong to the same owner, or a user could hang a reminder off
-- somebody else's pet id.
drop policy if exists "owner reads reminders" on pet_reminders;
create policy "owner reads reminders" on pet_reminders for select using (auth.uid() = owner_id);

drop policy if exists "owner writes reminders" on pet_reminders;
create policy "owner writes reminders" on pet_reminders for insert
  with check (auth.uid() = owner_id
    and exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

drop policy if exists "owner updates reminders" on pet_reminders;
create policy "owner updates reminders" on pet_reminders for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id
    and exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

drop policy if exists "owner deletes reminders" on pet_reminders;
create policy "owner deletes reminders" on pet_reminders for delete using (auth.uid() = owner_id);


create table if not exists pet_weights (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references pets(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  weight_kg   numeric not null check (weight_kg > 0 and weight_kg <= 200),
  measured_on date not null default current_date check (measured_on <= current_date + 1),
  created_at  timestamptz default now()
);

create index if not exists pet_weights_pet_idx on pet_weights (pet_id, measured_on);

alter table pet_weights enable row level security;

drop policy if exists "owner reads weights" on pet_weights;
create policy "owner reads weights" on pet_weights for select using (auth.uid() = owner_id);

drop policy if exists "owner writes weights" on pet_weights;
create policy "owner writes weights" on pet_weights for insert
  with check (auth.uid() = owner_id
    and exists (select 1 from pets p where p.id = pet_id and p.owner_id = auth.uid()));

drop policy if exists "owner deletes weights" on pet_weights;
create policy "owner deletes weights" on pet_weights for delete using (auth.uid() = owner_id);


-- pets.weight is the CURRENT weight and must always equal the latest entry in
-- the log. Keeping that in the database means no screen can update one and
-- forget the other.
create or replace function sync_pet_weight()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.pet_id, old.pet_id);
  latest numeric;
begin
  select w.weight_kg into latest
    from pet_weights w
   where w.pet_id = target
   order by w.measured_on desc, w.created_at desc
   limit 1;
  -- If the last entry was deleted, keep whatever weight the profile had.
  if latest is not null then
    update pets set weight = latest where id = target;
  end if;
  return null;
end;
$$;

drop trigger if exists pet_weights_sync on pet_weights;
create trigger pet_weights_sync
  after insert or delete on pet_weights
  for each row execute procedure sync_pet_weight();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COMMUNITY WALL
--    Anonymous posts. The table is still called "confessions" because that is
--    the name the deployed app queries; renaming it would need a matching code
--    change and a data migration, so it is left alone deliberately.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists confessions (
  id         uuid primary key default gen_random_uuid(),
  text       text not null check (char_length(text) between 10 and 280),
  mood       text not null default 'happy' check (mood in ('happy','proud','help','sad')),
  hearts     int  not null default 0 check (hearts >= 0),
  created_at timestamptz default now()
);

create index if not exists confessions_created_idx on confessions (created_at desc);

alter table confessions enable row level security;

-- The wall is public and anonymous by design: anyone may read and post.
drop policy if exists "read confessions" on confessions;
create policy "read confessions"
  on confessions for select using (true);

-- Every new post starts at zero hearts. Without the check, a crafted request
-- could publish a post that claims thousands of hearts it never received.
drop policy if exists "insert confessions" on confessions;
create policy "insert confessions"
  on confessions for insert with check (hearts = 0);

-- Moderation. There was no delete policy at all, so the admin screen's remove
-- button was silently refused by the database while the screen said "Post
-- removed" — and the post was back on the next refresh.
drop policy if exists "admin deletes confessions" on confessions;
create policy "admin deletes confessions"
  on confessions for delete using (is_admin());


-- Hearts are incremented through this function rather than a direct UPDATE.
-- Two reasons: an UPDATE policy would let anyone rewrite the post text, and
-- "hearts = hearts + 1" inside the database is atomic, so two people liking at
-- the same moment can't overwrite each other's count.
create or replace function increment_hearts(cid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update confessions set hearts = hearts + 1 where id = cid;
$$;

grant execute on function increment_hearts(uuid) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VETERINARY PROFESSIONALS  ·  second user type
--    PetPal has two kinds of account. A pet owner uses the tools; a verified
--    veterinary professional can additionally answer questions on Ask a Vet.
--    The distinction lives in profiles.role, and the extra professional detail
--    lives here so an owner's row stays lean.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists vet_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null,
  practice_name  text,
  city           text,
  country        text default 'South Africa',
  -- Registration body number. Verification is manual: an administrator checks
  -- the number against the register before setting verified = true. Nothing is
  -- auto-trusted, because a fake 'vet' answer is worse than no answer.
  registration_no text,
  specialities   text,
  bio            text,
  verified       boolean not null default false,
  created_at     timestamptz default now()
);

alter table vet_profiles enable row level security;

-- Anyone may read a vet's public professional details (they appear beside
-- their answers); only the vet may create or edit their own.
drop policy if exists "read vet profiles" on vet_profiles;
create policy "read vet profiles" on vet_profiles for select using (true);

-- verified = false is essential. Without it any signed-in user could insert
-- their own row with verified = true and answer questions under a "Verified
-- vet" badge — the exact thing the verification step exists to prevent.
drop policy if exists "vet inserts own profile" on vet_profiles;
create policy "vet inserts own profile" on vet_profiles for insert
  with check (auth.uid() = id and verified = false);

drop policy if exists "vet updates own profile" on vet_profiles;
create policy "vet updates own profile" on vet_profiles for update using (auth.uid() = id);

-- An administrator is the only other party who may touch a vet's row, and the
-- only reason is to grant or revoke `verified`. Without this policy the admin
-- screen cannot verify anybody and the only way through was to run SQL by
-- hand, which is not a workable handover.
drop policy if exists "admin verifies vets" on vet_profiles;
create policy "admin verifies vets" on vet_profiles for update
  using (is_admin());


-- Whether this professional is currently taking questions. A vet who is on
-- leave or at capacity can step out of the queue without deleting anything,
-- and owners see who is actually available rather than a list that includes
-- people who will not answer.
alter table vet_profiles add column if not exists accepting boolean not null default true;


/*
 * A vet may edit their own professional details, but never their own
 * verification, and never the registration number that verification was
 * checked against — otherwise a vet could be verified under one number and
 * then swap it. Only an administrator may change either.
 *
 * auth.uid() is null when this runs from the SQL Editor or the service role,
 * which are already trusted, so those are let through.
 */
create or replace function guard_vet_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.verified is distinct from old.verified then
      raise exception 'Only an administrator can change verification.';
    end if;
    if new.registration_no is distinct from old.registration_no then
      raise exception 'Only an administrator can change a registration number.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists vet_profiles_guard on vet_profiles;
create trigger vet_profiles_guard
  before update on vet_profiles
  for each row execute procedure guard_vet_profile();

-- Two accounts claiming the same registration number are deliberately NOT
-- blocked here. A unique index would make the sign-up trigger fail, and
-- Supabase would show the second person only "Database error saving new
-- user". Instead the admin console flags a shared number beside both
-- accounts, so an administrator sees it before verifying either.
drop index if exists vet_profiles_registration_unique;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4b. SAVED REPLIES  ·  a professional's own tool
--     A vet answering the same question for the twentieth time should not type
--     it for the twentieth time. These belong to the vet alone: nobody else can
--     read them, because a half-written draft is not something an owner should
--     ever see.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists vet_replies (
  id         uuid primary key default gen_random_uuid(),
  vet_id     uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 80),
  body       text not null check (char_length(body) between 20 and 2000),
  -- How many times it has been used. Lets the console put the ones that
  -- actually earn their place at the top.
  uses       int not null default 0 check (uses >= 0),
  created_at timestamptz default now()
);

create index if not exists vet_replies_owner_idx on vet_replies (vet_id, created_at desc);

alter table vet_replies enable row level security;

drop policy if exists "vet reads own replies" on vet_replies;
create policy "vet reads own replies" on vet_replies for select using (auth.uid() = vet_id);

drop policy if exists "vet writes own replies" on vet_replies;
create policy "vet writes own replies" on vet_replies for insert with check (auth.uid() = vet_id);

drop policy if exists "vet updates own replies" on vet_replies;
create policy "vet updates own replies" on vet_replies for update using (auth.uid() = vet_id);

drop policy if exists "vet deletes own replies" on vet_replies;
create policy "vet deletes own replies" on vet_replies for delete using (auth.uid() = vet_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ASK A VET  ·  the two-sided feature
--    Owners post a question; verified vets answer it. Questions are public so
--    the archive is useful to everyone, which is the whole point — most owners
--    have a question someone has already asked.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists questions (
  id          uuid primary key default gen_random_uuid(),
  asker_id    uuid references auth.users(id) on delete set null,
  title       text not null check (char_length(title) between 10 and 140),
  body        text not null check (char_length(body) between 20 and 1200),
  species     text not null default 'dog'
              check (species in ('dog','cat','bird','rabbit','fish','reptile','small','other')),
  -- Set true by the author when the question is no longer urgent.
  resolved    boolean not null default false,
  answer_count int not null default 0 check (answer_count >= 0),
  created_at  timestamptz default now()
);

create index if not exists questions_created_idx on questions (created_at desc);

alter table questions enable row level security;

drop policy if exists "read questions" on questions;
create policy "read questions" on questions for select using (true);

-- A new question starts unanswered and open; the count is the trigger's job.
drop policy if exists "signed in asks" on questions;
create policy "signed in asks" on questions for insert
  with check (auth.uid() is not null and auth.uid() = asker_id
              and answer_count = 0 and resolved = false);

drop policy if exists "author updates question" on questions;
create policy "author updates question" on questions for update using (auth.uid() = asker_id);

-- The author may mark their question resolved — nothing else. Without this an
-- author could rewrite answer_count, or reword a question a vet already
-- answered so the answer no longer matches it.
revoke update on questions from anon, authenticated;
grant update (resolved) on questions to authenticated;


create table if not exists answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  vet_id      uuid references auth.users(id) on delete set null,
  body        text not null check (char_length(body) between 20 and 2000),
  created_at  timestamptz default now()
);

create index if not exists answers_question_idx on answers (question_id, created_at);

alter table answers enable row level security;

drop policy if exists "read answers" on answers;
create policy "read answers" on answers for select using (true);

-- Only a VERIFIED vet may answer. This is enforced in the database, not the
-- app, so a crafted request cannot post clinical advice under a vet badge.
drop policy if exists "verified vets answer" on answers;
create policy "verified vets answer" on answers for insert
  with check (
    auth.uid() = vet_id
    and exists (
      select 1 from vet_profiles v
      where v.id = auth.uid() and v.verified = true
    )
  );

drop policy if exists "vet edits own answer" on answers;
create policy "vet edits own answer" on answers for update using (auth.uid() = vet_id);

-- Editing means the wording. Moving an answer to a different question would
-- leave both questions' answer_count wrong.
revoke update on answers from anon, authenticated;
grant update (body) on answers to authenticated;


-- Keep questions.answer_count in step without a round trip from the client.
create or replace function bump_answer_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update questions set answer_count = answer_count + 1 where id = new.question_id;
  elsif tg_op = 'DELETE' then
    update questions set answer_count = greatest(0, answer_count - 1) where id = old.question_id;
  end if;
  return null;
end;
$$;

drop trigger if exists answers_count_trigger on answers;
create trigger answers_count_trigger
  after insert or delete on answers
  for each row execute procedure bump_answer_count();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5b. DELETING YOUR OWN ACCOUNT
--     Settings offers "Delete account". The browser cannot remove an auth user
--     itself, so this function does it for the caller and nobody else. Every
--     table keyed to the user cascades (profile, pets, health records, vet
--     profile, saved replies); questions and answers stay in the public archive
--     with the author detached, which their foreign keys already specify.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. STARTER CONTENT
--    A few posts so the community wall is not empty on a fresh install.
--    Delete this block if you would rather start with nothing.
-- ─────────────────────────────────────────────────────────────────────────────
insert into confessions (text, mood, hearts)
select * from (values
  ('Biscuit finally learned to sit AND stay today. Three weeks of patience and so many treats. Proud dog dad moment!', 'proud', 248),
  ('Used the food checker before giving Luna a bit of my dinner — turns out onions are toxic to cats. Probably saved her a vet trip.', 'happy', 519),
  ('Adopted a senior rescue beagle this weekend. He sleeps 18 hours a day and I have never been happier.', 'happy', 871),
  ('Any tips for a puppy that cries at night? Week two and I am running on no sleep but I love the little guy.', 'help', 333)
) as seed(text, mood, hearts)
where not exists (select 1 from confessions);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. OPTIONAL — make yourself an admin
--    The admin console at /admin checks for role = 'admin'. Sign up through the
--    app first, then uncomment the line below, put your email in, and run it.
-- ─────────────────────────────────────────────────────────────────────────────
-- update profiles set role = 'admin' where email = 'you@example.com';


-- ════════════════════════════════════════════════════════════════════════════
--  Done. Open /setup in the running app to confirm every check passes.
-- ════════════════════════════════════════════════════════════════════════════
