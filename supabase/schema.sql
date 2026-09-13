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
--  report_upvotes). Everything PetPal actually uses is below: three tables and
--  one function.
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
  role         text default 'user' check (role in ('user', 'admin')),
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
-- 4. STARTER CONTENT
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
-- 5. OPTIONAL — make yourself an admin
--    The admin console at /admin checks for role = 'admin'. Sign up through the
--    app first, then uncomment the line below, put your email in, and run it.
-- ─────────────────────────────────────────────────────────────────────────────
-- update profiles set role = 'admin' where email = 'you@example.com';


-- ════════════════════════════════════════════════════════════════════════════
--  Done. Open /setup in the running app to confirm every check passes.
-- ════════════════════════════════════════════════════════════════════════════
