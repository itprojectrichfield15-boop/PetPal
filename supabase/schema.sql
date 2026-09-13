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
--  report_upvotes). Everything PetPal actually uses is below: six tables,
--  two functions and two triggers.
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
  with check (auth.uid() = id);


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
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', 'Pet Parent')
  )
  on conflict (id) do nothing;
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

drop policy if exists "insert confessions" on confessions;
create policy "insert confessions"
  on confessions for insert with check (true);


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

drop policy if exists "vet inserts own profile" on vet_profiles;
create policy "vet inserts own profile" on vet_profiles for insert with check (auth.uid() = id);

drop policy if exists "vet updates own profile" on vet_profiles;
create policy "vet updates own profile" on vet_profiles for update using (auth.uid() = id);


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

drop policy if exists "signed in asks" on questions;
create policy "signed in asks" on questions for insert
  with check (auth.uid() is not null and auth.uid() = asker_id);

drop policy if exists "author updates question" on questions;
create policy "author updates question" on questions for update using (auth.uid() = asker_id);


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


-- Keep questions.answer_count in step without a round trip from the client.
create or replace function bump_answer_count()
returns trigger language plpgsql security definer set search_path = public as $
begin
  if tg_op = 'INSERT' then
    update questions set answer_count = answer_count + 1 where id = new.question_id;
  elsif tg_op = 'DELETE' then
    update questions set answer_count = greatest(0, answer_count - 1) where id = old.question_id;
  end if;
  return null;
end;
$;

drop trigger if exists answers_count_trigger on answers;
create trigger answers_count_trigger
  after insert or delete on answers
  for each row execute procedure bump_answer_count();


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
