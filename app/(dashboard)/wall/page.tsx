'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Heart, Sparkles, PawPrint, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/layout/PageHeader'
import { toast } from 'sonner'
import { formatRelative } from '@/lib/utils'
import { readRaw, writeJSON, KEYS } from '@/lib/storage'
import { useClientValue } from '@/lib/use-client-value'

interface Confession {
  id: number | string
  text: string
  mood: string
  hearts: number
  time: string
  liked?: boolean
}

const MOODS = [
  { key: 'happy', label: 'Happy', color: '#FFAE6D' },
  { key: 'proud', label: 'Proud', color: '#FFD98E' },
  { key: 'help', label: 'Need advice', color: '#FFCF6B' },
  { key: 'sad', label: 'Tough day', color: '#A79CBF' },
]

const SEED: Confession[] = [
  { id: 1, text: 'Biscuit finally learned to sit AND stay today. Three weeks of patience and so many treats. Proud dog dad moment! 🐶', mood: 'proud', hearts: 248, time: '12m ago' },
  { id: 2, text: 'Used the food checker before giving Luna a bit of my dinner — turns out onions are toxic to cats! Probably saved her a vet trip.', mood: 'happy', hearts: 519, time: '38m ago' },
  { id: 3, text: 'Adopted a senior rescue beagle this weekend. He sleeps 18 hours a day and I have never been happier. 🥰', mood: 'happy', hearts: 871, time: '1h ago' },
  { id: 4, text: 'Any tips for a puppy that cries at night? Week two and I am running on no sleep but I love the little guy.', mood: 'help', hearts: 333, time: '2h ago' },
  { id: 5, text: 'The nutrition planner said I was overfeeding by almost double. Two months later my cat is at a healthy weight and so playful again.', mood: 'proud', hearts: 402, time: '3h ago' },
  { id: 6, text: 'Said goodbye to my 16-year-old girl today. Hug your pets a little tighter tonight. ❤️', mood: 'sad', hearts: 1287, time: '5h ago' },
]

export default function WallPage() {
  const [posts, setPosts] = useState<Confession[]>(SEED)
  const [draft, setDraft] = useState('')
  const [mood, setMood] = useState('happy')
  const [posting, setPosting] = useState(false)
  const [loadState, setLoadState] = useState<'loading' | 'live' | 'offline'>('loading')

  // Which posts this browser has already hearted, so a refresh can't be used
  // to like the same post over and over. Read during render (stable string).
  const savedLikedRaw = useClientValue(() => readRaw(KEYS.wallLiked), null)
  const savedLiked = useMemo(() => {
    if (!savedLikedRaw) return new Set<string>()
    try {
      const v = JSON.parse(savedLikedRaw)
      return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    } catch {
      return new Set<string>()
    }
  }, [savedLikedRaw])
  const [editedLiked, setEditedLiked] = useState<Set<string> | null>(null)
  const liked = editedLiked ?? savedLiked
  const setLiked = setEditedLiked

  // Load real posts; fall back to the seed if unavailable or empty.
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) { if (active) setLoadState('offline'); return }
        const { data, error } = await supabase
          .from('confessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        if (!active) return
        if (error || !data || data.length === 0) { setLoadState('offline'); return }
        setPosts(data.map(d => ({
          id: d.id, text: d.text, mood: d.mood, hearts: d.hearts ?? 0,
          time: formatRelative(d.created_at),
        })))
        setLoadState('live')
      } catch {
        if (active) setLoadState('offline')
      }
    }
    load()
    return () => { active = false }
  }, [])

  async function post() {
    const text = draft.trim()
    if (text.length < 10) { toast.error('Say a little more — at least 10 characters.'); return }
    if (text.length > 280) { toast.error('That’s a bit long — keep it under 280 characters.'); return }
    if (posting) return

    setPosting(true)
    const tempId = 'tmp-' + Date.now()
    const optimistic: Confession = { id: tempId, text, mood, hearts: 0, time: 'just now' }
    setPosts(p => [optimistic, ...p])
    setDraft('')

    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        // No backend configured: the post is real on screen but only for this
        // session. Say so rather than implying it was published.
        toast.success('Posted to this session', {
          description: 'The community feed isn’t connected, so this won’t be saved.',
        })
        return
      }

      const { data, error } = await supabase
        .from('confessions')
        .insert({ text, mood })
        .select()
        .single()

      if (error || !data) {
        // Roll the optimistic post back and hand the text to the user so
        // nothing they wrote is silently lost.
        setPosts(p => p.filter(c => c.id !== tempId))
        setDraft(text)
        toast.error('Couldn’t post that', {
          description: error?.message ?? 'Please check your connection and try again.',
        })
        return
      }

      setPosts(p => p.map(c => (c.id === tempId ? { ...c, id: data.id } : c)))
      toast.success('Posted to the community', { description: 'Shared anonymously — no name attached.' })
    } catch {
      setPosts(p => p.filter(c => c.id !== tempId))
      setDraft(text)
      toast.error('Couldn’t post that', { description: 'Please check your connection and try again.' })
    } finally {
      setPosting(false)
    }
  }

  async function like(id: number | string) {
    const key = String(id)
    if (liked.has(key)) return            // one heart per browser, per post
    if (key.startsWith('tmp-')) return    // not saved yet — nothing to increment

    // Optimistic bump.
    setPosts(p => p.map(c => (c.id === id ? { ...c, hearts: c.hearts + 1, liked: true } : c)))
    const nextLiked = new Set(liked).add(key)
    setLiked(nextLiked)
    writeJSON(KEYS.wallLiked, [...nextLiked])

    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      // Seed posts have numeric ids and exist only on the client.
      if (!supabase || typeof id !== 'string') return
      const { error } = await supabase.rpc('increment_hearts', { cid: id })
      if (error) throw error
    } catch {
      // Undo the optimistic bump so the count on screen stays truthful.
      setPosts(p => p.map(c => (c.id === id ? { ...c, hearts: Math.max(0, c.hearts - 1), liked: false } : c)))
      const revert = new Set(nextLiked); revert.delete(key)
      setLiked(revert)
      writeJSON(KEYS.wallLiked, [...revert])
      toast.error('Couldn’t save that heart')
    }
  }

  const moodOf = (k: string) => MOODS.find(m => m.key === k) ?? MOODS[0]

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Community"
        icon={Sparkles}
        title="Owner"
        accent="community"
        sub="Wins, worries and wisdom from fellow pet parents. Share a moment, ask for advice, cheer each other on — anonymously."
        species="fish"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-3xl mx-auto">

        {/* Composer */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-6">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Share a win, ask for advice, or just say hi to fellow pet parents…"
            rows={3}
            maxLength={280}
            className="w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMood(m.key)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-all ${mood === m.key ? 'border-transparent' : 'border-white/10 text-zinc-400 hover:text-white'}`}
                  style={mood === m.key ? { background: `${m.color}1F`, color: m.color, borderColor: `${m.color}40` } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-600 font-mono">{draft.length}/280</span>
              <Button onClick={post} disabled={posting} className="btn-glass-primary gap-1.5 h-9 rounded-xl text-sm">
                <Send className="w-3.5 h-3.5" /> {posting ? 'Posting…' : 'Post'}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FFAE6D]" />
          Posts are anonymous. Be kind — we&rsquo;re all just trying to do right by our pets.
        </div>

        {loadState === 'offline' && (
          <div className="glass-card rounded-xl p-3 mb-4 flex items-start gap-2.5 text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 text-[#FFD98E] shrink-0 mt-px" />
            <span>
              Showing example posts — the live community feed isn&rsquo;t reachable right now, so anything you post
              here won&rsquo;t be saved.
            </span>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {posts.map((c, i) => {
              const m = moodOf(c.mood)
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="glass-card rounded-2xl p-5 surface-hover"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                      <PawPrint className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                    <span className="text-xs text-zinc-500">Anonymous</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span className="text-xs text-zinc-600">{c.time}</span>
                    <Badge className="ml-auto text-[10px]" style={{ background: `${m.color}18`, color: m.color, borderColor: `${m.color}33` }}>
                      {m.label}
                    </Badge>
                  </div>
                  <p className="text-[15px] leading-relaxed text-zinc-200 mb-4 whitespace-pre-wrap break-words">{c.text}</p>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const isLiked = liked.has(String(c.id))
                      return (
                        <button
                          onClick={() => like(c.id)}
                          disabled={isLiked}
                          aria-pressed={isLiked}
                          aria-label={isLiked ? `Hearted, ${c.hearts} hearts` : `Heart this post, ${c.hearts} hearts`}
                          className={`flex items-center gap-1.5 text-xs transition-colors ${
                            isLiked ? 'text-[#FF6B81] cursor-default' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#FF6B81]' : ''}`} /> {c.hearts}
                        </button>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
