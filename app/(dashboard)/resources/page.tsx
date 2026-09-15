'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Apple, GraduationCap, Heart, Scissors, Syringe, Bug, Brain, ArrowUpRight, X, Clock,
  Siren, ShieldAlert, ShieldCheck, Scale, Sparkles, MapPin, Car, Users, Activity, Bird,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/layout/PageHeader'

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
  {
    title: 'Emergency First Aid', desc: 'The signs that mean “go now”, and what to do in the first ten minutes.', icon: Siren, tag: 'Emergency', read: '7 min',
    body: [
      'Some signs mean go to a vet immediately, not in the morning: difficulty breathing, pale white or blue gums, a swollen hard belly, repeated unproductive retching, collapse, a seizure lasting more than two minutes, or any suspected poisoning.',
      'Bloat (gastric dilatation-volvulus) kills deep-chested dogs within hours. The tell is a hard, distended abdomen with repeated retching that brings nothing up. This is a surgical emergency.',
      'For poisoning, never make your pet vomit unless a vet tells you to — bringing up a caustic substance burns the throat a second time. Take the packaging with you.',
      'For bleeding, press a clean cloth firmly on the wound and keep pressure on during the journey. Do not apply a tourniquet.',
      'For heatstroke, move them to shade, wet them with cool (not ice-cold) water, and drive to a vet with the air conditioning on. Heatstroke can kill after the animal appears to recover.',
      'Save your vet’s number and the nearest 24-hour clinic in your phone today, before you need them. PetPal’s Find a Vet shows mapped practices near you.',
    ],
  },
  {
    title: 'Toxic Foods and Plants', desc: 'The everyday items that send pets to the vet most often.', icon: ShieldAlert, tag: 'Health', read: '6 min',
    body: [
      'The top offenders in a normal kitchen are chocolate, grapes and raisins, onions and garlic, xylitol (in sugar-free gum and some peanut butters), macadamia nuts, and alcohol.',
      'Xylitol deserves special attention: it is lethal to dogs in tiny amounts and hides in products that sound harmless. Read the label of any nut butter before sharing it.',
      'Lilies are uniquely dangerous to cats. Every part is toxic, including the pollen and the vase water, and a cat grooming pollen off its fur is enough to cause fatal kidney failure. Do not keep them in a house with cats.',
      'Cooked bones are never safe — cooking makes them brittle so they splinter. Raw bones carry different risks (broken teeth, bacteria) and should be discussed with your vet first.',
      'Garden and houseplant dangers include sago palm, oleander, azalea, daffodil bulbs, yew and foxglove. Common houseplants like monstera, pothos and dieffenbachia cause painful mouth swelling.',
      'When in doubt, do not feed it, and use PetPal’s Food Safety Checker — it tells you the clinical reason and what to do, and says plainly when an item has not been verified.',
    ],
  },
  {
    title: 'Weight Management', desc: 'Why over half of pets are overweight, and how to reverse it safely.', icon: Scale, tag: 'Nutrition', read: '6 min',
    body: [
      'Most overweight pets got there through accurate love and inaccurate portions. Feeding by eye, free-feeding, and treats that are never counted add up faster than owners expect.',
      'Learn the body condition score. You should be able to feel the ribs easily under a thin layer of fat, see a waist from above, and see a tuck-up from the side. If you cannot feel ribs, they are overweight.',
      'Weigh food with kitchen scales rather than using a cup. A "cup" varies enormously, and a 20% overestimate every day is what causes slow, invisible weight gain.',
      'Treats should be no more than 10% of daily calories, and that 10% must come OFF the main meal, not be added on top. Swap commercial treats for green beans, carrot or cucumber.',
      'Safe weight loss is slow: roughly 1–2% of bodyweight per week. Crash dieting a cat is dangerous and can cause hepatic lipidosis, a serious liver condition.',
      'Set a target in PetPal’s Nutrition Planner using the body-condition slider — it reduces the daily target for an overweight pet rather than feeding to their current, too-high weight.',
    ],
  },
  {
    title: 'Dental Care', desc: 'The most under-treated problem in pets, and the daily habit that prevents it.', icon: Sparkles, tag: 'Care', read: '5 min',
    body: [
      'By the age of three, most dogs and cats have some degree of dental disease. It is painful, and pets hide pain well — they keep eating long after their mouth hurts.',
      'Brushing is the single most effective thing you can do, and it needs to be daily to matter. Use a pet toothpaste; human toothpaste contains fluoride and often xylitol, both of which are harmful if swallowed.',
      'Introduce it slowly over a couple of weeks: let them lick the paste, then touch the brush to a few teeth, then build up. Never force it — one bad experience sets you back months.',
      'Dental chews and special diets help but do not replace brushing. Hard items like antlers, hooves and bones are a common cause of fractured teeth.',
      'Warning signs: bad breath, red or bleeding gums, dropping food, chewing on one side, or pawing at the mouth. Bad breath is not normal — it is usually bacteria.',
    ],
  },
  {
    title: 'Microchipping and Lost Pets', desc: 'The fifteen-minute job that gets pets home, plus what to do in the first hour.', icon: MapPin, tag: 'Care', read: '4 min',
    body: [
      'A microchip is a permanent identifier the size of a grain of rice, implanted under the skin between the shoulder blades. It takes seconds and does not need anaesthetic.',
      'The chip is useless if the registered details are out of date. This is the single most common reason chipped pets are not reunited. Check your details whenever you move or change number.',
      'A chip is not a tracker. It only works when someone scans the animal, so a collar with a tag is still worth having as the fastest route home.',
      'If a pet goes missing, search the house first — cats in particular hide in impossibly small spaces indoors. Then search your own property thoroughly before widening out.',
      'Contact local vets, shelters and the microchip database immediately, and post in local groups with a clear photo, the area, and your number. Most pets are found within a mile of home.',
    ],
  },
  {
    title: 'Travel and Car Journeys', desc: 'Safe restraint, motion sickness, and the rule that matters most in summer.', icon: Car, tag: 'Care', read: '5 min',
    body: [
      'Never leave a pet in a parked car in warm weather. A car reaches lethal temperatures within minutes even with windows cracked and even in mild sunshine. There is no safe duration.',
      'Restrain properly: a crash-tested harness, a secured crate, or a boot guard. An unrestrained pet is a projectile in a crash and a distraction before one.',
      'For motion sickness, withhold food for a few hours before travelling, keep the car cool, and let them see out of a front window. Your vet can prescribe medication for severe cases.',
      'Build positive associations gradually — sit in the stationary car with treats, then short journeys to somewhere good, before any long trip.',
      'Bring water, a bowl, a lead, poo bags, and their records. Stop every two hours on long journeys for a toilet break and a drink.',
    ],
  },
  {
    title: 'Separation Anxiety', desc: 'Why a pet destroys the house when you leave, and how to actually fix it.', icon: Brain, tag: 'Behaviour', read: '7 min',
    body: [
      'Separation anxiety is panic, not naughtiness. Punishing the result — chewing, howling, toileting indoors — makes it worse, because the animal is already frightened.',
      'The signs distinguish it from boredom: distress starts within minutes of you leaving, focuses on exit points, and happens every single time rather than occasionally.',
      'Treat it by desensitising the departure. Pick up your keys and sit back down. Put your coat on and make a cup of tea. Repeat until those cues stop predicting that you leave.',
      'Then build absences from seconds, not minutes. Step outside, come back before they get anxious, and extend gradually. Going straight to an hour reinforces the fear.',
      'Keep arrivals and departures boring. Big emotional goodbyes raise the contrast between you being there and not.',
      'A food puzzle given as you leave gives them something better to do — but only once the panic is reduced, or they simply will not eat it.',
    ],
  },
  {
    title: 'Puppy and Kitten Socialisation', desc: 'The short window that shapes the rest of their life.', icon: Users, tag: 'Training', read: '6 min',
    body: [
      'The key socialisation window is roughly 3–14 weeks in puppies and 2–7 weeks in kittens. Positive experiences during this period do more for lifelong temperament than anything later.',
      'Socialisation means calm, positive exposure — not volume. One relaxed meeting beats ten overwhelming ones. A frightened puppy is learning the wrong lesson.',
      'Cover surfaces, sounds, people of different appearances, gentle handling of paws and ears, car journeys, and the vet clinic. Ask your vet about a "happy visit" with no examination.',
      'Vaccination timing limits where puppies can go, but does not mean staying home. Carry them, use clean private gardens, and invite vaccinated adult dogs over.',
      'Never force an interaction. Let the animal approach and retreat freely — choice is what builds confidence.',
    ],
  },
  {
    title: 'Exercise by Species', desc: 'How much is enough, and how much is too much for a growing animal.', icon: Activity, tag: 'Care', read: '5 min',
    body: [
      'Dogs vary enormously. A working breed may need two hours of real activity; a flat-faced breed may struggle with twenty minutes and overheat easily. Breed matters more than size.',
      'For puppies, over-exercising damages growing joints. A common guideline is five minutes of formal walk per month of age, twice a day — free play in a garden is different and self-limiting.',
      'Cats need short, intense bursts that mimic hunting. Ten minutes of wand-toy play twice a day does more than a room full of ignored toys. Finish with a "catch" so the sequence completes.',
      'Rabbits and guinea pigs need daily space to run, binky and forage — a hutch alone is not enough and is a welfare problem.',
      'Mental exercise tires animals as effectively as physical exercise. Scent work, puzzle feeders and training sessions are especially useful for recovery or bad weather.',
    ],
  },
  {
    title: 'Understanding Pet Insurance', desc: 'What the policy types actually mean before you need to claim.', icon: ShieldCheck, tag: 'Care', read: '6 min',
    body: [
      'Policies fall into rough categories: accident-only, time-limited, per-condition maximum, and lifetime. The differences only become obvious at the worst possible moment.',
      'Lifetime cover renews the limit each year and is the only type that meaningfully covers a long-term condition such as diabetes, arthritis or allergies.',
      'Time-limited policies stop paying for a condition after twelve months. For a chronic illness that is the point at which the cost becomes yours permanently.',
      'Pre-existing conditions are excluded by every insurer. This is why cover is cheapest and most useful when taken out while the animal is young and healthy.',
      'Check the excess structure, whether it is per condition or per year, and whether the premium rises with age — it almost always does.',
      'Whatever you choose, read what is excluded rather than what is advertised. Dental, behavioural and breeding costs are commonly left out.',
    ],
  },
  {
    title: 'Small Pets and Exotics', desc: 'Rabbits, guinea pigs, birds and reptiles have needs dogs and cats do not.', icon: Bird, tag: 'Care', read: '7 min',
    body: [
      'Rabbits are not low-maintenance starter pets. They need unlimited hay, daily fresh greens, a large space to run, and a companion — they are highly social and suffer alone.',
      'Guinea pigs cannot make their own vitamin C and need a daily dietary source or they develop scurvy. They are also strictly social and should never be kept singly.',
      'Birds need far more than a cage. Out-of-cage time, foraging enrichment and company are welfare essentials, and their respiratory systems are extremely sensitive — non-stick cookware fumes, aerosols and candles can kill a bird in minutes.',
      'Reptiles live or die by their environment. Correct temperature gradient, humidity and UVB lighting are not optional extras; most reptile illness seen by vets is caused by husbandry, not disease.',
      'Prey species hide illness almost until the end. Any change in appetite, droppings or activity in a rabbit, guinea pig or bird is urgent, not something to watch for a few days.',
      'Find a vet with genuine exotics experience before you need one — not every small-animal practice treats them.',
    ],
  },
  {
    title: 'Saying Goodbye', desc: 'Quality of life, how the decision is made, and grief that deserves taking seriously.', icon: Heart, tag: 'Health', read: '6 min',
    body: [
      'Quality of life is assessed on things you can observe: appetite, pain control, mobility, continence, interest in people and favourite activities, and whether good days outnumber bad ones.',
      'Keeping a simple daily record of good days and bad days makes a fogged, emotional decision clearer than memory alone ever will.',
      'Your vet can talk it through honestly if you ask them to. Most will tell you that the more common regret is waiting too long, not acting too early.',
      'Euthanasia is usually a sedative followed by an injection that works within seconds and is not painful. You can be present, and many vets offer it at home.',
      'Grief for an animal is real grief. It is often disenfranchised — people expect you to move on quickly — and it does not deserve to be rushed or minimised.',
      'If there are other pets in the house, they may search or change routine for a while. Keep their schedule steady and give them time.',
    ],
  },
  {
    title: 'Fleas, Ticks and Worms', desc: 'A year-round routine that prevents most of what owners find horrifying.', icon: Bug, tag: 'Health', read: '5 min',
    body: [
      'Fleas do not stop in winter — centrally heated homes keep the life cycle going all year. Adult fleas on the animal are a small fraction of the infestation; most of it is eggs and larvae in carpets and bedding.',
      'Treating the animal alone is why infestations come back. Wash bedding hot, vacuum thoroughly including edges and under furniture, and treat the household environment as well.',
      'Never use a dog flea product on a cat. Permethrin, common in dog treatments, is severely toxic to cats and causes seizures.',
      'Remove ticks with a proper tick hook, twisting rather than pulling, and never with a burnt match, petroleum jelly or squeezing — those make the tick regurgitate into the wound.',
      'Worming frequency depends on lifestyle: a hunting cat or a dog that scavenges needs more frequent treatment than an indoor animal. Lungworm in particular is carried by slugs and snails and is potentially fatal.',
      'Ask your vet for a schedule based on your actual risk rather than buying the strongest thing on the shelf.',
    ],
  },
]

const TAGS = ['All', 'New Owners', 'Nutrition', 'Health', 'Care', 'Behaviour', 'Training', 'Emergency']

export default function ResourcesPage() {
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState<Guide | null>(null)
  const filtered = GUIDES.filter(g => filter === 'All' || g.tag === filter)

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Care guides"
        icon={BookOpen}
        title="Twenty-one guides,"
        accent="one honest voice."
        sub="Plain-English guides for every kind of pet, at every stage of life — from the first week to the last."
        species="orb"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">

        <div className="flex gap-2 flex-wrap mb-8">
          {TAGS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${filter === t ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-[#171226] border-white/10 text-zinc-400 hover:text-white'}`}>
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
                <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center"><g.icon className="w-5 h-5 text-primary" /></div>
                <Badge className="bg-white/5 text-zinc-400 border-white/10 text-[10px]">{g.tag}</Badge>
              </div>
              <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{g.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{g.desc}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{g.read} read</span>
                <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">Read <ArrowUpRight className="w-3 h-3" /></span>
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
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">{open.tag}</Badge>
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {open.read} read</span>
              </div>
              <h2 className="text-3xl font-semibold mb-5 pr-10" style={{ fontFamily: 'var(--font-display)' }}>{open.title}</h2>
              <div className="space-y-4">
                {open.body.map((p, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed">{p}</p>
                ))}
              </div>
              <div className="mt-7 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">General guidance for all pet owners. Always consult your vet for advice specific to your animal&rsquo;s species, breed and health.</p>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
