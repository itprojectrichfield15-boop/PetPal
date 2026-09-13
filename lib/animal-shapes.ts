/**
 * Breed-specific animal point clouds, built from a blended signed distance
 * field.
 *
 * ── Why this was rebuilt (third time) ───────────────────────────────────────
 * v1 scattered points through a flat slab — cardboard.
 * v2 inflated a 2D silhouette — round, but still a drawing pushed into 3D.
 * v3 unioned 3D ellipsoids and capsules — correct from every angle, but the
 *    parts were HARD-CULLED where they overlapped, so joints showed visible
 *    seams and the result read as a bag of balls rather than one creature.
 *
 * This version treats each animal as a SIGNED DISTANCE FIELD. Every part
 * contributes a distance function, and the parts are combined with a smooth
 * minimum, which fuses them into a single organic surface — shoulders flow into
 * the neck, the muzzle grows out of the skull. Points are then projected onto
 * that fused isosurface by a few Newton steps along the gradient, and the
 * normal is the gradient itself, so lighting is exact.
 *
 * ── Specific breeds, not generic animals ───────────────────────────────────
 * A "generic dog" is nobody's dog. Each species is now one committed breed,
 * modelled to its actual distinguishing features:
 *
 *   Beagle           drop ears to the jawline, square muzzle, domed skull,
 *                    stocky build, tail carried high
 *   Maine Coon       rectangular body, neck ruff, ear tufts, huge bushy tail
 *   Cockatiel        swept-back crest, round head, slim body, long pointed tail
 *   Holland Lop      compact round body, flat face, ears hanging BESIDE the head
 *   Betta splendens  deep body with enormous flowing caudal, dorsal and anal fins
 *
 * Two of these are already named in the app's own copy — Biscuit the beagle and
 * Luna the Maine Coon — so the 3D matches the story the site tells.
 *
 * Convention: every animal faces −X, stands on −Y, symmetric in ±Z.
 */

export type AnimalKey = 'dog' | 'cat' | 'bird' | 'rabbit' | 'fish' | 'orb'

export interface ShapeData {
  positions: Float32Array
  normals: Float32Array
}

type Vec3 = [number, number, number]

/* ────────────────────────────────────────────────────────────────────────────
   Parts
   ──────────────────────────────────────────────────────────────────────────── */

interface Ellipsoid {
  kind: 'e'
  c: Vec3
  r: Vec3
  /** Rotation about Z, degrees. */
  rot?: number
  /** Blend radius override — smaller keeps an edge crisp (fins, ear tips). */
  k?: number
}

interface Cone {
  kind: 'c'
  a: Vec3
  b: Vec3
  ra: number
  rb: number
  k?: number
}

type Part = Ellipsoid | Cone

const E = (c: Vec3, r: Vec3, rot = 0, k?: number): Ellipsoid => ({ kind: 'e', c, r, rot, k })
const C = (a: Vec3, ra: number, b: Vec3, rb: number, k?: number): Cone => ({ kind: 'c', a, b, ra, rb, k })

/** Mirror across Z so limbs, ears and fins come in pairs. */
function pair(p: Part): Part[] {
  if (p.kind === 'e') return [p, { ...p, c: [p.c[0], p.c[1], -p.c[2]] as Vec3 }]
  return [p, { ...p, a: [p.a[0], p.a[1], -p.a[2]] as Vec3, b: [p.b[0], p.b[1], -p.b[2]] as Vec3 }]
}

/** Default smoothing between parts. Larger fuses more; too large melts detail. */
const BLEND = 0.16

/* ────────────────────────────────────────────────────────────────────────────
   The breeds
   ──────────────────────────────────────────────────────────────────────────── */

const BUILDERS: Record<Exclude<AnimalKey, 'orb'>, () => Part[]> = {
  /**
   * BEAGLE, sitting. Distinguishing features modelled deliberately:
   * long drop ears reaching the jawline, a square blocky muzzle, a domed
   * skull with a defined stop, a stocky barrel chest, short sturdy legs, and
   * the characteristic upright tail.
   */
  dog: () => [
    // torso: chest deeper than loin, croup rising to the tail
    E([0.16, 0.02, 0], [0.80, 0.82, 0.66]),                    // barrel chest
    E([0.72, -0.10, 0], [0.66, 0.70, 0.58]),                   // ribcage
    E([1.18, -0.30, 0], [0.60, 0.62, 0.52]),                   // loin
    E([1.52, -0.18, 0], [0.46, 0.48, 0.44]),                   // croup
    ...pair(E([1.28, -0.72, 0.36], [0.46, 0.50, 0.28])),       // haunches

    // neck: thick, set low — a beagle carries its head forward
    C([-0.30, 0.72, 0], 0.30, [0.22, 0.18, 0], 0.46),

    // head: domed skull, pronounced stop, square muzzle
    E([-0.66, 1.14, 0], [0.42, 0.42, 0.40]),                   // cranium
    E([-0.90, 1.02, 0], [0.30, 0.28, 0.32]),                   // stop / cheeks
    E([-1.30, 0.92, 0], [0.40, 0.26, 0.26]),                   // square muzzle
    E([-1.66, 0.94, 0], [0.13, 0.12, 0.13], 0, 0.05),          // nose leather

    // the beagle signature: long drop ears hanging to the jawline
    ...pair(E([-0.74, 0.92, 0.34], [0.20, 0.44, 0.10], 8, 0.07)),
    ...pair(E([-0.80, 0.52, 0.30], [0.17, 0.24, 0.08], 4, 0.07)), // rounded ear tip

    // short sturdy legs, upper and lower so the elbow and hock read
    ...pair(C([-0.02, -0.34, 0.34], 0.21, [-0.12, -1.02, 0.36], 0.15)),
    ...pair(C([-0.12, -1.02, 0.36], 0.15, [-0.16, -1.56, 0.36], 0.12)),
    ...pair(E([-0.24, -1.66, 0.36], [0.24, 0.12, 0.18], 0, 0.08)),
    ...pair(C([1.24, -1.02, 0.40], 0.18, [1.06, -1.56, 0.42], 0.12)),
    ...pair(E([0.98, -1.66, 0.42], [0.26, 0.12, 0.19], 0, 0.08)),

    // tail carried high, white tip
    C([1.80, 0.02, 0], 0.15, [2.06, 0.62, 0], 0.11),
    C([2.06, 0.62, 0], 0.11, [2.10, 1.06, 0], 0.08),
  ],

  /**
   * MAINE COON, sitting. Rectangular substantial body, a pronounced neck ruff,
   * a large squarish head with high cheekbones, tall tufted ears, and the
   * breed's most obvious feature — an enormous bushy tail.
   */
  cat: () => [
    E([0.22, -0.06, 0], [0.66, 0.80, 0.54]),                   // chest, upright
    E([0.78, -0.30, 0], [0.62, 0.68, 0.54]),                   // long rectangular body
    E([1.24, -0.52, 0], [0.58, 0.60, 0.50]),                   // rear
    ...pair(E([1.16, -0.92, 0.34], [0.44, 0.44, 0.26])),       // haunches

    C([-0.16, 0.74, 0], 0.26, [0.20, 0.10, 0], 0.40),          // neck
    E([-0.20, 0.60, 0], [0.50, 0.36, 0.46], 0, 0.22),          // RUFF — breed marker

    E([-0.60, 1.24, 0], [0.46, 0.44, 0.44]),                   // large square skull
    E([-0.88, 1.10, 0], [0.30, 0.26, 0.30]),                   // high cheekbones
    E([-1.10, 1.02, 0], [0.24, 0.19, 0.21]),                   // squared muzzle
    E([-1.28, 1.06, 0], [0.08, 0.07, 0.08], 0, 0.04),          // nose

    // tall wide-set ears with lynx tufts
    ...pair(C([-0.62, 1.56, 0.26], 0.20, [-0.72, 2.10, 0.34], 0.05, 0.08)),
    ...pair(C([-0.72, 2.10, 0.34], 0.05, [-0.80, 2.34, 0.38], 0.015, 0.03)), // tuft

    ...pair(C([-0.02, -0.46, 0.26], 0.16, [-0.10, -1.54, 0.28], 0.12)),
    ...pair(E([-0.20, -1.64, 0.28], [0.22, 0.11, 0.17], 0, 0.08)),
    ...pair(E([1.14, -1.58, 0.36], [0.28, 0.12, 0.20], 0, 0.08)),

    // the tail: as long as the body and very thick with fur
    C([1.70, -0.66, 0], 0.26, [2.12, 0.10, 0], 0.30),
    C([2.12, 0.10, 0], 0.30, [2.02, 0.84, 0], 0.26),
    C([2.02, 0.84, 0], 0.26, [1.66, 1.32, 0], 0.18),
  ],

  /**
   * COCKATIEL, perched. The crest is the whole silhouette — a slim swept-back
   * plume that no other common pet bird has. Slim body, long pointed tail,
   * round cheeks.
   */
  bird: () => [
    E([0.18, -0.06, 0], [0.62, 0.66, 0.52], -10),              // slim body
    E([0.58, 0.16, 0], [0.46, 0.46, 0.42]),                    // shoulders
    ...pair(E([0.34, -0.04, 0.44], [0.58, 0.40, 0.10], -14, 0.08)), // folded wings

    // long tapering pointed tail
    C([0.92, -0.02, 0], 0.24, [1.72, -0.34, 0], 0.14),
    C([1.72, -0.34, 0], 0.14, [2.30, -0.62, 0], 0.05, 0.06),

    C([-0.28, 0.48, 0], 0.20, [0.04, 0.18, 0], 0.30),          // slim neck
    E([-0.56, 0.86, 0], [0.38, 0.38, 0.36]),                   // round head
    ...pair(E([-0.66, 0.74, 0.30], [0.13, 0.13, 0.05], 0, 0.05)), // cheek patch
    E([-0.88, 0.74, 0], [0.17, 0.14, 0.13]),                   // small curved beak
    E([-1.00, 0.70, 0], [0.08, 0.09, 0.07], 20, 0.04),

    // THE CREST — three swept plumes of decreasing size
    C([-0.58, 1.18, 0], 0.11, [-0.34, 1.86, 0], 0.035, 0.05),
    C([-0.46, 1.16, 0.07], 0.09, [-0.14, 1.72, 0.10], 0.03, 0.05),
    C([-0.46, 1.16, -0.07], 0.09, [-0.14, 1.72, -0.10], 0.03, 0.05),

    ...pair(C([0.14, -0.62, 0.16], 0.07, [0.10, -1.28, 0.18], 0.05, 0.05)),
    ...pair(E([0.04, -1.36, 0.18], [0.18, 0.05, 0.12], 0, 0.05)),
  ],

  /**
   * HOLLAND LOP, sitting. The lop ear is the defining feature — it hangs
   * BESIDE the head rather than standing up, which instantly separates this
   * from every other rabbit. Compact cobby body, flat brachycephalic face.
   */
  rabbit: () => [
    E([0.34, -0.28, 0], [0.66, 0.64, 0.56]),                   // compact chest
    E([0.94, -0.42, 0], [0.74, 0.72, 0.62]),                   // round cobby body
    ...pair(E([0.92, -0.86, 0.38], [0.50, 0.44, 0.28])),       // haunches
    E([1.60, -0.44, 0], [0.24, 0.24, 0.22], 0, 0.12),          // small cotton tail

    C([-0.06, 0.34, 0], 0.30, [0.26, -0.04, 0], 0.42),         // very short neck
    E([-0.44, 0.80, 0], [0.46, 0.44, 0.44]),                   // large round head
    E([-0.76, 0.68, 0], [0.26, 0.24, 0.26]),                   // flat short face
    E([-0.92, 0.66, 0], [0.11, 0.11, 0.13], 0, 0.05),          // nose

    // LOP EARS — wide, hanging down the sides of the head, not upright
    ...pair(E([-0.42, 0.52, 0.44], [0.17, 0.44, 0.09], -6, 0.07)),
    ...pair(E([-0.40, 0.10, 0.46], [0.15, 0.22, 0.08], -4, 0.07)),   // rounded tip

    ...pair(C([0.02, -0.62, 0.26], 0.15, [-0.04, -1.36, 0.28], 0.12)),
    ...pair(E([-0.14, -1.44, 0.28], [0.19, 0.11, 0.15], 0, 0.08)),
    ...pair(E([0.78, -1.40, 0.40], [0.38, 0.13, 0.22], 0, 0.08)),    // long hind feet
  ],

  /**
   * BETTA SPLENDENS, swimming. A halfmoon betta is almost entirely fin — the
   * caudal spreads to a huge fan, the dorsal is a tall sail and the anal fin
   * sweeps the whole underside. Fins use a tight blend radius so their edges
   * stay sharp instead of melting into the body.
   */
  fish: () => [
    E([-0.20, 0, 0], [0.86, 0.66, 0.44]),                      // deep body
    E([-0.94, 0.06, 0], [0.44, 0.46, 0.36]),                   // head
    E([-1.26, 0.02, 0], [0.22, 0.28, 0.24]),                   // snout / mouth
    ...pair(E([-0.96, -0.04, 0.28], [0.20, 0.26, 0.06], 0, 0.05)), // gill plate
    E([0.48, -0.02, 0], [0.34, 0.36, 0.26]),                   // caudal peduncle

    // huge halfmoon caudal fan, built from overlapping thin lobes
    E([1.10, 0.52, 0], [0.60, 0.48, 0.045], -34, 0.05),
    E([1.22, 0.00, 0], [0.70, 0.36, 0.045], 0, 0.05),
    E([1.10, -0.52, 0], [0.60, 0.48, 0.045], 34, 0.05),

    // tall dorsal sail
    E([-0.10, 0.86, 0], [0.62, 0.52, 0.04], -8, 0.05),
    E([0.36, 0.74, 0], [0.36, 0.38, 0.04], -18, 0.05),

    // long flowing anal fin along the underside
    E([-0.16, -0.80, 0], [0.72, 0.42, 0.04], 6, 0.05),
    E([0.42, -0.78, 0], [0.40, 0.36, 0.04], 16, 0.05),

    // trailing ventral filaments
    ...pair(C([-0.78, -0.48, 0.10], 0.07, [-0.72, -1.22, 0.14], 0.025, 0.04)),
    E([-1.04, 0.16, 0.30], [0.11, 0.11, 0.05], 0, 0.04),       // eye
    E([-1.04, 0.16, -0.30], [0.11, 0.11, 0.05], 0, 0.04),
  ],
}

/* ────────────────────────────────────────────────────────────────────────────
   Signed distance field
   ──────────────────────────────────────────────────────────────────────────── */

function rotZ(x: number, y: number, deg: number): [number, number] {
  if (!deg) return [x, y]
  const a = (deg * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return [x * c - y * s, x * s + y * c]
}

/** Approximate signed distance to an ellipsoid (Inigo Quilez). */
function sdEllipsoid(px: number, py: number, pz: number, p: Ellipsoid): number {
  let x = px - p.c[0], y = py - p.c[1]
  const z = pz - p.c[2]
  if (p.rot) [x, y] = rotZ(x, y, -p.rot)
  const [rx, ry, rz] = p.r
  const k0 = Math.hypot(x / rx, y / ry, z / rz)
  if (k0 === 0) return -Math.min(rx, ry, rz)
  const k1 = Math.hypot(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  if (k1 === 0) return -Math.min(rx, ry, rz)
  return (k0 * (k0 - 1)) / k1
}

/** Exact signed distance to a tapered round cone (Inigo Quilez). */
function sdRoundCone(px: number, py: number, pz: number, p: Cone): number {
  const bax = p.b[0] - p.a[0], bay = p.b[1] - p.a[1], baz = p.b[2] - p.a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = p.ra - p.rb
  const a2 = l2 - rr * rr
  const il2 = 1 / (l2 || 1e-6)

  const pax = px - p.a[0], pay = py - p.a[1], paz = pz - p.a[2]
  const y = pax * bax + pay * bay + paz * baz
  const z = y - l2

  const xpx = pax * l2 - bax * y
  const xpy = pay * l2 - bay * y
  const xpz = paz * l2 - baz * y
  const x2 = xpx * xpx + xpy * xpy + xpz * xpz
  const y2 = y * y * l2
  const z2 = z * z * l2

  const k = Math.sign(rr) * rr * rr * x2
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.rb
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.ra
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - p.ra
}

function sdPart(x: number, y: number, z: number, p: Part): number {
  return p.kind === 'e' ? sdEllipsoid(x, y, z, p) : sdRoundCone(x, y, z, p)
}

/** Polynomial smooth minimum — this is what fuses the parts into one body. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}

/** Centre and bounding radius per part, so the field can skip distant parts. */
interface Bound { cx: number; cy: number; cz: number; r: number }

function boundOf(p: Part): Bound {
  if (p.kind === 'e') {
    return { cx: p.c[0], cy: p.c[1], cz: p.c[2], r: Math.max(p.r[0], p.r[1], p.r[2]) }
  }
  return {
    cx: (p.a[0] + p.b[0]) / 2,
    cy: (p.a[1] + p.b[1]) / 2,
    cz: (p.a[2] + p.b[2]) / 2,
    r: Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]) / 2 + Math.max(p.ra, p.rb),
  }
}

/**
 * Build an evaluator for one animal.
 *
 * Parts further away than their bounding radius plus a margin cannot influence
 * the smooth minimum, so they are skipped. With ~30 parts only a handful are
 * ever relevant at a given point, which is what keeps this fast enough to run
 * at startup for five animals.
 */
function makeField(parts: Part[]) {
  const bounds = parts.map(boundOf)

  function field(x: number, y: number, z: number): number {
    let d = 1e9
    for (let i = 0; i < parts.length; i++) {
      const b = bounds[i]
      const k = parts[i].k ?? BLEND
      const dx = x - b.cx, dy = y - b.cy, dz = z - b.cz
      // Cheap reject: too far to affect the blend.
      if (dx * dx + dy * dy + dz * dz > (b.r + k + 0.45) ** 2) continue
      const di = sdPart(x, y, z, parts[i])
      d = d === 1e9 ? di : smin(d, di, k)
    }
    return d === 1e9 ? 1 : d
  }

  /** Gradient by four-tap tetrahedral sampling — half the cost of central differences. */
  const H = 0.0035
  function gradient(x: number, y: number, z: number): Vec3 {
    const a = field(x + H, y - H, z - H)
    const b = field(x - H, y - H, z + H)
    const c = field(x - H, y + H, z - H)
    const d = field(x + H, y + H, z + H)
    let gx = a - b - c + d
    let gy = -a - b + c + d
    let gz = -a + b - c + d
    const l = Math.hypot(gx, gy, gz) || 1
    gx /= l; gy /= l; gz /= l
    return [gx, gy, gz]
  }

  return { field, gradient }
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

function areaOf(p: Part): number {
  if (p.kind === 'e') {
    const [a, b, c] = p.r
    const k = 1.6075
    return 4 * Math.PI * Math.pow((Math.pow(a * b, k) + Math.pow(a * c, k) + Math.pow(b * c, k)) / 3, 1 / k)
  }
  const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2])
  const rm = (p.ra + p.rb) / 2
  return 2 * Math.PI * rm * len + 4 * Math.PI * rm * rm
}

/** A starting point on one part's own surface — a good initial guess. */
function seedPoint(p: Part, rand: () => number): Vec3 {
  if (p.kind === 'e') {
    const u = rand() * 2 - 1
    const th = rand() * Math.PI * 2
    const s = Math.sqrt(Math.max(0, 1 - u * u))
    let lx = s * Math.cos(th) * p.r[0]
    let ly = u * p.r[1]
    const lz = s * Math.sin(th) * p.r[2]
    if (p.rot) [lx, ly] = rotZ(lx, ly, p.rot)
    return [lx + p.c[0], ly + p.c[1], lz + p.c[2]]
  }

  const t = rand()
  const ax = p.b[0] - p.a[0], ay = p.b[1] - p.a[1], az = p.b[2] - p.a[2]
  const alen = Math.hypot(ax, ay, az) || 1
  const ux = ax / alen, uy = ay / alen, uz = az / alen
  const helper: Vec3 = Math.abs(uy) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  let e1: Vec3 = [uy * helper[2] - uz * helper[1], uz * helper[0] - ux * helper[2], ux * helper[1] - uy * helper[0]]
  const e1l = Math.hypot(e1[0], e1[1], e1[2]) || 1
  e1 = [e1[0] / e1l, e1[1] / e1l, e1[2] / e1l]
  const e2: Vec3 = [uy * e1[2] - uz * e1[1], uz * e1[0] - ux * e1[2], ux * e1[1] - uy * e1[0]]
  const th = rand() * Math.PI * 2
  const r = p.ra + (p.rb - p.ra) * t
  const ct = Math.cos(th), st = Math.sin(th)
  return [
    p.a[0] + ax * t + (e1[0] * ct + e2[0] * st) * r,
    p.a[1] + ay * t + (e1[1] * ct + e2[1] * st) * r,
    p.a[2] + az * t + (e1[2] * ct + e2[2] * st) * r,
  ]
}

/**
 * Build one animal as a lit point cloud of exactly `count` points, sampled on
 * the fused isosurface.
 *
 * Points come back in a consistent spatial order across every species, so index
 * i lands in a comparable place on each body — that ordering is what lets the
 * hero morph one animal into the next coherently.
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
      positions[i * 3] = nx * 2; positions[i * 3 + 1] = ny * 2; positions[i * 3 + 2] = nz * 2
      normals[i * 3] = nx; normals[i * 3 + 1] = ny; normals[i * 3 + 2] = nz
    }
    return { positions, normals }
  }

  const parts = BUILDERS[key]()
  const { field, gradient } = makeField(parts)

  const areas = parts.map(areaOf)
  const total = areas.reduce((a, b) => a + b, 0) || 1
  const cdf: number[] = []
  let acc = 0
  for (const a of areas) { acc += a / total; cdf.push(acc) }

  interface P { x: number; y: number; z: number; nx: number; ny: number; nz: number; ang: number; rad: number }
  const pts: P[] = []

  const PROJECT_STEPS = 4
  const TOLERANCE = 0.012
  const MAX_ATTEMPTS = count * 6
  let attempts = 0

  while (pts.length < count && attempts < MAX_ATTEMPTS) {
    attempts++

    const u = rand()
    let idx = 0
    while (idx < cdf.length - 1 && u > cdf[idx]) idx++

    let [x, y, z] = seedPoint(parts[idx], rand)

    // Project onto the fused isosurface. The seed already sits on one part's
    // own surface, so a handful of Newton steps is plenty.
    let d = 0
    for (let s = 0; s < PROJECT_STEPS; s++) {
      d = field(x, y, z)
      if (Math.abs(d) < TOLERANCE * 0.5) break
      const [gx, gy, gz] = gradient(x, y, z)
      x -= gx * d; y -= gy * d; z -= gz * d
    }

    // Reject anything that didn't converge — usually a seed deep inside the
    // fused body, where its own part is no longer the surface.
    d = field(x, y, z)
    if (Math.abs(d) > TOLERANCE) continue

    const [nx, ny, nz] = gradient(x, y, z)
    pts.push({ x, y, z, nx, ny, nz, ang: Math.atan2(y, x), rad: Math.hypot(x, y) })
  }

  // Top up by duplicating with a tiny jitter if convergence was unusually poor,
  // so the buffer is always exactly `count` long and the morph stays aligned.
  while (pts.length < count && pts.length > 0) {
    const src = pts[Math.floor(rand() * pts.length)]
    pts.push({ ...src, x: src.x + (rand() - 0.5) * 0.01, y: src.y + (rand() - 0.5) * 0.01 })
  }

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

export const MORPH_SEQUENCE: AnimalKey[] = ['dog', 'cat', 'bird', 'rabbit', 'fish']

/** The specific breed each shape represents, used in copy and alt text. */
export const ANIMAL_LABELS: Record<AnimalKey, string> = {
  dog: 'Beagle',
  cat: 'Maine Coon',
  bird: 'Cockatiel',
  rabbit: 'Holland Lop',
  fish: 'Betta',
  orb: 'Every pet',
}

/**
 * Resting camera yaw per species, in radians.
 *
 * Every animal is modelled facing −X. A pure side-on view reads as a diagram,
 * so each is turned to the angle that best shows its defining feature: enough
 * three-quarter on the beagle to see both drop ears, nearly side-on for the
 * betta so the fins spread across the frame.
 */
export const REST_YAW: Record<AnimalKey, number> = {
  dog: 0.58,
  cat: 0.52,
  bird: 0.62,
  rabbit: 0.60,
  fish: 0.18,
  orb: 0,
}
