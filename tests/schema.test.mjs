/**
 * Database security tests.
 *
 * Runs supabase/schema.sql in a real PostgreSQL (PGlite — Postgres compiled to
 * WebAssembly, no install needed) inside a Supabase-like shell: an auth.users
 * table, auth.uid(), and the anon / authenticated roles with Supabase's
 * default grants. It runs the schema twice to prove it is re-runnable, then
 * acts as different users — owner, other owner, vet, admin, anonymous — and
 * checks every rule, including the attacks the policies exist to stop.
 *
 *   npm test        (or: node tests/schema.test.mjs)
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const schema = readFileSync(process.argv[2] ?? new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const db = new PGlite()

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase's defaults: the API roles get full table privileges, RLS decides.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`)

await db.exec(schema)
await db.exec(schema) // must be safe to re-run
console.log('schema ran twice without error')

let pass = 0, fail = 0
function ok(cond, name, extra = '') {
  if (cond) { pass++; console.log('  PASS', name) }
  else { fail++; console.log('  FAIL', name, extra) }
}

async function as(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  await db.exec(uid ? 'set role authenticated' : 'set role anon')
  try {
    const r = await db.query(sql, params)
    return { rows: r.rows, affected: r.affectedRows ?? 0 }
  } catch (e) {
    return { error: e.message }
  } finally {
    await db.exec('reset role')
  }
}
const su = (sql, p = []) => db.query(sql, p)

async function signup(email, meta) {
  const r = await su(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, JSON.stringify(meta)])
  return r.rows[0].id
}

const A = await signup('owner@test.dev', { display_name: 'Owner A' })
const B = await signup('other@test.dev', { display_name: 'Owner B' })
const V = await signup('vet@test.dev', { display_name: 'Dr Vet', role: 'vet', registration_no: 'V123' })
const M = await signup('admin@test.dev', { display_name: 'Admin' })
await su(`update profiles set role = 'admin' where id = $1`, [M])

console.log('\nsign-up trigger')
ok((await su(`select role from profiles where id=$1`, [V])).rows[0].role === 'vet', 'vet sign-up gets role vet')
ok((await su(`select verified from vet_profiles where id=$1`, [V])).rows[0].verified === false, 'vet starts unverified')
ok((await su(`select role from profiles where id=$1`, [A])).rows[0].role === 'user', 'owner gets role user')
const sneaky = await signup('sneaky@test.dev', { role: 'admin' })
ok((await su(`select role from profiles where id=$1`, [sneaky])).rows[0].role === 'user', 'role:admin in sign-up metadata is ignored')

console.log('\nprivilege escalation')
let r = await as(A, `update profiles set role = 'admin' where id = auth.uid()`)
ok(!!r.error, 'user cannot make themselves admin', JSON.stringify(r))
r = await as(A, `update profiles set display_name = 'New name' where id = auth.uid()`)
ok(!r.error && r.affected === 1, 'user can change own display name', JSON.stringify(r))
r = await as(A, `insert into vet_profiles (id, full_name, verified) values (auth.uid(), 'Fake Vet', true)`)
ok(!!r.error, 'user cannot insert a pre-verified vet profile', JSON.stringify(r))
r = await as(V, `update vet_profiles set verified = true where id = auth.uid()`)
ok(!!r.error, 'vet cannot verify themselves', JSON.stringify(r))
r = await as(V, `update vet_profiles set registration_no = 'OTHER' where id = auth.uid()`)
ok(!!r.error, 'vet cannot change own registration number', JSON.stringify(r))
r = await as(V, `update vet_profiles set bio = 'Small animals', accepting = false where id = auth.uid()`)
ok(!r.error && r.affected === 1, 'vet can edit own bio and availability', JSON.stringify(r))
r = await as(A, `update vet_profiles set verified = true where id = $1`, [V])
ok(!r.error && r.affected === 0, 'owner cannot verify someone else (0 rows)', JSON.stringify(r))
r = await as(M, `update vet_profiles set verified = true where id = $1`, [V])
ok(!r.error && r.affected === 1, 'admin can verify a vet', JSON.stringify(r))

console.log('\nduplicate registration numbers')
const V2 = await signup('vet2@test.dev', { role: 'vet', registration_no: 'V123' })
ok((await su(`select verified from vet_profiles where id=$1`, [V2])).rows[0]?.verified === false,
   'a shared registration number does not break sign-up (admin console flags it)')

console.log('\nAsk a Vet')
r = await as(A, `insert into questions (asker_id, title, body, species, answer_count) values (auth.uid(), 'Is this a fake count?', 'Trying to start with five answers already.', 'dog', 5)`)
ok(!!r.error, 'question cannot start with a fake answer_count', JSON.stringify(r))
r = await as(A, `insert into questions (asker_id, title, body, species) values (auth.uid(), 'Why does my dog itch?', 'Scratching for two weeks, no fleas found.', 'dog') returning id`)
ok(!r.error, 'owner can ask a question', JSON.stringify(r))
const Q = r.rows?.[0]?.id
r = await as(A, `update questions set answer_count = 10 where id = $1`, [Q])
ok(!!r.error, 'author cannot rewrite answer_count', JSON.stringify(r))
r = await as(A, `update questions set title = 'Something else entirely' where id = $1`, [Q])
ok(!!r.error, 'author cannot reword an existing question', JSON.stringify(r))
r = await as(A, `update questions set resolved = true where id = $1`, [Q])
ok(!r.error && r.affected === 1, 'author can mark resolved', JSON.stringify(r))
r = await as(B, `insert into answers (question_id, vet_id, body) values ($1, auth.uid(), 'I am not a vet but here is advice anyway')`, [Q])
ok(!!r.error, 'non-vet cannot answer', JSON.stringify(r))
r = await as(V, `insert into answers (question_id, vet_id, body) values ($1, auth.uid(), 'Likely allergy — try a diet trial and see your vet.') returning id`, [Q])
ok(!r.error, 'verified vet can answer', JSON.stringify(r))
const ANS = r.rows?.[0]?.id
ok((await su(`select answer_count from questions where id=$1`, [Q])).rows[0].answer_count === 1, 'answer_count trigger increments')
const Q2 = (await su(`insert into questions (asker_id, title, body) values ($1, 'Another question here', 'Some more detail for the second one.') returning id`, [B])).rows[0].id
r = await as(V, `update answers set question_id = $1 where id = $2`, [Q2, ANS])
ok(!!r.error, 'vet cannot move an answer to another question', JSON.stringify(r))
r = await as(V, `update answers set body = 'Edited: likely allergy, see your vet for a skin check.' where id = $1`, [ANS])
ok(!r.error && r.affected === 1, 'vet can edit own answer wording', JSON.stringify(r))

console.log('\ncommunity wall')
r = await as(null, `insert into confessions (text, mood, hearts) values ('Totally organic post here', 'happy', 9999)`)
ok(!!r.error, 'post cannot start with fake hearts', JSON.stringify(r))
r = await as(null, `insert into confessions (text, mood) values ('A normal anonymous post', 'happy') returning id`)
ok(!r.error, 'anonymous post works', JSON.stringify(r))
const P = r.rows?.[0]?.id
r = await as(null, `select increment_hearts($1)`, [P])
ok(!r.error && (await su(`select hearts from confessions where id=$1`, [P])).rows[0].hearts === 1, 'increment_hearts works for anon')
r = await as(A, `delete from confessions where id = $1`, [P])
ok(!r.error && r.affected === 0, 'normal user cannot delete posts', JSON.stringify(r))
r = await as(M, `delete from confessions where id = $1`, [P])
ok(!r.error && r.affected === 1, 'admin can delete a post', JSON.stringify(r))

console.log('\npets and health records')
r = await as(A, `insert into pets (owner_id, name, species, weight) values (auth.uid(), '   ', 'dog', 10)`)
ok(!!r.error, 'blank pet name rejected', JSON.stringify(r))
r = await as(A, `insert into pets (owner_id, name, species, weight) values (auth.uid(), 'Biscuit', 'dog', 500)`)
ok(!!r.error, '500 kg pet rejected', JSON.stringify(r))
r = await as(A, `insert into pets (owner_id, name, species, weight) values (auth.uid(), 'Biscuit', 'dog', 12) returning id`)
ok(!r.error, 'owner can add a pet', JSON.stringify(r))
const PET = r.rows?.[0]?.id
r = await as(A, `update pets set owner_id = $1 where id = $2`, [B, PET])
ok(!!r.error, 'owner cannot hand a pet to another account', JSON.stringify(r))
r = await as(B, `update pets set name = 'Stolen' where id = $1`, [PET])
ok(!r.error && r.affected === 0, 'another user cannot edit the pet (0 rows)', JSON.stringify(r))
r = await as(B, `select * from pets where id = $1`, [PET])
ok(!r.error && r.rows.length === 0, 'another user cannot see the pet')
r = await as(B, `insert into pet_reminders (pet_id, owner_id, title, due_on) values ($1, auth.uid(), 'Hijack', current_date)`, [PET])
ok(!!r.error, 'another user cannot add a reminder to it', JSON.stringify(r))
r = await as(B, `insert into pet_weights (pet_id, owner_id, weight_kg) values ($1, auth.uid(), 3)`, [PET])
ok(!!r.error, 'another user cannot log its weight', JSON.stringify(r))
r = await as(A, `insert into pet_reminders (pet_id, owner_id, kind, title, due_on) values ($1, auth.uid(), 'vaccine', 'Rabies booster', current_date + 30) returning id`, [PET])
ok(!r.error, 'owner can add a reminder', JSON.stringify(r))
r = await as(A, `insert into pet_weights (pet_id, owner_id, weight_kg, measured_on) values ($1, auth.uid(), 12.5, current_date - 10)`, [PET])
r = await as(A, `insert into pet_weights (pet_id, owner_id, weight_kg, measured_on) values ($1, auth.uid(), 12.1, current_date) returning id`, [PET])
const W = r.rows?.[0]?.id
ok(Number((await su(`select weight from pets where id=$1`, [PET])).rows[0].weight) === 12.1, 'pets.weight follows the latest weigh-in')
r = await as(A, `insert into pet_weights (pet_id, owner_id, weight_kg, measured_on) values ($1, auth.uid(), 20, current_date - 30)`, [PET])
ok(Number((await su(`select weight from pets where id=$1`, [PET])).rows[0].weight) === 12.1, 'back-dated weigh-in does not override the latest')
await as(A, `delete from pet_weights where id = $1`, [W])
ok(Number((await su(`select weight from pets where id=$1`, [PET])).rows[0].weight) === 12.5, 'deleting latest weigh-in falls back to the previous one')
r = await as(A, `insert into pet_weights (pet_id, owner_id, weight_kg, measured_on) values ($1, auth.uid(), 12, current_date + 30)`, [PET])
ok(!!r.error, 'weigh-in cannot be dated in the future', JSON.stringify(r))

console.log('\ndelete my account')
r = await as(null, `select delete_my_account()`)
ok(!!r.error, 'anon cannot call delete_my_account', JSON.stringify(r))
r = await as(A, `select delete_my_account()`)
ok(!r.error, 'user can delete their own account', JSON.stringify(r))
ok((await su(`select count(*)::int n from auth.users where id=$1`, [A])).rows[0].n === 0, 'auth user removed')
ok((await su(`select count(*)::int n from pets where owner_id=$1`, [A])).rows[0].n === 0, 'their pets removed')
ok((await su(`select count(*)::int n from pet_weights where owner_id=$1`, [A])).rows[0].n === 0, 'their weigh-ins removed')
ok((await su(`select asker_id from questions where id=$1`, [Q])).rows[0].asker_id === null, 'their question stays, detached')
ok((await su(`select count(*)::int n from auth.users`)).rows[0].n === 5, 'nobody else was deleted')

console.log('\nexisting data from older builds')
r = await su(`insert into pets (owner_id, name, species) values ($1, 'Old Snail', 'invert') returning id`, [B])
ok(r.rows.length === 1, "legacy 'invert' species rows still accepted")

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
