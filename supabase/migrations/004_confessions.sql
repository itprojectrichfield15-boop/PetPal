-- ════════════════════════════════════════════════════════════════
--  PetPal — Community Wall (anonymous pet posts)
--  Run this once in your Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

create table if not exists confessions (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 10 and 280),
  mood text not null default 'happy' check (mood in ('happy','proud','help','sad')),
  hearts int default 0,
  created_at timestamptz default now()
);

alter table confessions enable row level security;

-- Anyone can read the wall
drop policy if exists "read confessions" on confessions;
create policy "read confessions" on confessions for select using (true);

-- Anyone can post (anonymous)
drop policy if exists "insert confessions" on confessions;
create policy "insert confessions" on confessions for insert with check (true);

-- Anyone can increment hearts
drop policy if exists "update confessions" on confessions;
create policy "update confessions" on confessions for update using (true) with check (true);

-- Atomic heart increment
create or replace function increment_hearts(cid uuid)
returns void language sql as $$
  update confessions set hearts = hearts + 1 where id = cid;
$$;

-- Seed a few so the wall is never empty
insert into confessions (text, mood, hearts) values
  ('Biscuit finally learned to sit AND stay today. Three weeks of patience and so many treats. Proud dog dad moment!', 'proud', 248),
  ('Used the food checker before giving Luna a bit of my dinner — turns out onions are toxic to cats! Probably saved her a vet trip.', 'happy', 519),
  ('Adopted a senior rescue beagle this weekend. He sleeps 18 hours a day and I have never been happier.', 'happy', 871),
  ('Any tips for a puppy that cries at night? Week two and I am running on no sleep but I love the little guy.', 'help', 333)
on conflict do nothing;

-- Allow public read of ALL reports for the public feed (demo-friendly)
drop policy if exists "read reports" on toxicity_reports;
create policy "read reports" on toxicity_reports for select using (true);
