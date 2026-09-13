'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Apple, GraduationCap, Heart, Scissors, Syringe, Bug, Brain, ArrowUpRight, X, Clock, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Guide { title: string; desc: string; icon: LucideIcon; tag: string; read: string; body: string[] }

const GUIDES: Guide[] = [
  {
    title: 'New Arrival Basics', desc: 'Everything for the first 12 weeks — for any species, feeding, vet checks, settling in.', icon: Heart, tag: 'New Owners', read: '8 min',
    body: [
      'Bringing home a new companion — whether a puppy, kitten, rabbit, bird or reptile — starts with a calm, safe space. Set up a quiet area with appropriate bedding, fresh water, and species-correct food before they arrive.',
      'Book a first wellness visit with a vet within the first week. They’ll confirm age, check for parasites, and start any vaccination or health plan suited to the species.',
      'Keep early days low-stress: limit visitors, give them somewhere to retreat, and let them explore at their own pace. Consistency in feeding times and handling builds trust fast.',
      'Use PetPal’s Nutrition Planner to set correct portions from day one, and the Care Plan for a gentle week-by-week routine.',
    ],
  },
  {
    title: 'Reading a Pet Food Label', desc: 'Decode ingredients, guaranteed analysis and marketing buzzwords.', icon: Apple, tag: 'Nutrition', read: '6 min',
    body: [
      'The ingredient list is ordered by weight. A named protein (e.g. “chicken” or “salmon”) in the first one or two spots is a good sign. Vague terms like “meat derivatives” are lower quality.',
      'The “guaranteed analysis” shows minimum protein and fat and maximum fibre and moisture. Compare on a dry-matter basis when comparing wet vs dry food.',
      'Look for a nutritional adequacy statement (e.g. AAFCO or local equivalent) confirming the food is “complete and balanced” for your pet’s life stage.',
      'Ignore buzzwords like “premium” and “gourmet” — they aren’t regulated. Focus on named ingredients, life-stage suitability, and your vet’s advice.',
    ],
  },
  {
    title: 'Positive Reinforcement Training', desc: 'The science-backed way to teach any pet, gently and effectively.', icon: GraduationCap, tag: 'Training', read: '10 min',
    body: [
      'Reward the behaviour you want immediately — within a second or two — so your pet connects the reward to the action. Treats, praise, or play all work depending on the animal.',
      'Keep sessions short (3–5 minutes) and frequent. End on a success. This works for dogs, cats, parrots, rabbits and even rats.',
      'Never punish — it damages trust and rarely teaches the right thing. Redirect unwanted behaviour and reward the alternative instead.',
      'Use a consistent cue word or clicker. Gradually reduce treats as the behaviour becomes reliable, keeping occasional rewards to maintain it.',
    ],
  },
  {
    title: 'Grooming at Home', desc: 'Brushing, bathing, nails and ears — a stress-free routine for furred, feathered & scaled pets.', icon: Scissors, tag: 'Care', read: '7 min',
    body: [
      'Brush regularly to remove loose fur, prevent matting, and reduce hairballs in cats. Frequency depends on coat type — daily for long coats, weekly for short.',
      'Bathe only when needed and with species-appropriate products. Many small pets and reptiles should not be bathed the way dogs are — research your species first.',
      'Trim nails little and often, avoiding the quick. Birds and rabbits also need nail care. If unsure, ask a vet or groomer to show you once.',
      'Check ears, eyes, teeth and skin during grooming — it’s the easiest way to catch problems early.',
    ],
  },
  {
    title: 'Vaccination Schedules', desc: 'Core vs non-core vaccines and when each is due.', icon: Syringe, tag: 'Health', read: '5 min',
    body: [
      'Core vaccines protect against serious, widespread diseases and are recommended for nearly all dogs and cats. Other species (rabbits, ferrets) have their own core vaccines.',
      'Non-core vaccines are given based on lifestyle and risk — e.g. kennel cough for social dogs.',
      'Puppies and kittens need a series of boosters in their first months, then regular boosters through life. Your vet will tailor the schedule.',
      'Keep records in PetPal so you never miss a booster — overdue vaccines can leave gaps in protection.',
    ],
  },
  {
    title: 'Parasite Prevention', desc: 'Fleas, ticks and worms — year-round prevention that actually works.', icon: Bug, tag: 'Health', read: '6 min',
    body: [
      'Fleas and ticks aren’t just seasonal in many climates — year-round prevention is often safest. Use vet-approved products dosed for your pet’s exact weight.',
      'Worming schedules vary by age and lifestyle. Puppies, kittens and outdoor pets generally need more frequent treatment.',
      'Never use dog products on cats — some ingredients are toxic to cats. Always match the product to the species.',
      'Check your pet after walks, especially in long grass, and remove ticks promptly with a proper tick tool.',
    ],
  },
  {
    title: 'Understanding Body Language', desc: 'What that tail, those ears and those eyes are really saying.', icon: Brain, tag: 'Behaviour', read: '9 min',
    body: [
      'Body language is your pet’s main way of communicating. A wagging tail isn’t always happy — context, stiffness and speed matter.',
      'Watch the whole body: ears, eyes, posture and tail together. Flattened ears, a tucked tail or a hunched body usually mean fear or discomfort.',
      'Cats show contentment with slow blinks and relaxed posture; rabbits “binky” (leap and twist) when joyful; birds fluff and grind their beaks when content.',
      'Learning these signals helps you reduce stress, avoid bites or scratches, and strengthen your bond.',
    ],
  },
  {
    title: 'Senior Pet Care', desc: 'Helping older companions stay comfortable, mobile and happy.', icon: Heart, tag: 'Care', read: '8 min',
    body: [
      'Older pets often need more frequent vet checks to catch age-related issues like arthritis, dental disease and organ changes early.',
      'Adjust nutrition for slower metabolism and any medical needs — PetPal’s planner accounts for the senior life stage.',
      'Make life easier: softer bedding, ramps or steps, easy-access litter or food, and gentler exercise.',
      'Watch for subtle changes in appetite, mobility, toileting or mood — and log them so you can spot trends and share with your vet.',
    ],
  },
]

const TAGS = ['All', 'New Owners', 'Nutrition', 'Training', 'Health', 'Care', 'Behaviour']

export default function ResourcesPage() {
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState<Guide | null>(null)
  const filtered = GUIDES.filter(g => filter === 'All' || g.tag === filter)

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Badge className="mb-4 bg-[#FF7A6B]/10 text-[#FF7A6B] border-[#FF7A6B]/30 font-mono text-[10px]"><BookOpen className="w-3 h-3 mr-1.5" /> CARE GUIDES</Badge>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Care <span className="text-[#FF7A6B]">Guides</span>
          </h1>
          <p className="text-zinc-400 max-w-xl">Vet-reviewed, plain-English guides for every kind of pet, at every stage of life.</p>
        </motion.div>

        <div className="flex gap-2 flex-wrap mb-8">
          {TAGS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${filter === t ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]' : 'bg-[#161213] border-white/10 text-zinc-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((g, i) => (
            <motion.button
              key={g.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setOpen(g)}
              className="glass-card rounded-2xl p-5 surface-hover group cursor-pointer text-left">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF7A6B]/12 border border-[#FF7A6B]/20 flex items-center justify-center"><g.icon className="w-5 h-5 text-[#FF7A6B]" /></div>
                <Badge className="bg-white/5 text-zinc-400 border-white/10 text-[10px]">{g.tag}</Badge>
              </div>
              <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{g.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{g.desc}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{g.read} read</span>
                <span className="flex items-center gap-1 text-[#FF7A6B] opacity-0 group-hover:opacity-100 transition-opacity">Read <ArrowUpRight className="w-3 h-3" /></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reader modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.article
              initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto glass-strong border border-white/10 rounded-t-3xl sm:rounded-3xl p-7 sm:p-9"
            >
              <button onClick={() => setOpen(null)} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-[#FF7A6B]/15 text-[#FF7A6B] border-[#FF7A6B]/30 text-[10px]">{open.tag}</Badge>
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {open.read} read</span>
              </div>
              <h2 className="text-3xl font-semibold mb-5 pr-10" style={{ fontFamily: 'var(--font-display)' }}>{open.title}</h2>
              <div className="space-y-4">
                {open.body.map((p, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed">{p}</p>
                ))}
              </div>
              <div className="mt-7 p-4 rounded-xl bg-[#FF7A6B]/5 border border-[#FF7A6B]/20 flex items-start gap-3">
                <Heart className="w-4 h-4 text-[#FF7A6B] mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">General guidance for all pet owners. Always consult your vet for advice specific to your animal&rsquo;s species, breed and health.</p>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
