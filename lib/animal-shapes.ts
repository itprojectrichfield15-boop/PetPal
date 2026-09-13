/**
 * Animal point clouds built from true 3D anatomy.
 *
 * ── Why this was rebuilt (again) ────────────────────────────────────────────
 * Version 1 scattered points through a flat slab — cardboard.
 * Version 2 inflated a 2D silhouette using a distance transform, which gave
 * bodies roundness and normals to light. Better, but still fundamentally a
 * drawing pushed into 3D: it only ever looked correct from one camera angle,
 * had no left/right limbs, and revealed itself the moment the scene rotated.
 *
 * This version builds each animal as a UNION OF 3D VOLUMES — ellipsoids for
 * body masses, tapered capsules for necks, limbs and tails — positioned in
 * real space with paired left/right legs and ears. Points are sampled on the
 * surface of those volumes, so:
 *
 *   - the form is correct from EVERY angle, which is what the spinning hero
 *     and the page headers actually need,
 *   - normals are analytic and exact rather than approximated from an image
 *     gradient, so the lighting is genuinely correct,
 *   - limbs exist in pairs at different depths, which is most of what makes a
 *     silhouette read as an animal rather than a logo.
 *
 * Points falling deep inside a neighbouring volume are discarded, so joints
 * read as one creature instead of a bag of overlapping balls.
 *
 * ── Why not downloaded models ──────────────────────────────────────────────
 * A matched, permissively-licensed set of all five species could not be
 * reliably sourced: the Khronos sample library is CC0 for a fox and a fish but
 * its duck carries a restrictive licence and it has no cat or rabbit;
 * poly.pizza requires a paid API key. Mixing art styles and licences across
 * five models — on a project that is submitted for academic credit — is worse
 * than one coherent set. `sampleAnimal` returns plain position/normal buffers,
 * so swapping in GLB models later (via MeshSurfaceSampler) needs no changes
 * anywhere else.
 *
 * Convention: every animal faces −X, stands on −Y, and is symmetric in ±Z.
 */

export type AnimalKey = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'orb'

export interface ShapeData {
  positions: Float32Array
  normals: Float32Array
}

/* ────────────────────────────────────────────────────────────────────────────
   Volume primitives
   ──────────────────────────────────────────────────────────────────────────── */

type Vec3 = [number, number, number]

interface Ellipsoid {
  kind: 'ellipsoid'
  c: Vec3
  r: Vec3
  /** Rotation about the Z axis, in degrees — enough for tilting heads and fins. */
  rot?: number
}

interface Capsule {
  kind: 'capsule'
  a: Vec3
  b: Vec3
  ra: number
  rb: number
}

type Part = Ellipsoid | Capsule

const E = (c: Vec3, r: Vec3, rot = 0): Ellipsoid => ({ kind: 'ellipsoid', c, r, rot })
const C = (a: Vec3, ra: number, b: Vec3, rb: number): Capsule => ({ kind: 'capsule', a, b, ra, rb })

/** Mirror a part across the Z axis, so limbs and ears come in pairs. */
function pair(p: Part): Part[] {
  if (p.kind === 'ellipsoid') {
    return [p, { ...p, c: [p.c[0], p.c[1], -p.c[2]] as Vec3 }]
  }
  return [p, { ...p, a: [p.a[0], p.a[1], -p.a[2]] as Vec3, b: [p.b[0], p.b[1], -p.b[2]] as Vec3 }]
}

/* ────────────────────────────────────────────────────────────────────────────
   The animals
   ──────────────────────────────────────────────────────────────────────────── */

const BUILDERS: Record<Exclude<AnimalKey, 'orb'>, () => Part[]> = {
  /**
   * Sitting dog. Proportions are deliberately stylised rather than
   * anatomically literal: heads and ears are enlarged, because at this
   * particle density a realistically-scaled head reads as a lump and the
   * silhouette stops saying "dog".
   */
  dog: () => [
    E([0.20, 0.05, 0], [0.86, 0.88, 0.66]),                    // deep chest
    E([1.05, -0.40, 0], [0.76, 0.70, 0.58]),                   // rear barrel
    ...pair(E([1.02, -0.72, 0.40], [0.52, 0.56, 0.30])),       // haunches
    C([-0.34, 0.78, 0], 0.34, [0.12, 0.25, 0], 0.50),          // neck
    E([-0.80, 1.22, 0], [0.56, 0.52, 0.48]),                   // skull
    E([-1.42, 1.02, 0], [0.44, 0.30, 0.29]),                   // muzzle
    E([-1.80, 1.06, 0], [0.13, 0.12, 0.13]),                   // nose
    ...pair(E([-0.66, 1.66, 0.30], [0.17, 0.40, 0.12], 18)),   // long folded ears
    ...pair(C([-0.16, -0.40, 0.32], 0.19, [-0.24, -1.55, 0.34], 0.15)), // front legs
    ...pair(E([-0.34, -1.66, 0.34], [0.26, 0.13, 0.19])),      // front paws
    ...pair(E([0.86, -1.60, 0.42], [0.32, 0.14, 0.22])),       // hind feet
    C([1.74, -0.20, 0], 0.18, [2.28, 0.78, 0], 0.09),          // tail
  ],

  /** Sitting cat: narrow chest, big skull, tall ears, tail curling forward. */
  cat: () => [
    E([0.24, -0.12, 0], [0.68, 0.82, 0.52]),                   // upright chest
    E([1.00, -0.62, 0], [0.72, 0.66, 0.54]),                   // rear
    ...pair(E([0.96, -0.92, 0.36], [0.46, 0.46, 0.27])),       // haunches
    C([-0.20, 0.68, 0], 0.27, [0.14, 0.02, 0], 0.40),          // upright neck
    E([-0.62, 1.22, 0], [0.52, 0.50, 0.48]),                   // round skull
    E([-1.08, 1.04, 0], [0.28, 0.22, 0.24]),                   // short muzzle
    E([-1.28, 1.08, 0], [0.09, 0.08, 0.09]),                   // nose
    ...pair(C([-0.66, 1.56, 0.24], 0.19, [-0.78, 2.22, 0.34], 0.03)), // tall pointed ears
    ...pair(C([-0.10, -0.50, 0.26], 0.15, [-0.18, -1.52, 0.28], 0.12)), // front legs
    ...pair(E([-0.26, -1.62, 0.28], [0.21, 0.11, 0.16])),      // front paws
    ...pair(E([0.84, -1.56, 0.36], [0.27, 0.12, 0.20])),       // hind feet
    C([1.62, -0.66, 0], 0.14, [2.12, 0.20, 0], 0.11),          // tail rising
    C([2.12, 0.20, 0], 0.11, [1.80, 0.98, 0], 0.07),           // tail tip curling in
  ],

  /** Perched bird: plump angled body, folded wings, big head, fanned tail. */
  bird: () => [
    E([0.18, 0.02, 0], [0.78, 0.74, 0.60], -12),               // body
    E([0.66, 0.26, 0], [0.52, 0.48, 0.46]),                    // shoulders
    ...pair(E([0.32, 0.04, 0.50], [0.60, 0.44, 0.11], -16)),   // folded wings
    E([1.28, 0.10, 0], [0.44, 0.26, 0.16], -22),               // tail base
    E([1.92, -0.16, 0], [0.60, 0.20, 0.09], -20),              // fanned tail
    C([-0.36, 0.50, 0], 0.25, [-0.08, 0.24, 0], 0.34),         // short neck
    E([-0.72, 0.92, 0], [0.48, 0.46, 0.44]),                   // big head
    E([-1.24, 0.84, 0], [0.32, 0.13, 0.11]),                   // beak
    E([-1.52, 0.86, 0], [0.10, 0.07, 0.07]),                   // beak tip
    ...pair(C([0.12, -0.66, 0.18], 0.08, [0.08, -1.42, 0.20], 0.06)), // legs
    ...pair(E([0.02, -1.50, 0.20], [0.20, 0.06, 0.13])),       // feet
  ],

  /** Sitting rabbit: heavy haunches, compact chest, very tall upright ears. */
  rabbit: () => [
    E([0.30, -0.22, 0], [0.70, 0.72, 0.54]),                   // chest
    E([1.06, -0.52, 0], [0.84, 0.78, 0.62]),                   // big rear
    ...pair(E([0.98, -0.90, 0.42], [0.56, 0.48, 0.29])),       // haunches
    E([1.84, -0.40, 0], [0.28, 0.28, 0.26]),                   // cotton tail
    C([-0.16, 0.42, 0], 0.29, [0.16, 0.00, 0], 0.42),          // short neck
    E([-0.58, 0.96, 0], [0.52, 0.48, 0.46]),                   // big head
    E([-1.04, 0.80, 0], [0.30, 0.24, 0.25]),                   // muzzle
    ...pair(C([-0.50, 1.38, 0.18], 0.16, [-0.30, 2.52, 0.30], 0.11)), // very long ears
    ...pair(C([-0.12, -0.62, 0.26], 0.15, [-0.18, -1.44, 0.28], 0.12)), // front legs
    ...pair(E([-0.26, -1.52, 0.28], [0.19, 0.11, 0.15])),      // front paws
    ...pair(E([0.78, -1.46, 0.42], [0.40, 0.14, 0.23])),       // long hind feet
  ],

  /** Fish: fusiform body, flattened fins, forked caudal fin. */
  fish: () => [
    E([0, 0, 0], [1.25, 0.72, 0.52]),                          // body
    E([-1.05, 0.06, 0], [0.52, 0.48, 0.38]),                   // head taper
    E([-1.46, 0.04, 0], [0.20, 0.26, 0.22]),                   // snout
    E([0.98, 0.02, 0], [0.48, 0.42, 0.24]),                    // caudal peduncle
    E([1.62, 0.34, 0], [0.42, 0.42, 0.06], -28),               // upper tail lobe
    E([1.62, -0.32, 0], [0.42, 0.42, 0.06], 28),               // lower tail lobe
    E([-0.05, 0.86, 0], [0.60, 0.40, 0.05]),                   // dorsal fin
    E([-0.10, -0.78, 0], [0.34, 0.30, 0.05]),                  // pelvic fin
    ...pair(E([-0.55, -0.18, 0.42], [0.34, 0.24, 0.05], 24)),  // pectoral fins
  ],
}

/* ────────────────────────────────────────────────────────────────────────────
   Sampling
   ──────────────────────────────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rotZ(p: Vec3, deg: number): Vec3 {
  if (!deg) return p
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]
}

/** Rough surface area, used to weight how many points each part receives. */
function areaOf(p: Part): number {
  if (p.kind === 'ellipsoid') {
    // Knud Thomsen's approximation.
    const [a, b, c] = p.r
    const k = 1.6075
    return 4 * Math.PI * Math.pow((Math.pow(a * b, k) + Math.pow(a * c, k) + Math.pow(b * c, k)) / 3, 1 / k)
  }
  const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2])
  const rm = (p.ra + p.rb) / 2
  return 2 * Math.PI * rm * len + 4 * Math.PI * rm * rm
}

/** Signed-ish containment test: <1 means the point is inside this volume. */
function insideness(p: Part, x: number, y: number, z: number): number {
  if (p.kind === 'ellipsoid') {
    const local = rotZ([x - p.c[0], y - p.c[1], z - p.c[2]], -(p.rot ?? 0))
    return (
      (local[0] / p.r[0]) ** 2 +
      (local[1] / p.r[1]) ** 2 +
      (local[2] / p.r[2]) ** 2
    )
  }
  const ax = p.b[0] - p.a[0], ay = p.b[1] - p.a[1], az = p.b[2] - p.a[2]
  const px = x - p.a[0], py = y - p.a[1], pz = z - p.a[2]
  const len2 = ax * ax + ay * ay + az * az || 1
  const t = Math.max(0, Math.min(1, (px * ax + py * ay + pz * az) / len2))
  const cx = p.a[0] + ax * t, cy = p.a[1] + ay * t, cz = p.a[2] + az * t
  const r = p.ra + (p.rb - p.ra) * t
  const d2 = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2
  return d2 / (r * r || 1)
}

interface Sample { x: number; y: number; z: number; nx: number; ny: number; nz: number }

/** One random surface point, with its exact outward normal. */
function samplePart(p: Part, rand: () => number): Sample {
  if (p.kind === 'ellipsoid') {
    // Uniform direction on the unit sphere.
    const u = rand() * 2 - 1
    const th = rand() * Math.PI * 2
    const s = Math.sqrt(Math.max(0, 1 - u * u))
    const d: Vec3 = [s * Math.cos(th), u, s * Math.sin(th)]

    const local: Vec3 = [d[0] * p.r[0], d[1] * p.r[1], d[2] * p.r[2]]
    // Ellipsoid normal is the gradient of (x/a)² + (y/b)² + (z/c)².
    let n: Vec3 = [local[0] / (p.r[0] * p.r[0]), local[1] / (p.r[1] * p.r[1]), local[2] / (p.r[2] * p.r[2])]

    const world = rotZ(local, p.rot ?? 0)
    n = rotZ(n, p.rot ?? 0)
    const nl = Math.hypot(n[0], n[1], n[2]) || 1

    return {
      x: world[0] + p.c[0], y: world[1] + p.c[1], z: world[2] + p.c[2],
      nx: n[0] / nl, ny: n[1] / nl, nz: n[2] / nl,
    }
  }

  // Capsule: pick a position along the axis, then a direction around it.
  const t = rand()
  const ax = p.b[0] - p.a[0], ay = p.b[1] - p.a[1], az = p.b[2] - p.a[2]
  const alen = Math.hypot(ax, ay, az) || 1
  const ux = ax / alen, uy = ay / alen, uz = az / alen

  // Build a basis perpendicular to the axis.
  const helper: Vec3 = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let e1: Vec3 = [
    uy * helper[2] - uz * helper[1],
    uz * helper[0] - ux * helper[2],
    ux * helper[1] - uy * helper[0],
  ]
  const e1l = Math.hypot(e1[0], e1[1], e1[2]) || 1
  e1 = [e1[0] / e1l, e1[1] / e1l, e1[2] / e1l]
  const e2: Vec3 = [
    uy * e1[2] - uz * e1[1],
    uz * e1[0] - ux * e1[2],
    ux * e1[1] - uy * e1[0],
  ]

  const th = rand() * Math.PI * 2
  const r = p.ra + (p.rb - p.ra) * t
  const cx = p.a[0] + ax * t, cy = p.a[1] + ay * t, cz = p.a[2] + az * t

  const nx = e1[0] * Math.cos(th) + e2[0] * Math.sin(th)
  const ny = e1[1] * Math.cos(th) + e2[1] * Math.sin(th)
  const nz = e1[2] * Math.cos(th) + e2[2] * Math.sin(th)

  return { x: cx + nx * r, y: cy + ny * r, z: cz + nz * r, nx, ny, nz }
}

/**
 * Build one animal as a lit, volumetric point cloud of exactly `count` points.
 *
 * Points are returned in a consistent spatial order across every species, so
 * index i lands in a comparable place on each body — that ordering is what lets
 * the hero morph one animal into the next without the cloud exploding.
 */
export function sampleAnimal(key: AnimalKey, count: number, seed = 1): ShapeData {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const normals = new Float32Array(count * 3)

  if (key === 'orb') {
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const phi = i * golden
      const nx = Math.cos(phi) * r, ny = y, nz = Math.sin(phi) * r
      positions[i * 3] = nx * 2.0; positions[i * 3 + 1] = ny * 2.0; positions[i * 3 + 2] = nz * 2.0
      normals[i * 3] = nx; normals[i * 3 + 1] = ny; normals[i * 3 + 2] = nz
    }
    return { positions, normals }
  }

  const parts = BUILDERS[key]()
  const areas = parts.map(areaOf)
  const total = areas.reduce((a, b) => a + b, 0) || 1

  // Cumulative distribution so denser parts get proportionally more points.
  const cdf: number[] = []
  let acc = 0
  for (const a of areas) { acc += a / total; cdf.push(acc) }

  interface P extends Sample { ang: number; rad: number }
  const pts: P[] = []

  // Sampling is rejection-based (points buried inside a neighbour are dropped),
  // so allow generous attempts rather than looping forever on a tight shape.
  const MAX_ATTEMPTS = count * 12
  let attempts = 0

  while (pts.length < count && attempts < MAX_ATTEMPTS) {
    attempts++
    const u = rand()
    let idx = cdf.findIndex(c => u <= c)
    if (idx < 0) idx = parts.length - 1

    const s = samplePart(parts[idx], rand)

    // Drop points that sit well inside another volume, so joints read as one
    // creature rather than a pile of overlapping balls.
    let buried = false
    for (let j = 0; j < parts.length; j++) {
      if (j === idx) continue
      if (insideness(parts[j], s.x, s.y, s.z) < 0.82) { buried = true; break }
    }
    if (buried) continue

    pts.push({ ...s, ang: Math.atan2(s.y, s.x), rad: Math.hypot(s.x, s.y) })
  }

  // If rejection was unusually harsh, top up without the culling test.
  while (pts.length < count) {
    const u = rand()
    let idx = cdf.findIndex(c => u <= c)
    if (idx < 0) idx = parts.length - 1
    const s = samplePart(parts[idx], rand)
    pts.push({ ...s, ang: Math.atan2(s.y, s.x), rad: Math.hypot(s.x, s.y) })
  }

  // Consistent ordering across species: sweep around the centroid, then outward.
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

/**
 * Resting camera yaw per species, in radians.
 *
 * Every animal is modelled facing −X. A pure side-on view reads as a diagram,
 * so each one is turned to a three-quarter angle that shows both the profile
 * and the depth of the body — the angle a photographer would choose.
 */
export const REST_YAW: Record<AnimalKey, number> = {
  dog: 0.55,
  cat: 0.5,
  bird: 0.65,
  rabbit: 0.45,
  fish: 0.3,
  orb: 0,
}
