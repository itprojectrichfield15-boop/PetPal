/**
 * Animal point clouds with real volume.
 *
 * ── Why this was rebuilt ────────────────────────────────────────────────────
 * The first version rasterised a silhouette and scattered points through a flat
 * slab of constant thickness. That is why the animals read as cardboard cutouts:
 * a dog's chest and its ankle were the same depth, and with no surface direction
 * there was nothing to light, so the whole thing was a uniform haze.
 *
 * This version inflates the silhouette into a solid:
 *
 *   1. draw the animal into an offscreen canvas,
 *   2. compute a DISTANCE TRANSFORM — for every filled pixel, how far it is
 *      from the outline,
 *   3. give each pixel a thickness h = maxThickness · sqrt(distance / maxDist).
 *      The square root produces an elliptical cross-section rather than a
 *      wedge, so bodies are round and legs, ears and tails stay slim —
 *      anatomically correct for free,
 *   4. take the GRADIENT of that height field to get a true surface normal at
 *      every point, which is what finally lets the shader light them.
 *
 * Points are also emitted in a consistent spatial order (sorted by angle around
 * the centroid, then by radius), so index i in the dog sits in roughly the same
 * place on the body as index i in the cat. That is what stops the morph looking
 * like an explosion — corresponding points travel short, sensible distances.
 */

export type AnimalKey = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'orb'

/** Resolution of the offscreen canvas each silhouette is drawn into. */
const GRID = 256
/** World units across the full grid. */
const SCALE = 4.8
/** Maximum half-thickness, in world units, at the fattest part of a body. */
const MAX_THICKNESS = 0.62

type Ctx = CanvasRenderingContext2D

/* ────────────────────────────────────────────────────────────────────────────
   Drawing helpers — coordinates are in a 0..100 space, scaled to the grid.
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
    /** Smooth body outline through a list of points, closed. */
    blob(points: [number, number][], tension = 0.4) {
      if (points.length < 3) return
      ctx.beginPath()
      const p = points
      const n = p.length
      ctx.moveTo(p[0][0] * s, p[0][1] * s)
      for (let i = 0; i < n; i++) {
        const p0 = p[(i - 1 + n) % n]
        const p1 = p[i]
        const p2 = p[(i + 1) % n]
        const p3 = p[(i + 2) % n]
        const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2
        const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2
        const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2
        const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2
        ctx.bezierCurveTo(c1x * s, c1y * s, c2x * s, c2y * s, p2[0] * s, p2[1] * s)
      }
      ctx.closePath()
      ctx.fill()
    },
  }
}

type Drawer = ReturnType<typeof makeDrawer>

/* ────────────────────────────────────────────────────────────────────────────
   The animals — left-facing side profiles, built from overlapping masses so the
   distance transform reads a thick torso and thin extremities.
   ──────────────────────────────────────────────────────────────────────────── */

const PAINTERS: Record<Exclude<AnimalKey, 'orb'>, (d: Drawer) => void> = {
  // Sitting dog: deep chest, sloped back, feathered tail, folded ear.
  dog(d) {
    d.limb(70, 56, 75, 80, 13)                    // hind haunch
    d.limb(53, 60, 51, 83, 8)                     // front leg
    d.blob([[44, 44], [58, 38], [72, 44], [79, 58], [74, 74], [58, 78], [46, 70], [41, 56]], 0.5) // torso
    d.curve(78, 56, 94, 50, 88, 26, 7)            // tail, sweeping up
    d.limb(46, 40, 50, 56, 14)                    // neck
    d.blob([[40, 26], [50, 28], [52, 38], [45, 45], [34, 44], [28, 36], [31, 28]], 0.5) // skull
    d.ellipse(24, 40, 11, 7.5, 8)                 // muzzle
    d.circle(15, 40, 4.2)                         // nose
    d.blob([[45, 24], [52, 28], [51, 40], [44, 36]], 0.6) // folded ear
    d.ellipse(50, 83, 8.5, 5)                     // front paw
    d.ellipse(77, 82, 9.5, 5)                     // hind paw
  },

  // Sitting cat: rounder skull, tall triangular ears, tail curling forward.
  cat(d) {
    d.blob([[48, 48], [60, 44], [72, 52], [75, 68], [68, 80], [54, 80], [46, 68], [44, 56]], 0.5) // torso
    d.curve(72, 78, 92, 80, 83, 54, 5.5)          // tail curling up
    d.limb(53, 54, 52, 83, 7.5)                   // front leg
    d.ellipse(68, 82, 12, 6)                      // haunch on the floor
    d.limb(49, 38, 53, 54, 11)                    // neck
    d.blob([[44, 22], [54, 26], [55, 37], [46, 43], [35, 40], [32, 29], [37, 23]], 0.55) // skull
    d.poly([[34, 26], [33, 8], [46, 20]])         // near ear
    d.poly([[50, 20], [61, 7], [58, 26]])         // far ear
    d.ellipse(33, 37, 8, 5.5)                     // muzzle
    d.circle(27, 36, 2.6)                         // nose
    d.ellipse(51, 84, 7, 4)                       // front paw
  },

  // Perched bird: plump breast, folded wing, fanned tail, fine legs.
  bird(d) {
    d.blob([[42, 42], [56, 38], [68, 48], [70, 60], [58, 68], [45, 64], [38, 54]], 0.5) // body
    d.poly([[66, 60], [96, 72], [94, 46], [70, 46]]) // fanned tail
    d.blob([[46, 44], [60, 44], [64, 54], [52, 58], [43, 52]], 0.5) // folded wing
    d.limb(40, 40, 46, 48, 10)                    // neck
    d.circle(34, 32, 11)                          // head
    d.poly([[27, 28], [9, 34], [27, 39]])         // beak
    d.circle(30, 28, 2.2)                         // eye mass
    d.limb(52, 66, 52, 80, 3.5)                   // leg
    d.limb(45, 81, 60, 81, 3)                     // foot
  },

  // Sitting rabbit: heavy haunch, upright ears, cotton tail.
  rabbit(d) {
    d.blob([[48, 50], [62, 46], [74, 58], [73, 74], [60, 82], [48, 76], [44, 62]], 0.5) // body
    d.circle(76, 68, 8.5)                         // cotton tail
    d.limb(51, 62, 49, 82, 8)                     // front leg
    d.ellipse(63, 84, 14, 6)                      // hind foot
    d.limb(47, 44, 52, 58, 10)                    // neck
    d.blob([[42, 28], [52, 32], [51, 42], [42, 47], [33, 42], [32, 32]], 0.55) // head
    d.ellipse(32, 43, 8, 5)                       // muzzle
    d.ellipse(41, 16, 5.5, 17, -7)                // near ear
    d.ellipse(52, 18, 5, 15, 8)                   // far ear
  },

  // Fish: fusiform body, fanned caudal fin, dorsal and pelvic fins.
  fish(d) {
    d.blob([[20, 50], [34, 34], [54, 31], [70, 40], [76, 50], [70, 62], [54, 70], [34, 67]], 0.55) // body
    d.poly([[72, 50], [96, 30], [90, 50], [96, 70]]) // caudal fin
    d.poly([[44, 33], [54, 14], [64, 37]])        // dorsal fin
    d.poly([[44, 66], [50, 82], [60, 65]])        // pelvic fin
    d.ellipse(36, 57, 9, 5, 22)                   // pectoral fin
    d.circle(27, 45, 3.4)                         // eye mass
  },
}

/* ────────────────────────────────────────────────────────────────────────────
   Distance transform — two-pass chamfer (3-4). Fast and accurate enough for a
   256² grid, and it runs once per animal at startup.
   ──────────────────────────────────────────────────────────────────────────── */

function distanceTransform(filled: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) d[i] = filled[i] ? INF : 0

  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x])

  // Forward pass — top-left to bottom-right.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (d[i] === 0) continue
      d[i] = Math.min(
        d[i],
        at(x - 1, y) + 3, at(x, y - 1) + 3,
        at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4
      )
    }
  }
  // Backward pass — bottom-right to top-left.
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (d[i] === 0) continue
      d[i] = Math.min(
        d[i],
        at(x + 1, y) + 3, at(x, y + 1) + 3,
        at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4
      )
    }
  }

  // Chamfer weights are in thirds of a pixel.
  for (let i = 0; i < w * h; i++) d[i] /= 3
  return d
}

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

export interface ShapeData {
  /** xyz per point. */
  positions: Float32Array
  /** Surface normal per point — what makes lighting possible. */
  normals: Float32Array
}

/**
 * Build one animal as a lit, volumetric point cloud of exactly `count` points.
 */
export function sampleAnimal(key: AnimalKey, count: number, seed = 1): ShapeData {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)

  // The orb is analytic — a sphere needs no rasterising, and its normals are
  // simply the normalised positions.
  if (key === 'orb' || typeof document === 'undefined') {
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * golden
      const nx = Math.cos(phi) * r
      const ny = y
      const nz = Math.sin(phi) * r
      positions[i * 3] = nx * 2.0
      positions[i * 3 + 1] = ny * 2.0
      positions[i * 3 + 2] = nz * 2.0
      normals[i * 3] = nx
      normals[i * 3 + 1] = ny
      normals[i * 3 + 2] = nz
    }
    return { positions, normals }
  }

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
  const filled = new Uint8Array(GRID * GRID)
  const pool: number[] = []
  for (let i = 0; i < GRID * GRID; i++) {
    if (data[i * 4 + 3] > 128) {
      filled[i] = 1
      pool.push(i)
    }
  }
  if (pool.length === 0) return sampleAnimal('orb', count, seed)

  const dist = distanceTransform(filled, GRID, GRID)
  let maxDist = 0
  for (const i of pool) if (dist[i] > maxDist) maxDist = dist[i]
  if (maxDist <= 0) maxDist = 1

  /** Half-thickness at a pixel, in world units. sqrt gives a round cross-section. */
  const heightAt = (idx: number) => MAX_THICKNESS * Math.sqrt(Math.max(0, dist[idx]) / maxDist)
  const heightXY = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return 0
    return heightAt(y * GRID + x)
  }

  // Collect into a temporary list so the points can be spatially sorted before
  // being written out — that ordering is what makes the morph coherent.
  interface P { x: number; y: number; z: number; nx: number; ny: number; nz: number; ang: number; rad: number }
  const pts: P[] = []

  for (let i = 0; i < count; i++) {
    const px = pool[Math.floor(rand() * pool.length)]
    const gx = px % GRID
    const gy = Math.floor(px / GRID)

    const h = heightAt(px)
    // Bias points toward the surface of the volume so the form catches light,
    // while leaving a few inside to keep it from looking like a hollow shell.
    const side = rand() < 0.5 ? -1 : 1
    const depth = Math.pow(rand(), 0.35)
    const z = side * h * depth

    // Surface normal from the gradient of the height field.
    const dhdx = (heightXY(gx + 1, gy) - heightXY(gx - 1, gy)) * 0.5
    const dhdy = (heightXY(gx, gy + 1) - heightXY(gx, gy - 1)) * 0.5
    // Canvas y grows downward; world y grows up.
    let nx = -dhdx
    let ny = dhdy
    let nz = side * 0.55
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len; ny /= len; nz /= len

    const x = ((gx + rand()) / GRID - 0.5) * SCALE
    const y = -((gy + rand()) / GRID - 0.5) * SCALE

    pts.push({ x, y, z, nx, ny, nz, ang: Math.atan2(y, x), rad: Math.hypot(x, y) })
  }

  // Consistent spatial ordering across every animal: sweep around the centroid,
  // then outward. Index i therefore lands in a comparable place on each body.
  pts.sort((a, b) => (a.ang - b.ang) || (a.rad - b.rad))

  for (let i = 0; i < count; i++) {
    const p = pts[i]
    positions[i * 3] = p.x
    positions[i * 3 + 1] = p.y
    positions[i * 3 + 2] = p.z
    normals[i * 3] = p.nx
    normals[i * 3 + 1] = p.ny
    normals[i * 3 + 2] = p.nz
  }

  return { positions, normals }
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
