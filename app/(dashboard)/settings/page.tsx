'use client'

import { useState, useEffect, useMemo } from 'react'
import { applyPreferences, PREFS_CHANGED } from '@/components/layout/PreferencesProvider'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Shield, Palette, CreditCard, Trash2, Check, Mail, Moon, Lock, Eye, EyeOff,
  Smartphone, LogOut, Sparkles, Flame, Zap, KeyRound, PawPrint, MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { writeJSON, readRaw, writeRaw, KEYS } from '@/lib/storage'
import { useClientValue } from '@/lib/use-client-value'
import PageHeader from '@/components/layout/PageHeader'

/**
 * Account settings.
 *
 * Every control on this screen now does what it says. Previously most did
 * not: "Member since June 2026 · 2 pets" and "Last changed 3 months ago" were
 * typed into the markup; a claim of "zero-knowledge encryption" was untrue;
 * the two-factor, notification, public-profile and data-sharing switches saved
 * a boolean nothing ever read; the bio field was never stored; Cancel did
 * nothing; and Delete account only said it was "disabled in demo mode".
 * Controls with nothing behind them have been removed rather than left to
 * promise features PetPal does not have.
 */

type TabKey = 'profile' | 'security' | 'appearance' | 'account'

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Password & Privacy', icon: Shield },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'account', label: 'Account', icon: CreditCard },
]

/** Accent swatches — each a distinct hue with an honest name. */
const ACCENTS = [
  { name: 'Coral', color: '#FFAE6D' },
  { name: 'Periwinkle', color: '#8E8BF5' },
  { name: 'Amber', color: '#FFD98E' },
  { name: 'Violet', color: '#B6A6FF' },
  { name: 'Sky', color: '#68C9F0' },
  { name: 'Rose', color: '#FF8FA6' },
]

type ThemeChoice = 'system' | 'light' | 'dark'

/** Only preferences that PreferencesProvider actually applies. */
const DEFAULT_TOGGLES = { reduceMotion: false, highContrast: false }
type Toggles = typeof DEFAULT_TOGGLES

function safeTheme(raw: string): ThemeChoice | null {
  try {
    const t = (JSON.parse(raw) ?? {}).theme
    return t === 'light' || t === 'dark' || t === 'system' ? t : null
  } catch {
    return null
  }
}

async function db() {
  const { tryCreateClient } = await import('@/lib/supabase/client')
  return tryCreateClient()
}

export default function SettingsPage() {
  // The password-reset email lands on /settings?tab=security.
  const search = useClientValue(() => window.location.search, '')
  const linkedTab = new URLSearchParams(search).get('tab')
  const [tabChoice, setTab] = useState<TabKey | null>(null)
  const tab: TabKey = tabChoice ?? (TABS.some(t => t.key === linkedTab) ? (linkedTab as TabKey) : 'profile')

  const [email, setEmail] = useState('')
  const [savedName, setSavedName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [petCount, setPetCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [toggleEdits, setToggleEdits] = useState<Partial<Toggles> | null>(null)
  const [themeEdit, setThemeEdit] = useState<ThemeChoice | null>(null)

  const savedAccent = useClientValue(() => readRaw(KEYS.accent), null)
  const [accentEdited, setAccent] = useState<string | null>(null)
  const accent = accentEdited ?? savedAccent ?? '#FFAE6D'

  const savedPrefsRaw = useClientValue(() => readRaw(KEYS.prefs), null)
  const toggles = useMemo(() => {
    let saved: Partial<Toggles> = {}
    if (savedPrefsRaw) {
      try {
        const parsed = JSON.parse(savedPrefsRaw)
        if (parsed && typeof parsed === 'object') {
          saved = { reduceMotion: parsed.reduceMotion === true, highContrast: parsed.highContrast === true }
        }
      } catch { /* corrupt entry — defaults */ }
    }
    return { ...DEFAULT_TOGGLES, ...saved, ...(toggleEdits ?? {}) }
  }, [savedPrefsRaw, toggleEdits])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const supabase = await db()
        if (!supabase) return
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user || !active) return
        setEmail(user.email ?? '')
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
        const name = (profile?.display_name ?? user.user_metadata?.display_name ?? '').trim()
        if (!active) return
        setSavedName(name)
        setDisplayName(name)
        if (user.created_at) {
          setMemberSince(new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))
        }
        const { count } = await supabase.from('pets').select('id', { count: 'exact', head: true })
        if (active) setPetCount(count ?? 0)
      } catch { /* the page still works for device preferences */ }
    })()
    return () => { active = false }
  }, [])

  const thisDevice = useClientValue(() => {
    const ua = navigator.userAgent
    const browser =
      /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' :
      /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
    const os =
      /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' :
      /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'This device'
    return `${os} · ${browser}`
  }, 'This device')

  // ── Profile ──────────────────────────────────────────────────────────────
  async function saveProfile() {
    if (saving) return
    const name = displayName.trim()
    if (name.length < 1 || name.length > 40) { toast.error('Your display name must be 1 to 40 characters.'); return }
    setSaving(true)
    try {
      const supabase = await db()
      if (!supabase) { toast.error('The database isn’t connected.'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Please sign in again.'); return }
      /*
       * The name lives in two places — the auth record and the profiles row the
       * admin screen reads — and this used to update only the first, so the two
       * drifted apart. Both are written now.
       */
      const [{ error: authErr }, { error: profileErr }] = await Promise.all([
        supabase.auth.updateUser({ data: { display_name: name } }),
        supabase.from('profiles').update({ display_name: name }).eq('id', user.id),
      ])
      if (authErr || profileErr) {
        toast.error('Couldn’t save your profile', { description: (authErr ?? profileErr)?.message })
        return
      }
      setSavedName(name)
      setDisplayName(name)
      toast.success('Profile saved')
    } catch {
      toast.error('Couldn’t save your profile', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  // ── Password ─────────────────────────────────────────────────────────────
  /*
   * Sets the password directly. The forgot-password email signs the user in
   * and brings them here; this screen used to offer only "send another reset
   * email", so a user following a reset link had no way to actually reset.
   */
  async function changePassword() {
    if (savingPw) return
    if (pw.next.length < 8) { toast.error('Use at least 8 characters.'); return }
    if (pw.next !== pw.confirm) { toast.error('The two passwords don’t match.'); return }
    setSavingPw(true)
    try {
      const supabase = await db()
      if (!supabase) { toast.error('The database isn’t connected.'); return }
      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) { toast.error('Couldn’t change your password', { description: error.message }); return }
      setPw({ next: '', confirm: '' })
      toast.success('Password changed', { description: 'Use it next time you sign in.' })
    } catch {
      toast.error('Couldn’t change your password', { description: 'Check your connection and try again.' })
    } finally {
      setSavingPw(false)
    }
  }

  async function signOutOthers() {
    try {
      const supabase = await db()
      if (!supabase) { toast.error('The database isn’t connected.'); return }
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) { toast.error('Couldn’t sign out other sessions', { description: error.message }); return }
      toast.success('Other sessions signed out', { description: 'This device stays signed in.' })
    } catch {
      toast.error('Couldn’t sign out other sessions')
    }
  }

  // ── Delete account ───────────────────────────────────────────────────────
  async function deleteAccount() {
    if (deleting || deleteText !== 'DELETE') return
    setDeleting(true)
    try {
      const supabase = await db()
      if (!supabase) { toast.error('The database isn’t connected.'); return }
      const { error } = await supabase.rpc('delete_my_account')
      if (error) { toast.error('Couldn’t delete your account', { description: error.message }); return }
      await supabase.auth.signOut().catch(() => {})
      window.location.href = '/?account=deleted'
    } catch {
      toast.error('Couldn’t delete your account', { description: 'Check your connection and try again.' })
    } finally {
      setDeleting(false)
    }
  }

  // ── Appearance ───────────────────────────────────────────────────────────
  const theme: ThemeChoice = themeEdit ?? (savedPrefsRaw ? safeTheme(savedPrefsRaw) : null) ?? 'system'

  function writePrefs(next: Toggles, nextTheme: ThemeChoice) {
    writeJSON(KEYS.prefs, { ...next, theme: nextTheme })
    applyPreferences()
    window.dispatchEvent(new Event(PREFS_CHANGED))
  }

  function setTheme(next: ThemeChoice) {
    setThemeEdit(next)
    writePrefs(toggles, next)
    toast.success(next === 'system' ? 'Following your system theme' : `Switched to ${next} mode`)
  }

  function setToggle(key: keyof Toggles, val: boolean) {
    const next = { ...toggles, [key]: val }
    setToggleEdits(next)
    writePrefs(next, theme)
  }

  function pickAccent(name: string, color: string) {
    setAccent(color)
    writeRaw(KEYS.accent, color)
    applyPreferences()
    window.dispatchEvent(new Event(PREFS_CHANGED))
    toast.success(`Accent set to ${name}`)
  }

  const initials = (savedName || email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Your account"
        icon={Palette}
        title="Settings"
        sub="Your profile and password are stored with your account. Appearance choices are remembered on this device."
        species="rabbit"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                  tab === t.key ? 'bg-primary/12 text-primary border border-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <t.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {tab === 'profile' && (
                <Card title="Profile" desc="Your display name is how PetPal greets you, and what an administrator sees.">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-[#8E8BF5] to-[#FFD98E] flex items-center justify-center text-2xl font-black text-white shrink-0" style={{ fontFamily: 'var(--font-display)' }}>
                      {initials}
                    </div>
                    <div>
                      <div className="font-semibold">{savedName || 'No display name yet'}</div>
                      <p className="text-zinc-400 text-xs mt-0.5">
                        {[
                          memberSince ? `Member since ${memberSince}` : null,
                          petCount === null ? null : `${petCount} ${petCount === 1 ? 'pet' : 'pets'}`,
                        ].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={e => { e.preventDefault(); void saveProfile() }}>
                    <Field label="Display name" htmlFor="display-name">
                      <Input id="display-name" value={displayName} maxLength={40} onChange={e => setDisplayName(e.target.value)} className="bg-[#130F1C] border-white/10 focus:border-primary/50" />
                    </Field>
                    <Field label="Email" htmlFor="email">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input id="email" value={email} disabled className="pl-10 bg-[#130F1C] border-white/10 opacity-60" />
                      </div>
                    </Field>
                    <div className="flex justify-end gap-3 mt-2">
                      <Button type="button" variant="outline" className="border-white/15" disabled={displayName === savedName}
                        onClick={() => setDisplayName(savedName)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={saving || displayName.trim() === savedName}
                        className="bg-gradient-to-r from-primary to-[#8E8BF5] text-white border-0">
                        <Check className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {tab === 'security' && (
                <>
                  <Card title="Change password" desc="Also where a password-reset link brings you.">
                    <form onSubmit={e => { e.preventDefault(); void changePassword() }} className="space-y-3">
                      <Field label="New password" htmlFor="pw-new">
                        <div className="relative">
                          <Input id="pw-new" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.next}
                            onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder="At least 8 characters"
                            className="pr-10 bg-[#130F1C] border-white/10 focus:border-primary/50" />
                          <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </Field>
                      <Field label="Confirm new password" htmlFor="pw-confirm">
                        <Input id="pw-confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.confirm}
                          onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
                          className="bg-[#130F1C] border-white/10 focus:border-primary/50" />
                      </Field>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingPw || !pw.next} className="btn-glass-primary rounded-xl gap-2">
                          <KeyRound className="w-4 h-4" /> {savingPw ? 'Saving…' : 'Change password'}
                        </Button>
                      </div>
                    </form>
                  </Card>

                  <Card title="Privacy" desc="What PetPal does with your information — facts, not settings.">
                    <Fact icon={PawPrint} title="Your pets are private" body="Pet profiles, reminders and weigh-ins can be read only by your account. The database enforces this, not just the app." />
                    <Fact icon={MessageSquare} title="Community posts are anonymous" body="Nothing links a post to your account — no name, no account ID." />
                    <Fact icon={Lock} title="Where your data lives" body="In PetPal’s Supabase database, sent over HTTPS. It is never sold or shared, and deleting your account removes it." />
                    <Fact icon={Smartphone} title="Location" body="The vet finder uses your location for one search and does not store it." />
                  </Card>
                </>
              )}

              {tab === 'appearance' && (
                <>
                  <Card title="Accent colour" desc="Applies immediately on this device.">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {ACCENTS.map(a => (
                        <button
                          key={a.color}
                          onClick={() => pickAccent(a.name, a.color)}
                          className={`relative aspect-square rounded-2xl border-2 transition-all ${accent === a.color ? 'scale-105' : 'border-transparent hover:scale-105'}`}
                          style={{ background: a.color, borderColor: accent === a.color ? '#fff' : 'transparent' }}
                          aria-label={a.name}
                          aria-pressed={accent === a.color}
                        >
                          {accent === a.color && <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />}
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Card title="Display" desc="Adjust for comfort and accessibility.">
                    <div className="py-3 border-b border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <Moon className="w-5 h-5 text-zinc-400" />
                        <div>
                          <div className="text-sm font-medium">Theme</div>
                          <div className="text-xs text-zinc-400">Light, dark, or whatever your device is set to.</div>
                        </div>
                      </div>
                      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] w-fit">
                        {(['system', 'light', 'dark'] as ThemeChoice[]).map(t => (
                          <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t}
                            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-all ${theme === t ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-white'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ToggleRow icon={Zap} label="Reduce motion" desc="Minimise animations and transitions" checked={toggles.reduceMotion} onChange={v => setToggle('reduceMotion', v)} />
                    <ToggleRow icon={Eye} label="High contrast" desc="Increase text and border contrast" checked={toggles.highContrast} onChange={v => setToggle('highContrast', v)} />
                  </Card>
                </>
              )}

              {tab === 'account' && (
                <>
                  <Card title="Plan" desc="PetPal has no paid tier.">
                    <div className="p-5 rounded-2xl border border-white/8 bg-[#171226] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-[#8E8BF5] flex items-center justify-center">
                          <Flame className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">Free <Sparkles className="w-3.5 h-3.5 text-[#FFD98E]" /></div>
                          <div className="text-xs text-zinc-400">Every tool, for as many pets as you have</div>
                        </div>
                      </div>
                      <Badge className="bg-[#8E8BF5]/10 text-[#8E8BF5] border-[#8E8BF5]/20">Active</Badge>
                    </div>
                  </Card>
                  <Card title="Sessions" desc="This device, and a way to revoke the others.">
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <div className="text-sm font-medium">{thisDevice}</div>
                          <div className="text-xs text-zinc-400">Signed in on this browser</div>
                        </div>
                      </div>
                      <Badge className="bg-[#8E8BF5]/10 text-[#8E8BF5] border-[#8E8BF5]/20 text-xs">Current</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">
                      PetPal doesn&rsquo;t record where you sign in from, so other devices can&rsquo;t be listed
                      individually — but you can sign them all out at once.
                    </p>
                    <button onClick={signOutOthers} className="text-sm text-zinc-400 hover:text-white mt-3 flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign out of all other sessions
                    </button>
                  </Card>
                  <Card title="Delete account" desc="Permanent. This cannot be undone." danger>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                      Deletes your account, your pets and all their reminders and weigh-ins. Questions you asked
                      and answers you wrote stay in the public Ask a Vet archive without your name. Anonymous
                      community posts are not linked to you and are unaffected.
                    </p>
                    <label htmlFor="confirm-delete" className="text-xs text-zinc-400 block mb-2">Type <span className="font-mono text-zinc-200">DELETE</span> to confirm</label>
                    <div className="flex gap-2">
                      <Input id="confirm-delete" value={deleteText} onChange={e => setDeleteText(e.target.value)} className="bg-[#130F1C] border-white/10 max-w-[12rem]" autoComplete="off" />
                      <Button variant="outline" disabled={deleteText !== 'DELETE' || deleting} onClick={deleteAccount}
                        className="border-[#FF6B81]/40 text-[#FF6B81] hover:bg-[#FF6B81]/10">
                        <Trash2 className="w-4 h-4 mr-1.5" /> {deleting ? 'Deleting…' : 'Delete my account'}
                      </Button>
                    </div>
                  </Card>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Card({ title, desc, children, danger }: { title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`p-6 glass-card rounded-2xl ${danger ? '!border-[#FF6B81]/25' : ''}`}>
      <div className="mb-5">
        <h2 className={`font-bold ${danger ? 'text-[#FF6B81]' : ''}`}>{title}</h2>
        {desc && <p className="text-zinc-400 text-xs mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">{label}</label>
      {children}
    </div>
  )
}

function Fact({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-zinc-400" /></div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-zinc-400 leading-relaxed">{body}</div>
      </div>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: {
  icon: LucideIcon; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-zinc-400">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} className="data-[state=checked]:bg-primary" />
    </div>
  )
}
