-- ════════════════════════════════════════════════════════════════
--  PetPal — Pets table. Run once in Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  species text not null default 'dog',
  breed text,
  age text,
  weight numeric,
  sex text default 'male',
  photo_url text,
  created_at timestamptz default now()
);

alter table pets enable row level security;

drop policy if exists "owner reads pets" on pets;
create policy "owner reads pets" on pets for select using (auth.uid() = owner_id);

drop policy if exists "owner inserts pets" on pets;
create policy "owner inserts pets" on pets for insert with check (auth.uid() = owner_id or owner_id is null);

drop policy if exists "owner updates pets" on pets;
create policy "owner updates pets" on pets for update using (auth.uid() = owner_id);

drop policy if exists "owner deletes pets" on pets;
create policy "owner deletes pets" on pets for delete using (auth.uid() = owner_id);
