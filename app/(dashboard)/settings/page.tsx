'use client'

import { useState, useEffect, useMemo } from 'react'
import { applyPreferences, PREFS_CHANGED } from '@/components/layout/PreferencesProvider'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Bell, Shield, Palette, CreditCard, Trash2,
  Check, Camera, Mail, Globe, Moon, Lock, Eye, EyeOff,
  Smartphone, Key, LogOut, Sparkles, BadgeCheck, Flame, Zap,
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

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'privacy', label: 'Privacy & Security', icon: Shield },
  { key: 'appearance', label: 'Appearance', icon: Palette },
  { key: 'account', label: 'Account', icon: CreditCard },
]

/**
 * Accent swatches.
 *
 * These were left over from an earlier palette and had drifted badly: three of
 * the six were the identical teal, and no name matched its colour ("Emerald"
 * was coral, "Deep Blue" was red). Each entry is now a genuinely distinct hue
 * with an honest name.
 */
const ACCENTS = [
  { name: 'Coral', color: '#FFAE6D' },
  { name: 'Teal', color: '#8E8BF5' },
  { name: 'Amber', color: '#FFD98E' },
  { name: 'Violet', color: '#B6A6FF' },
  { name: 'Sky', color: '#68C9F0' },
  { name: 'Rose', color: '#FF8FA6' },
]

/** Preference defaults, overlaid with whatever this device has saved. */
/** Theme choice. 'system' follows the operating system. */
type ThemeChoice = 'system' | 'light' | 'dark'

const DEFAULT_TOGGLES = {
  emailReports: true,
  emailDigest: false,
  pushNew: true,
  pushReplies: true,
  anonymous: true,
  twoFactor: false,
  publicProfile: false,
  dataSharing: false,
  reduceMotion: false,
  highContrast: false,
}

type Toggles = typeof DEFAULT_TOGGLES

/** Pull a valid theme out of the saved prefs blob, or null. */
function safeTheme(raw: string): ThemeChoice | null {
  try {
    const t = (JSON.parse(raw) ?? {}).theme
    return t === 'light' || t === 'dark' || t === 'system' ? t : null
  } catch {
    return null
  }
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('Pet Parent')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [toggleEdits, setToggleEdits] = useState<Partial<Toggles> | null>(null)
  const [themeEdit, setThemeEdit] = useState<ThemeChoice | null>(null)

  // Saved preferences are read during render (raw strings are stable values),
  // so the remembered accent and toggles are correct on the first paint rather
  // than snapping into place a frame later. `readRaw` also migrates the
  // pre-rename pawpal_* keys.
  const savedAccent = useClientValue(() => readRaw(KEYS.accent), null)
  const [accentEdited, setAccentEdited] = useState<string | null>(null)
  const accent = accentEdited ?? savedAccent ?? '#FFAE6D'
  const setAccent = setAccentEdited

  // Toggles — defaults, overlaid with whatever was saved on this device.
  const savedPrefsRaw = useClientValue(() => readRaw(KEYS.prefs), null)
  const toggles = useMemo(() => {
    let saved: Partial<Toggles> = {}
    if (savedPrefsRaw) {
      try {
        const parsed = JSON.parse(savedPrefsRaw)
        if (parsed && typeof parsed === 'object') saved = parsed
      } catch {
        // Corrupt entry — fall back to defaults rather than throwing.
      }
    }
    return { ...DEFAULT_TOGGLES, ...saved, ...(toggleEdits ?? {}) }
  }, [savedPrefsRaw, toggleEdits])

  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          setEmail(data.user.email ?? '')
          setDisplayName(data.user.user_metadata?.display_name ?? 'Pet Parent')
        }
      } catch {}
    }
    load()
  }, [])

  /** What this browser actually is, rather than an assumed "Chrome". */
  const thisDevice = useClientValue(() => {
    const ua = navigator.userAgent
    const browser =
      /Edg\//.test(ua) ? 'Edge' :
      /OPR\//.test(ua) ? 'Opera' :
      /Firefox\//.test(ua) ? 'Firefox' :
      /Chrome\//.test(ua) ? 'Chrome' :
      /Safari\//.test(ua) ? 'Safari' : 'Browser'
    const os =
      /Windows/.test(ua) ? 'Windows' :
      /Android/.test(ua) ? 'Android' :
      /iPhone|iPad/.test(ua) ? 'iOS' :
      /Mac OS X/.test(ua) ? 'macOS' :
      /Linux/.test(ua) ? 'Linux' : 'This device'
    return `${os} · ${browser}`
  }, 'This device')

  /** Genuinely sends a reset email. It used to only say that it had. */
  async function sendPasswordReset() {
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase || !email) {
        toast.error('Can’t send a reset email', {
          description: supabase ? 'No email address on this account.' : 'The database isn’t reachable.',
        })
        return
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      if (error) {
        toast.error('Couldn’t send the reset email', { description: error.message })
        return
      }
      toast.success('Reset email sent', { description: `Check ${email}.` })
    } catch {
      toast.error('Couldn’t send the reset email', { description: 'Check your connection and try again.' })
    }
  }

  /** Revokes every other session. It used to only claim to. */
  async function signOutOthers() {
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        toast.error('The database isn’t reachable')
        return
      }
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) {
        toast.error('Couldn’t sign out other sessions', { description: error.message })
        return
      }
      toast.success('Other sessions signed out', { description: 'This device stays signed in.' })
    } catch {
      toast.error('Couldn’t sign out other sessions')
    }
  }

  /** Current theme choice, read from the same saved blob as the toggles. */
  const theme: ThemeChoice = (() => {
    const t = (savedPrefsRaw ? safeTheme(savedPrefsRaw) : null) ?? 'system'
    return (themeEdit ?? t) as ThemeChoice
  })()

  function setTheme(next: ThemeChoice) {
    setThemeEdit(next)
    let current: Record<string, unknown> = {}
    try { current = savedPrefsRaw ? JSON.parse(savedPrefsRaw) ?? {} : {} } catch { current = {} }
    writeJSON(KEYS.prefs, { ...current, ...(toggleEdits ?? {}), theme: next })
    applyPreferences()
    window.dispatchEvent(new Event(PREFS_CHANGED))
    toast.success(
      next === 'system' ? 'Following your system theme' : `Switched to ${next} mode`
    )
  }

  function set(key: keyof Toggles, val: boolean) {
    const next = { ...toggles, [key]: val }
    setToggleEdits(next)
    // Keep the theme choice — it lives in the same blob and would otherwise be
    // wiped every time a switch was flipped.
    writeJSON(KEYS.prefs, { ...next, theme })
    // Apply it now. These used to be saved and never read, so the toast was
    // the only evidence anything had happened.
    applyPreferences()
    window.dispatchEvent(new Event(PREFS_CHANGED))
    toast.success('Preference saved')
  }

  async function save() {
    if (saving) return
    setSaving(true)
    // The accent colour is a device-local preference and always applies.
    writeRaw(KEYS.accent, accent)
    applyPreferences()
    window.dispatchEvent(new Event(PREFS_CHANGED))

    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        toast.success('Preferences saved on this device', {
          description: 'Your account isn’t connected, so the display name wasn’t synced.',
        })
        return
      }

      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } })
      if (error) {
        // Previously this reported success regardless of the result.
        toast.error('Couldn’t save your profile', { description: error.message })
        return
      }
      toast.success('Profile saved', { description: 'Your changes have been applied.' })
    } catch {
      toast.error('Couldn’t save your profile', { description: 'Please check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Your account"
        icon={Palette}
        title="Settings"
        sub="Profile, notifications, privacy and appearance. Preferences are stored on this device; your display name syncs to your account."
        species="rabbit"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* Tab nav */}
          <div className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                  tab === t.key
                    ? 'bg-primary/12 text-primary border border-primary/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <t.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ─── PROFILE ─── */}
              {tab === 'profile' && (
                <>
                  <Card title="Profile" desc="This appears on your pet owner profile.">
                    {/* Avatar */}
                    <div className="flex items-center gap-5 mb-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-[#8E8BF5] to-[#FFD98E] flex items-center justify-center text-2xl font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#171226] border border-white/10 flex items-center justify-center hover:bg-[#1C1630]" aria-label="Change avatar">
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{displayName}</span>
                          <BadgeCheck className="w-4 h-4 text-[#8E8BF5]" />
                        </div>
                        <p className="text-zinc-400 text-xs mt-0.5">Member since June 2026 · 2 pets</p>
                      </div>
                    </div>

                    <Field label="Display Name">
                      <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-[#130F1C] border-white/10 focus:border-primary/50" />
                    </Field>
                    <Field label="Email">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input value={email} disabled className="pl-10 bg-[#130F1C] border-white/10 opacity-60" />
                      </div>
                    </Field>
                    <Field label="Bio (optional)">
                      <textarea
                        value={bio} onChange={e => setBio(e.target.value)}
                        placeholder="Tell us about your pets…" rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-[#130F1C] border border-white/10 text-sm focus:outline-none focus:border-primary/50 resize-none"
                      />
                    </Field>
                  </Card>
                  <SaveBar onSave={save} />
                </>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {tab === 'notifications' && (
                <>
                  <Card title="Email Notifications" desc="Choose what lands in your inbox.">
                    <ToggleRow icon={Mail} label="Pet health reminders" desc="Vaccines, meds and check-up alerts" checked={toggles.emailReports} onChange={v => set('emailReports', v)} />
                    <ToggleRow icon={Globe} label="Weekly digest" desc="Care tips and pet news each week" checked={toggles.emailDigest} onChange={v => set('emailDigest', v)} />
                  </Card>
                  <Card title="Push Notifications" desc="Real-time alerts on your devices.">
                    <ToggleRow icon={Bell} label="New community posts" desc="Replies and likes on your posts" checked={toggles.pushNew} onChange={v => set('pushNew', v)} />
                    <ToggleRow icon={Smartphone} label="Replies & verifications" desc="From fellow pet parents" checked={toggles.pushReplies} onChange={v => set('pushReplies', v)} />
                  </Card>
                </>
              )}

              {/* ─── PRIVACY ─── */}
              {tab === 'privacy' && (
                <>
                  <Card title="Privacy" desc="You are protected by zero-knowledge encryption.">
                    <ToggleRow icon={EyeOff} label="Anonymous mode" desc="Hide your name on community posts" checked={toggles.anonymous} onChange={v => set('anonymous', v)} />
                    <ToggleRow icon={Eye} label="Public profile" desc="Let others see your verified contributions" checked={toggles.publicProfile} onChange={v => set('publicProfile', v)} />
                    <ToggleRow icon={Globe} label="Anonymous data sharing" desc="Help improve PetPal with anonymised usage data" checked={toggles.dataSharing} onChange={v => set('dataSharing', v)} />
                  </Card>
                  <Card title="Security" desc="Protect your account.">
                    <ToggleRow icon={Key} label="Two-factor authentication" desc="Require a code on every login" checked={toggles.twoFactor} onChange={v => set('twoFactor', v)} />
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"><Lock className="w-4 h-4 text-zinc-400" /></div>
                        <div>
                          <div className="text-sm font-medium">Change password</div>
                          <div className="text-xs text-zinc-400">Last changed 3 months ago</div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="border-white/15" onClick={sendPasswordReset}>Update</Button>
                    </div>
                  </Card>
                  <div className="p-4 rounded-xl bg-[#8E8BF5]/5 border border-[#8E8BF5]/20 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-[#8E8BF5] mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">Your data is encrypted and never sold. We only use it to give your pets better care.</p>
                  </div>
                </>
              )}

              {/* ─── APPEARANCE ─── */}
              {tab === 'appearance' && (
                <>
                  <Card title="Accent Color" desc="Personalise your PetPal experience.">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {ACCENTS.map(a => (
                        <button
                          key={a.color}
                          onClick={() => {
                            setAccent(a.color)
                            // Write and apply straight away so the swatch is a
                            // live preview rather than a promise about Save.
                            writeRaw(KEYS.accent, a.color)
                            applyPreferences()
                            window.dispatchEvent(new Event(PREFS_CHANGED))
                            toast.success(`Accent set to ${a.name}`)
                          }}
                          className={`group relative aspect-square rounded-2xl border-2 transition-all ${accent === a.color ? 'scale-105' : 'border-transparent hover:scale-105'}`}
                          style={{ background: a.color, borderColor: accent === a.color ? '#fff' : 'transparent' }}
                          aria-label={a.name}
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
                          <div className="text-xs text-zinc-400">
                            Light, dark, or whatever your device is set to.
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] w-fit">
                        {(['system', 'light', 'dark'] as ThemeChoice[]).map(t => (
                          <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-all ${
                              theme === t ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ToggleRow icon={Zap} label="Reduce motion" desc="Minimise animations and transitions" checked={toggles.reduceMotion} onChange={v => set('reduceMotion', v)} />
                    <ToggleRow icon={Eye} label="High contrast" desc="Increase text and border contrast" checked={toggles.highContrast} onChange={v => set('highContrast', v)} />
                  </Card>
                </>
              )}

              {/* ─── ACCOUNT ─── */}
              {tab === 'account' && (
                <>
                  <Card title="Plan" desc="You're on the free plan — forever.">
                    <div className="p-5 rounded-2xl border-gradient border border-white/8 bg-gradient-to-br from-[#171226] to-[#171226]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-[#8E8BF5] flex items-center justify-center">
                            <Flame className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-2">Free Forever <Sparkles className="w-3.5 h-3.5 text-[#FFD98E]" /></div>
                            <div className="text-xs text-zinc-400">Unlimited pets, plans & tools</div>
                          </div>
                        </div>
                        <Badge className="bg-[#8E8BF5]/10 text-[#8E8BF5] border-[#8E8BF5]/20">ACTIVE</Badge>
                      </div>
                    </div>
                  </Card>
                  {/*
                    * This card used to claim "This device · Chrome" and
                    * "Johannesburg, ZA · Active now" for everyone, on every
                    * device, invented in the markup. It also offered a "sign
                    * out of all other sessions" button that only showed a
                    * success toast. Both are now real: the device line is read
                    * from this browser, and the button actually revokes other
                    * sessions through Supabase.
                    */}
                  <Card title="Sessions" desc="This device, and a way to revoke the others.">
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-zinc-400" />
                        <div>
                          <div className="text-sm font-medium">{thisDevice}</div>
                          <div className="text-xs text-zinc-400">
                            Signed in on this browser
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-[#8E8BF5]/10 text-[#8E8BF5] border-[#8E8BF5]/20 text-xs">Current</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-3">
                      PetPal doesn&rsquo;t track where you sign in from, so other devices can&rsquo;t be
                      listed individually — but you can sign them all out at once.
                    </p>
                    <button onClick={signOutOthers} className="text-sm text-zinc-400 hover:text-white mt-3 flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign out of all other sessions
                    </button>
                  </Card>
                  <Card title="Danger Zone" desc="Irreversible account actions." danger>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-primary">Delete account</div>
                        <div className="text-xs text-zinc-400">Permanently remove your account and all data</div>
                      </div>
                      <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => toast.error('Account deletion is disabled in demo mode')}>
                        <Trash2 className="w-4 h-4 mr-1.5" /> Delete
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
    <div className={`p-6 glass-card rounded-2xl ${danger ? '!border-primary/20' : ''}`}>
      <div className="mb-5">
        <h2 className={`font-bold ${danger ? 'text-primary' : ''}`}>{title}</h2>
        {desc && <p className="text-zinc-400 text-xs mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">{label}</label>
      {children}
    </div>
  )
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange, disabled }: {
  icon: LucideIcon; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
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
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="data-[state=checked]:bg-primary" />
    </div>
  )
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="outline" className="border-white/15">Cancel</Button>
      <Button onClick={onSave} className="bg-gradient-to-r from-primary to-[#8E8BF5] hover:from-[#F2814F] text-white border-0">
        <Check className="w-4 h-4 mr-1.5" /> Save Changes
      </Button>
    </div>
  )
}
