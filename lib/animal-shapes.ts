/**
 * Animal silhouettes as point clouds.
 *
 * The hero's particles need to form a recognisable dog, then morph into other
 * species as the page scrolls. Rather than ship 3D models (megabytes, and a
 * licence problem), each animal is *drawn* once into a small offscreen canvas
 * using plain 2D primitives, then its opaque pixels are sampled into a fixed
 * number of 3D points.
 *
 * Why this way:
 *   - deterministic — no emoji font differences between Windows and macOS,
 *   - tiny — a few hundred lines instead of a model download,
 *   - tweakable — the silhouettes can be nudged without a 3D tool,
 *   - every shape yields the SAME point count, which is what lets the shader
 *     morph one animal into the next by simply lerping between two buffers.
 */

export type AnimalKey = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'orb'

/** Resolution of the offscreen canvas each silhouette is drawn into. */
const GRID = 220

type Ctx = CanvasRenderingContext2D

/* ────────────────────────────────────────────────────────────────────────────
   Drawing helpers. All coordinates are in a 0..100 space, scaled to the grid.
   ──────────────────────────────────────────────────────────────────────────── */

function makeDrawer(ctx: Ctx) {
  const s = GRID / 100
  return {
    ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0) {
      ctx.beginPath()
      ctx.ellipse(cx * s, cy * s, rx * s, ry * s, (rot * Math.PI) / 180, 0, Math.PI * 2)
      ctx.fill()
    },
    circle(cx: number, cy: number, r: number) {
      this.ellipse(cx, cy, r, r)
    },
    poly(points: [number, number][]) {
      ctx.beginPath()
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
      ctx.closePath()
      ctx.fill()
    },
    /** Rounded limb / tail drawn as a thick line with round caps. */
    limb(x1: number, y1: number, x2: number, y2: number, w: number) {
      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = w * s
      ctx.moveTo(x1 * s, y1 * s)
      ctx.lineTo(x2 * s, y2 * s)
      ctx.stroke()
    },
    /** Curved tail / neck through a quadratic control point. */
    curve(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, w: number) {
      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.lineWidth = w * s
      ctx.moveTo(x1 * s, y1 * s)
      ctx.quadraticCurveTo(cx * s, cy * s, x2 * s, y2 * s)
      ctx.stroke()
    },
  }
}

type Drawer = ReturnType<typeof makeDrawer>

/* ────────────────────────────────────────────────────────────────────────────
   The animals. Each is a left-facing side profile, sized to fill the grid.
   ──────────────────────────────────────────────────────────────────────────── */

const PAINTERS: Record<Exclude<AnimalKey, 'orb'>, (d: Drawer) => void> = {
  // Sitting dog, head left, ears down, tail curving up behind.
  dog(d) {
    d.limb(52, 62, 50, 84, 9)        // front leg
    d.limb(68, 60, 72, 82, 11)       // hind haunch
    d.ellipse(63, 58, 19, 21, -8)    // body
    d.curve(78, 58, 92, 52, 86, 30, 6) // tail
    d.limb(44, 40, 47, 56, 13)       // neck
    d.ellipse(38, 34, 14, 12, -12)   // head
    d.ellipse(24, 38, 10, 7, 8)      // muzzle
    d.circle(16, 38, 4)              // nose
    d.ellipse(44, 26, 6, 11, 18)     // ear
    d.ellipse(50, 80, 8, 5)          // front paw
    d.ellipse(74, 82, 9, 5)          // hind paw
  },

  // Sitting cat, upright posture, pointed ears, tail curled round the front.
  cat(d) {
    d.ellipse(62, 64, 17, 22, -4)    // body
    d.curve(74, 76, 92, 78, 84, 56, 5) // tail curling up
    d.limb(52, 52, 51, 84, 8)        // front leg
    d.ellipse(70, 82, 11, 6)         // haunch on the floor
    d.limb(48, 38, 52, 54, 10)       // neck
    d.circle(44, 32, 13)             // head (rounder than the dog)
    d.poly([[34, 24], [36, 10], [46, 21]])  // near ear
    d.poly([[50, 21], [58, 9], [56, 25]])   // far ear
    d.ellipse(33, 36, 7, 5)          // muzzle
    d.ellipse(50, 84, 7, 4)          // front paw
  },

  // Perched bird, body angled, tail fanned back, small head and beak.
  bird(d) {
    d.ellipse(55, 52, 19, 16, -14)          // body
    d.poly([[68, 58], [95, 69], [91, 43], [72, 47]]) // fanned tail
    d.ellipse(52, 50, 14, 9, -24)           // folded wing
    d.limb(41, 40, 47, 47, 9)               // neck
    d.circle(35, 33, 10.5)                  // head
    d.poly([[27, 30], [11, 36], [27, 41]])  // beak
    d.limb(52, 66, 52, 79, 4)               // leg
    d.limb(45, 80, 60, 80, 3.5)             // perch foot
  },

  // Sitting rabbit, tall ears, round body, cotton tail.
  rabbit(d) {
    d.ellipse(58, 66, 19, 21, -6)    // body
    d.circle(76, 70, 8)              // cotton tail
    d.limb(50, 62, 48, 82, 8)        // front leg
    d.ellipse(64, 84, 13, 6)         // hind foot
    d.limb(46, 44, 50, 58, 9)        // neck
    d.circle(42, 38, 12)             // head
    d.ellipse(34, 42, 7, 5)          // muzzle
    d.ellipse(41, 18, 5, 16, -8)     // near ear
    d.ellipse(51, 20, 5, 15, 6)      // far ear
  },

  // Fish, side on, fanned tail, dorsal and pelvic fins.
  fish(d) {
    d.ellipse(48, 50, 27, 17)        // body
    d.poly([[74, 50], [94, 34], [94, 66]]) // tail fin
    d.poly([[44, 34], [52, 18], [60, 36]]) // dorsal fin
    d.poly([[44, 66], [50, 80], [58, 66]]) // pelvic fin
    d.ellipse(32, 54, 7, 5, 20)      // pectoral fin
    d.circle(28, 45, 3)              // eye socket void is ignored; adds mass
  },
}

/* ────────────────────────────────────────────────────────────────────────────
   Sampling
   ──────────────────────────────────────────────────────────────────────────── */

/** Deterministic PRNG so every reload produces the same cloud. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Rasterise one animal and return `count` points, centred on the origin and
 * scaled to roughly [-2.2, 2.2] on the larger axis.
 *
 * Points are drawn from the filled pixels at random (seeded), so a silhouette
 * with more area gets a denser, more even cloud than an edge trace would.
 * A small random z spreads the flat drawing into a slab so it reads as a solid
 * object when the scene rotates rather than a piece of card.
 */
export function sampleAnimal(key: AnimalKey, count: number, seed = 1): Float32Array {
  const out = new Float32Array(count * 3)
  const rand = mulberry32(seed)

  // The orb is analytic — no rasterising needed.
  if (key === 'orb') {
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * golden
      const jitter = 1 + (rand() - 0.5) * 0.1
      out[i * 3] = Math.cos(phi) * r * 2.05 * jitter
      out[i * 3 + 1] = y * 2.05 * jitter
      out[i * 3 + 2] = Math.sin(phi) * r * 2.05 * jitter
    }
    return out
  }

  // Server-side or a browser without canvas: fall back to the orb so the hero
  // still has something coherent to render.
  if (typeof document === 'undefined') return sampleAnimal('orb', count, seed)

  const canvas = document.createElement('canvas')
  canvas.width = GRID
  canvas.height = GRID
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sampleAnimal('orb', count, seed)

  ctx.clearRect(0, 0, GRID, GRID)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  PAINTERS[key](makeDrawer(ctx))

  const { data } = ctx.getImageData(0, 0, GRID, GRID)

  // Collect every filled pixel once, then sample from that pool.
  const filled: number[] = []
  for (let i = 0; i < GRID * GRID; i++) {
    if (data[i * 4 + 3] > 128) filled.push(i)
  }
  if (filled.length === 0) return sampleAnimal('orb', count, seed)

  const SCALE = 4.6 // world units across the full grid

  for (let i = 0; i < count; i++) {
    const px = filled[Math.floor(rand() * filled.length)]
    const gx = px % GRID
    const gy = Math.floor(px / GRID)

    // Sub-pixel jitter stops the cloud looking like a visible lattice.
    const x = ((gx + rand()) / GRID - 0.5) * SCALE
    const y = -((gy + rand()) / GRID - 0.5) * SCALE // canvas y is flipped
    // Thickness: a touch fuller in the middle of the body than at the edges.
    const z = (rand() - 0.5) * 0.85

    out[i * 3] = x
    out[i * 3 + 1] = y
    out[i * 3 + 2] = z
  }

  return out
}

/** The scroll order the hero morphs through. */
export const MORPH_SEQUENCE: AnimalKey[] = ['dog', 'cat', 'bird', 'rabbit', 'fish']

export const ANIMAL_LABELS: Record<AnimalKey, string> = {
  dog: 'Dogs',
  cat: 'Cats',
  bird: 'Birds',
  rabbit: 'Rabbits',
  fish: 'Fish',
  orb: 'Every pet',
}
