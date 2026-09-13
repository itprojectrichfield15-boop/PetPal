-- ════════════════════════════════════════════════════════════════
--  PetPal — REPAIR the Community Wall
--  Run this ONCE if you already ran the old 004 migration (which seeded
--  workplace text and a mood constraint that blocks pet posts).
-- ════════════════════════════════════════════════════════════════

-- 1. Drop the old constraint FIRST so we can clean up freely
alter table confessions drop constraint if exists confessions_mood_check;

-- 2. Remove the old workplace seed rows (do this BEFORE adding the new constraint)
delete from confessions
where mood in ('angry','numb','hopeful','drained')
   or text ilike '%manager%'
   or text ilike '%overtime%'
   or text ilike '%notice%'
   or text ilike '%stand-up%';

-- 3. Map any remaining stray moods to a valid pet mood, then add the new constraint
update confessions set mood = 'happy' where mood not in ('happy','proud','help','sad');
alter table confessions alter column mood set default 'happy';
alter table confessions add constraint confessions_mood_check
  check (mood in ('happy','proud','help','sad'));

-- 4. Seed friendly pet posts (only if the wall is now empty)
insert into confessions (text, mood, hearts)
select * from (values
  ('Biscuit finally learned to sit AND stay today. Three weeks of patience and so many treats. Proud dog dad moment!', 'proud', 248),
  ('Used the food checker before giving Luna a bit of my dinner — turns out onions are toxic to cats! Probably saved her a vet trip.', 'happy', 519),
  ('Adopted a senior rescue beagle this weekend. He sleeps 18 hours a day and I have never been happier.', 'happy', 871),
  ('Any tips for a puppy that cries at night? Week two and I am running on no sleep but I love the little guy.', 'help', 333),
  ('The nutrition planner said I was overfeeding by almost double. Two months later my cat is at a healthy weight and so playful again.', 'proud', 402)
) as v(text, mood, hearts)
where not exists (select 1 from confessions);

-- Verify
select mood, count(*) from confessions group by mood;
