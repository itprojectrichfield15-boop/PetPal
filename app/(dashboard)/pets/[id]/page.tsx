'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft, Bell, Check, Circle, Loader2, Pencil, Plus, Scale, Trash2, Apple, AlertCircle, X,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import {
  SPECIES_LABELS, REMINDER_KINDS, toSpecies,
  type Pet, type PetReminder, type PetWeight, type PetSex, type PetSpecies, type ReminderKind,
} from '@/lib/types'
import { speciesIcon } from '@/components/PetIcon'
import {
  validatePet, validateWeight, todayISO, describeDue, daysUntil, formatDay, plannerHref,
} from '@/lib/health'

/**
 * One pet: its details, its weight log and its reminders.
 *
 * Before this page existed a pet could be created but never corrected or
 * removed, and the "weight trend" and "upcoming" panels on the dashboard were
 * hard-coded for an example dog. This is where those records are now kept.
 */

type Load =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' }

const SEXES: { key: PetSex; label: string }[] = [
  { key: 'male', label: 'Male' }, { key: 'female', label: 'Female' }, { key: 'unknown', label: 'Not sure' },
]

const field = 'bg-[#130F1C] border-white/10 focus:border-primary/40'
const label = 'text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2'

async function db() {
  const { tryCreateClient } = await import('@/lib/supabase/client')
  const supabase = tryCreateClient()
  if (!supabase) throw new Error('The database isn’t connected.')
  return supabase
}

export default function PetDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [load, setLoad] = useState<Load>({ kind: 'loading' })
  const [pet, setPet] = useState<Pet | null>(null)
  const [weights, setWeights] = useState<PetWeight[]>([])
  const [reminders, setReminders] = useState<PetReminder[]>([])

  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState({ name: '', species: 'dog' as PetSpecies, breed: '', age: '', sex: 'unknown' as PetSex })
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [newWeight, setNewWeight] = useState({ kg: '', on: todayISO() })
  const [savingWeight, setSavingWeight] = useState(false)

  const [newReminder, setNewReminder] = useState({ kind: 'vaccine' as ReminderKind, title: '', on: '' })
  const [savingReminder, setSavingReminder] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      // A malformed id would otherwise surface as a raw Postgres "invalid
      // input syntax for type uuid" error instead of a plain "not found".
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        setLoad({ kind: 'missing' })
        return
      }
      try {
        const supabase = await db()
        const [p, w, r] = await Promise.all([
          supabase.from('pets').select('*').eq('id', id).maybeSingle(),
          supabase.from('pet_weights').select('*').eq('pet_id', id)
            .order('measured_on', { ascending: true }).order('created_at', { ascending: true }),
          supabase.from('pet_reminders').select('*').eq('pet_id', id).order('due_on', { ascending: true }),
        ])
        if (!active) return
        if (p.error) { setLoad({ kind: 'error', message: p.error.message }); return }
        // Row-level security returns nothing for someone else's pet, so "not
        // yours" and "does not exist" look the same — deliberately.
        if (!p.data) { setLoad({ kind: 'missing' }); return }
        setPet(p.data as Pet)
        setWeights((w.data ?? []) as PetWeight[])
        setReminders((r.data ?? []) as PetReminder[])
        setLoad({ kind: 'ready' })
      } catch (e) {
        if (active) setLoad({ kind: 'error', message: e instanceof Error ? e.message : 'Please try again.' })
      }
    })()
    return () => { active = false }
  }, [id])

  const species = pet ? toSpecies(pet.species) : 'other'
  const Icon = speciesIcon(pet?.species ?? 'other')
  const planner = pet ? plannerHref(species, pet.weight) : null

  const chart = useMemo(
    () => weights.map(w => ({ day: formatDay(w.measured_on), kg: Number(w.weight_kg) })),
    [weights],
  )
  const open = reminders.filter(r => !r.done)
  const done = reminders.filter(r => r.done).slice().reverse()

  // ── Details ──────────────────────────────────────────────────────────────
  function startEdit() {
    if (!pet) return
    setEdit({ name: pet.name, species, breed: pet.breed ?? '', age: pet.age ?? '', sex: pet.sex })
    setEditing(true)
  }

  async function saveEdit() {
    if (!pet || savingEdit) return
    const problem = validatePet({ ...edit, weight: '' })
    if (problem) { toast.error(problem); return }
    // A species change must not leave a weight that is impossible for the new
    // species (a 30 kg "cat" after switching from dog).
    if (pet.weight) {
      const wProblem = validateWeight(String(pet.weight), edit.species)
      if (wProblem) { toast.error(`Current weight doesn’t fit a ${SPECIES_LABELS[edit.species].toLowerCase()}`, { description: 'Log a corrected weight first, or check the species.' }); return }
    }
    setSavingEdit(true)
    try {
      const supabase = await db()
      const patch = {
        name: edit.name.trim(), species: edit.species, breed: edit.breed.trim() || null,
        age: edit.age.trim() || null, sex: edit.sex,
      }
      const { data, error } = await supabase.from('pets').update(patch).eq('id', pet.id).select().single()
      if (error || !data) { toast.error('Couldn’t save changes', { description: error?.message }); return }
      setPet(data as Pet)
      setEditing(false)
      toast.success('Details updated')
    } catch (e) {
      toast.error('Couldn’t save changes', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSavingEdit(false)
    }
  }

  async function deletePet() {
    if (!pet || deleting) return
    setDeleting(true)
    try {
      const supabase = await db()
      // .select() makes a refused delete visible: RLS refusals return no error,
      // just zero rows.
      const { data, error } = await supabase.from('pets').delete().eq('id', pet.id).select('id')
      if (error || !data?.length) { toast.error('Couldn’t delete this pet', { description: error?.message }); return }
      toast.success(`${pet.name}’s profile was deleted`)
      router.push('/pets')
    } catch (e) {
      toast.error('Couldn’t delete this pet', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  // ── Weight ───────────────────────────────────────────────────────────────
  async function addWeight() {
    if (!pet || savingWeight) return
    const problem = validateWeight(newWeight.kg, species)
    if (problem) { toast.error(problem); return }
    if (!newWeight.on || newWeight.on > todayISO()) { toast.error('A weigh-in can’t be dated in the future.'); return }
    setSavingWeight(true)
    try {
      const supabase = await db()
      const { data, error } = await supabase.from('pet_weights').insert({
        pet_id: pet.id, owner_id: pet.owner_id, weight_kg: Number(newWeight.kg), measured_on: newWeight.on,
      }).select().single()
      if (error || !data) { toast.error('Couldn’t log that weight', { description: error?.message }); return }
      const next = [...weights, data as PetWeight].sort((a, b) =>
        a.measured_on === b.measured_on ? a.created_at.localeCompare(b.created_at) : a.measured_on.localeCompare(b.measured_on))
      setWeights(next)
      // The database sets pets.weight to the latest entry; mirror it here.
      setPet({ ...pet, weight: Number(next[next.length - 1].weight_kg) })
      setNewWeight({ kg: '', on: todayISO() })
      toast.success('Weight logged')
    } catch (e) {
      toast.error('Couldn’t log that weight', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSavingWeight(false)
    }
  }

  async function deleteWeight(w: PetWeight) {
    if (!pet) return
    try {
      const supabase = await db()
      const { data, error } = await supabase.from('pet_weights').delete().eq('id', w.id).select('id')
      if (error || !data?.length) { toast.error('Couldn’t remove that entry', { description: error?.message }); return }
      const next = weights.filter(x => x.id !== w.id)
      setWeights(next)
      if (next.length) setPet({ ...pet, weight: Number(next[next.length - 1].weight_kg) })
      toast.success('Entry removed')
    } catch (e) {
      toast.error('Couldn’t remove that entry', { description: e instanceof Error ? e.message : undefined })
    }
  }

  // ── Reminders ────────────────────────────────────────────────────────────
  async function addReminder() {
    if (!pet || savingReminder) return
    const title = newReminder.title.trim() || REMINDER_KINDS[newReminder.kind]
    if (title.length < 2 || title.length > 80) { toast.error('Keep the reminder between 2 and 80 characters.'); return }
    if (!newReminder.on) { toast.error('Choose the date it’s due.'); return }
    if (newReminder.on < todayISO()) { toast.error('A reminder needs a date from today onwards.'); return }
    setSavingReminder(true)
    try {
      const supabase = await db()
      const { data, error } = await supabase.from('pet_reminders').insert({
        pet_id: pet.id, owner_id: pet.owner_id, kind: newReminder.kind, title, due_on: newReminder.on,
      }).select().single()
      if (error || !data) { toast.error('Couldn’t add that reminder', { description: error?.message }); return }
      setReminders(r => [...r, data as PetReminder].sort((a, b) => a.due_on.localeCompare(b.due_on)))
      setNewReminder({ kind: newReminder.kind, title: '', on: '' })
      toast.success('Reminder added')
    } catch (e) {
      toast.error('Couldn’t add that reminder', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSavingReminder(false)
    }
  }

  async function toggleReminder(r: PetReminder) {
    setReminders(list => list.map(x => (x.id === r.id ? { ...x, done: !r.done } : x)))
    try {
      const supabase = await db()
      const { data, error } = await supabase.from('pet_reminders').update({ done: !r.done }).eq('id', r.id).select('id')
      if (error || !data?.length) throw new Error(error?.message)
    } catch (e) {
      setReminders(list => list.map(x => (x.id === r.id ? { ...x, done: r.done } : x)))
      toast.error('Couldn’t update that reminder', { description: e instanceof Error ? e.message : undefined })
    }
  }

  async function deleteReminder(r: PetReminder) {
    try {
      const supabase = await db()
      const { data, error } = await supabase.from('pet_reminders').delete().eq('id', r.id).select('id')
      if (error || !data?.length) { toast.error('Couldn’t delete that reminder', { description: error?.message }); return }
      setReminders(list => list.filter(x => x.id !== r.id))
    } catch (e) {
      toast.error('Couldn’t delete that reminder', { description: e instanceof Error ? e.message : undefined })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (load.kind !== 'ready' || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        {load.kind === 'loading' ? (
          <div className="flex items-center gap-3 text-sm text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center max-w-md">
            <AlertCircle className="w-7 h-7 text-[#FF6B81] mx-auto mb-3" />
            <p className="text-sm text-zinc-300">
              {load.kind === 'missing' ? 'This pet doesn’t exist, or isn’t on your account.' : 'Couldn’t load this pet.'}
            </p>
            {load.kind === 'error' && <p className="text-xs text-zinc-500 mt-1">{load.message}</p>}
            <Link href="/pets"><Button className="btn-glass text-white rounded-xl mt-5 gap-2"><ArrowLeft className="w-4 h-4" /> Back to my pets</Button></Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow={SPECIES_LABELS[species]}
        icon={Icon}
        title={pet.name}
        sub={[pet.breed, pet.age, pet.weight ? `${pet.weight} kg` : null].filter(Boolean).join(' · ') || 'No details recorded yet.'}
        action={
          <Link href="/pets"><Button className="btn-glass text-white rounded-xl gap-2"><ArrowLeft className="w-4 h-4" /> My pets</Button></Link>
        }
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto space-y-6">

        {/* ── Details ── */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Details</h2>
            {!editing && (
              <Button onClick={startEdit} className="btn-glass text-white rounded-lg h-8 text-xs gap-1.5"><Pencil className="w-3.5 h-3.5" /> Edit</Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={e => { e.preventDefault(); void saveEdit() }} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="e-name" className={label}>Name</label>
                  <Input id="e-name" value={edit.name} maxLength={40} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} className={field} />
                </div>
                <div>
                  <label htmlFor="e-species" className={label}>Species</label>
                  <select id="e-species" value={edit.species} onChange={e => setEdit(s => ({ ...s, species: e.target.value as PetSpecies }))}
                    className="w-full h-9 px-3 rounded-lg bg-[#130F1C] border border-white/10 text-sm">
                    {(Object.keys(SPECIES_LABELS) as PetSpecies[]).map(s => <option key={s} value={s}>{SPECIES_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="e-breed" className={label}>Breed</label>
                  <Input id="e-breed" value={edit.breed} maxLength={60} onChange={e => setEdit(s => ({ ...s, breed: e.target.value }))} className={field} />
                </div>
                <div>
                  <label htmlFor="e-age" className={label}>Age</label>
                  <Input id="e-age" value={edit.age} maxLength={30} onChange={e => setEdit(s => ({ ...s, age: e.target.value }))} className={field} />
                </div>
              </div>
              <div>
                <span className={label}>Sex</span>
                <div className="flex gap-2">
                  {SEXES.map(s => (
                    <button type="button" key={s.key} onClick={() => setEdit(x => ({ ...x, sex: s.key }))} aria-pressed={edit.sex === s.key}
                      className={`px-3 py-1.5 rounded-lg border text-sm ${edit.sex === s.key ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/[0.03] border-white/8 text-zinc-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-zinc-500">Weight is changed by logging a weigh-in below, so the history stays complete.</p>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingEdit} className="btn-glass-primary rounded-lg gap-1.5"><Check className="w-4 h-4" /> {savingEdit ? 'Saving…' : 'Save'}</Button>
                <Button type="button" onClick={() => setEditing(false)} className="btn-glass text-white rounded-lg">Cancel</Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {[
                ['Species', SPECIES_LABELS[species]],
                ['Breed', pet.breed || '—'],
                ['Age', pet.age || '—'],
                ['Sex', SEXES.find(s => s.key === pet.sex)?.label ?? '—'],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-[11px] text-zinc-500 uppercase tracking-wider">{k}</dt><dd className="mt-0.5">{v}</dd></div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/[0.06]">
            {planner ? (
              <Link href={planner}><Button className="btn-glass text-white rounded-lg h-9 text-xs gap-1.5"><Apple className="w-3.5 h-3.5" /> Nutrition plan for {pet.name}</Button></Link>
            ) : (
              <span className="text-xs text-zinc-500">The nutrition planner doesn&rsquo;t cover {SPECIES_LABELS[species].toLowerCase()}s — ask your vet about feeding.</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {confirmDelete ? (
                <>
                  <span className="text-xs text-zinc-400">Delete {pet.name} and all their records?</span>
                  <Button onClick={deletePet} disabled={deleting} className="h-8 rounded-lg text-xs bg-[#FF6B81] hover:bg-[#FF6B81]/90 text-[#2A0A10]">{deleting ? 'Deleting…' : 'Delete'}</Button>
                  <Button onClick={() => setConfirmDelete(false)} className="btn-glass text-white h-8 rounded-lg text-xs">Keep</Button>
                </>
              ) : (
                <Button onClick={() => setConfirmDelete(true)} className="h-8 rounded-lg text-xs gap-1.5 bg-transparent text-[#FF6B81] hover:bg-[#FF6B81]/10 border-0"><Trash2 className="w-3.5 h-3.5" /> Delete pet</Button>
              )}
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Weight ── */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Scale className="w-4 h-4 text-primary" /> Weight</h2>

            {chart.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: '#A79CBF', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fill: '#A79CBF', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip formatter={v => [`${v} kg`, 'Weight']} contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="kg" stroke="#FFAE6D" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500 mb-2">
                {chart.length === 1 ? 'One weigh-in so far. Log another to see a trend.' : 'No weigh-ins yet.'}
              </p>
            )}

            <form onSubmit={e => { e.preventDefault(); void addWeight() }} className="flex flex-wrap items-end gap-2 mt-4">
              <div className="flex-1 min-w-[6rem]">
                <label htmlFor="w-kg" className={label}>kg</label>
                <Input id="w-kg" type="number" inputMode="decimal" min="0.01" step="0.01" value={newWeight.kg} onChange={e => setNewWeight(s => ({ ...s, kg: e.target.value }))} placeholder="e.g. 12.4" className={field} />
              </div>
              <div className="flex-1 min-w-[9rem]">
                <label htmlFor="w-on" className={label}>Weighed on</label>
                <Input id="w-on" type="date" max={todayISO()} value={newWeight.on} onChange={e => setNewWeight(s => ({ ...s, on: e.target.value }))} className={field} />
              </div>
              <Button type="submit" disabled={savingWeight} className="btn-glass-primary rounded-lg gap-1.5 h-9"><Plus className="w-4 h-4" /> Log</Button>
            </form>

            {weights.length > 0 && (
              <ul className="mt-4 divide-y divide-white/[0.05] text-sm">
                {weights.slice().reverse().map(w => (
                  <li key={w.id} className="flex items-center justify-between py-2">
                    <span className="text-zinc-400">{formatDay(w.measured_on)}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums font-medium">{Number(w.weight_kg)} kg</span>
                      <button onClick={() => deleteWeight(w)} aria-label={`Remove the ${formatDay(w.measured_on)} weigh-in`} className="text-zinc-600 hover:text-[#FF6B81]"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* ── Reminders ── */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4"><Bell className="w-4 h-4 text-primary" /> Reminders</h2>

            <form onSubmit={e => { e.preventDefault(); void addReminder() }} className="space-y-2 mb-5">
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="Reminder type" value={newReminder.kind} onChange={e => setNewReminder(s => ({ ...s, kind: e.target.value as ReminderKind }))}
                  className="h-9 px-3 rounded-lg bg-[#130F1C] border border-white/10 text-sm">
                  {(Object.keys(REMINDER_KINDS) as ReminderKind[]).map(k => <option key={k} value={k}>{REMINDER_KINDS[k]}</option>)}
                </select>
                <Input aria-label="Due date" type="date" min={todayISO()} value={newReminder.on} onChange={e => setNewReminder(s => ({ ...s, on: e.target.value }))} className={field} />
              </div>
              <div className="flex gap-2">
                <Input aria-label="Reminder note" value={newReminder.title} maxLength={80} onChange={e => setNewReminder(s => ({ ...s, title: e.target.value }))}
                  placeholder={`e.g. ${newReminder.kind === 'vaccine' ? 'Rabies booster' : REMINDER_KINDS[newReminder.kind]}`} className={field} />
                <Button type="submit" disabled={savingReminder} className="btn-glass-primary rounded-lg gap-1.5 h-9 shrink-0"><Plus className="w-4 h-4" /> Add</Button>
              </div>
            </form>

            {open.length === 0 && done.length === 0 && (
              <p className="text-sm text-zinc-500">No reminders yet. Vaccinations, deworming and check-ups are the usual ones.</p>
            )}

            <ul className="space-y-1.5">
              {[...open, ...done].map(r => {
                const overdue = !r.done && daysUntil(r.due_on) < 0
                return (
                  <li key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${r.done ? 'opacity-55' : 'bg-white/[0.02]'}`}>
                    <button onClick={() => toggleReminder(r)} aria-label={r.done ? `Mark ${r.title} as not done` : `Mark ${r.title} as done`} className="shrink-0">
                      {r.done
                        ? <span className="w-5 h-5 rounded-md bg-primary flex items-center justify-center"><Check className="w-3.5 h-3.5 text-[#2A1A08]" /></span>
                        : <Circle className="w-5 h-5 text-zinc-600" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm truncate ${r.done ? 'line-through' : ''}`}>{r.title}</div>
                      <div className={`text-[11px] ${overdue ? 'text-[#FF6B81]' : 'text-zinc-500'}`}>
                        {REMINDER_KINDS[r.kind]} · {r.done ? `was due ${formatDay(r.due_on)}` : `${describeDue(r.due_on)} (${formatDay(r.due_on)})`}
                      </div>
                    </div>
                    <button onClick={() => deleteReminder(r)} aria-label={`Delete ${r.title}`} className="text-zinc-600 hover:text-[#FF6B81] shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                  </li>
                )
              })}
            </ul>
            <p className="text-[11px] text-zinc-600 mt-4">Reminders show on your dashboard. PetPal doesn&rsquo;t send emails or notifications.</p>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
