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
 *   Dutch Rabbit     upright sitting pose, heavy haunches, tall upright ears
 *   Ocellaris Clown  deep oval body, blunt head, notched dorsal, rounded tail fan
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
  /**
   * Coat markings, one signed value per point.
   *
   *   −1  darkest marking (a beagle's saddle, a clownfish's bar edging)
   *    0  the base coat
   *   +1  lightest marking (white blaze, white bar, white chest)
   *
   * This exists because geometry alone hit a ceiling. A point cloud can't
   * render fur or scales, so shape was carrying the entire burden of making an
   * animal recognisable — and shape is not actually how people recognise most
   * of these. A beagle is a tricolour dog, a Dutch rabbit is *defined* by the
   * white band round its shoulders, and a clownfish is three white bars. Those
   * markings are the identifying feature, and unlike fur they cost nothing to
   * render: one float per point, read straight into the fragment shader.
   */
  tones: Float32Array
  /**
   * Baked ambient occlusion, one value per point. 1 = fully open, 0 = deeply
   * occluded (an armpit, the inside of an ear, where the tail meets the rump).
   *
   * This is the difference between a cloud of lit dots and something that
   * looks like it has volume. Without it every point is lit as if floating
   * alone in space, so creases and joins glow exactly as brightly as an
   * exposed flank and the whole form goes flat. It is computed from the
   * distance field itself — march a short way along the normal and compare how
   * much free space there actually is against how much there would be in the
   * open — so it costs nothing at render time.
   */
  ao: Float32Array
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
  /**
   * Sampling weight multiplier.
   *
   * Points are distributed by surface AREA, which starves thin flat features:
   * a fish’s caudal fin is a sheet 0.05 units thick, so by area it deserves
   * almost no particles — and the fish rendered as a body with no fins. Ears,
   * crests and fins boost this so the features that actually identify the
   * animal get the density they need to read.
   */
  w?: number
}

interface Cone {
  kind: 'c'
  a: Vec3
  b: Vec3
  ra: number
  rb: number
  k?: number
  w?: number
}

type Part = Ellipsoid | Cone

const E = (c: Vec3, r: Vec3, rot = 0, k?: number, w?: number): Ellipsoid => ({ kind: 'e', c, r, rot, k, w })
const C = (a: Vec3, ra: number, b: Vec3, rb: number, k?: number, w?: number): Cone => ({ kind: 'c', a, b, ra, rb, k, w })

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
   * BEAGLE, standing square in the breed-standard pose.
   *
   * ── What was wrong before ──────────────────────────────────────────────────
   * The old beagle read as a barrel with a lump on one end, and the two causes
   * are worth naming because they apply to every mammal here.
   *
   * FIRST, it had no face. No eyes, no nose, no chin — and a creature without
   * eyes does not read as alive no matter how good its outline is. Eyes are now
   * modelled as geometry AND marked near-black, which is what makes them read
   * at a glance.
   *
   * SECOND, everything was blended at the default 0.16. That radius is right
   * for fusing a ribcage into a loin, but applied to a muzzle it dissolves the
   * stop, and applied to a shoulder it swallows the leg. The head and legs now
   * carry their own much tighter blends, so the muzzle stays square, the
   * cheeks stay separate from the skull, and each leg reads as a limb rather
   * than as a taper off the body.
   *
   * ── Breed features, deliberately ───────────────────────────────────────────
   * Square blunt muzzle roughly the length of the skull; domed skull with a
   * defined stop; large round eyes set well apart for the pleading expression;
   * long low-set round-tipped ears that reach past the muzzle; a level topline;
   * a chest dropping to the elbow with legs the same length again; and the
   * "stern" — the tail carried high with a slight forward curve and a white tip.
   */
  dog: () => [
    // ── Torso: level topline, deep chest, slight tuck-up at the loin ──
    E([-0.15, 0.20, 0], [0.60, 0.60, 0.46]),                   // withers
    E([-0.18, -0.08, 0], [0.68, 0.62, 0.45]),                  // deep chest to the elbow
    E([0.50, 0.02, 0], [0.62, 0.58, 0.45]),                    // ribcage
    E([1.05, 0.04, 0], [0.48, 0.48, 0.38]),                    // loin, tucked
    E([1.45, 0.08, 0], [0.42, 0.44, 0.38]),                    // croup

    // Neck: medium, slightly arched, flowing into the shoulder.
    C([-0.62, 0.86, 0], 0.30, [-0.12, 0.36, 0], 0.44, 0.13),

    // ── Head. Tight blends throughout so the stop and muzzle survive. ──
    E([-0.98, 1.12, 0], [0.32, 0.31, 0.30], 0, 0.09),          // domed skull
    E([-1.18, 1.00, 0], [0.23, 0.23, 0.25], 0, 0.07),          // stop and cheeks
    E([-1.48, 0.92, 0], [0.28, 0.185, 0.195], 0, 0.06),        // square muzzle
    E([-1.45, 0.79, 0], [0.24, 0.12, 0.17], 0, 0.05),          // flews / lower jaw
    E([-1.76, 0.94, 0], [0.11, 0.11, 0.12], 0, 0.035),         // nose leather

    // Eyes. Small geometry, but marked near-black — see MARKINGS.dog. Set
    // forward of the ear so the ear leather never covers them at any yaw.
    ...pair(E([-1.26, 1.10, 0.19], [0.105, 0.105, 0.085], 0, 0.02, 2.2)),

    // The beagle signature: long low-set ears hanging past the muzzle line.
    // Set back onto the side of the skull, not over the cheek.
    ...pair(E([-0.94, 0.82, 0.29], [0.17, 0.42, 0.085], 6, 0.05, 3.0)),
    ...pair(E([-1.02, 0.36, 0.27], [0.16, 0.24, 0.075], 3, 0.04, 3.0)),  // round tip

    // ── Legs. Two segments each plus a paw, so elbow, stifle and hock read. ──
    ...pair(C([-0.22, -0.30, 0.30], 0.19, [-0.14, -0.95, 0.32], 0.135, 0.09)),
    ...pair(C([-0.14, -0.95, 0.32], 0.135, [-0.12, -1.62, 0.32], 0.105, 0.06)),
    ...pair(E([-0.18, -1.70, 0.32], [0.20, 0.10, 0.15], 0, 0.05)),

    ...pair(E([1.34, -0.42, 0.30], [0.38, 0.44, 0.26], 0, 0.11)),        // thigh
    ...pair(C([1.30, -0.78, 0.30], 0.19, [1.46, -1.30, 0.31], 0.115, 0.08)),
    ...pair(C([1.46, -1.30, 0.31], 0.115, [1.30, -1.64, 0.31], 0.10, 0.06)),
    ...pair(E([1.24, -1.70, 0.31], [0.20, 0.10, 0.15], 0, 0.05)),

    // The stern: carried high with a slight forward curve, white at the tip.
    C([1.78, 0.36, 0], 0.15, [2.02, 0.92, 0], 0.11, 0.09),
    C([2.02, 0.92, 0], 0.11, [2.00, 1.32, 0], 0.075, 0.06),
  ],

  /**
   * MAINE COON, sitting. Rectangular substantial body, a pronounced neck ruff,
   * a large squarish head with high cheekbones, tall tufted ears, and the
   * breed's most obvious feature — an enormous bushy tail.
   */
  cat: () => [
    // ── Sitting upright: haunches on the ground, chest stacked above. ──
    E([0.85, -1.10, 0], [0.72, 0.60, 0.52]),                   // rear on the ground
    ...pair(E([0.62, -0.95, 0.40], [0.52, 0.46, 0.26], 0, 0.13)), // britches
    E([0.34, -0.62, 0], [0.52, 0.60, 0.44]),                   // belly
    E([-0.02, 0.10, 0], [0.46, 0.66, 0.42]),                   // upright chest
    E([-0.10, 0.62, 0], [0.44, 0.40, 0.42], 0, 0.13),          // shoulders

    // THE RUFF — the breed marker. A broad soft collar, blended wide on
    // purpose: this is the one place where melting into the neighbours is
    // the correct look.
    E([-0.28, 0.78, 0], [0.52, 0.34, 0.50], 0, 0.20),

    C([-0.44, 1.12, 0], 0.26, [-0.14, 0.72, 0], 0.36, 0.12),   // heavy neck

    // ── Head. Square and substantial, with every part kept distinct. ──
    E([-0.64, 1.46, 0], [0.42, 0.39, 0.40], 0, 0.10),          // large square skull
    ...pair(E([-0.78, 1.30, 0.24], [0.28, 0.25, 0.21], 0, 0.09)), // high cheekbones
    E([-1.04, 1.24, 0], [0.26, 0.20, 0.23], 0, 0.07),          // squared muzzle
    E([-1.08, 1.09, 0], [0.16, 0.115, 0.15], 0, 0.05),         // strong chin
    E([-1.26, 1.26, 0], [0.08, 0.075, 0.085], 0, 0.03),        // nose

    // Eyes. Large and set wide — see MARKINGS.cat, which darkens them.
    ...pair(E([-0.90, 1.50, 0.25], [0.105, 0.10, 0.085], 0, 0.02, 2.2)),

    // Ears: large, wide at the base, tall, set high — with the lynx tufts that
    // are the other half of the breed's signature.
    ...pair(C([-0.54, 1.74, 0.26], 0.24, [-0.64, 2.32, 0.36], 0.055, 0.05, 2.2)),
    ...pair(C([-0.64, 2.32, 0.36], 0.05, [-0.74, 2.62, 0.42], 0.015, 0.025, 4.5)),

    // Forelegs straight down at the FRONT of the chest. They used to sit under
    // the belly, where the torso simply swallowed them and the cat's front
    // read as a featureless wall.
    ...pair(C([-0.36, -0.30, 0.24], 0.16, [-0.42, -1.22, 0.26], 0.13, 0.07)),
    ...pair(C([-0.42, -1.22, 0.26], 0.13, [-0.44, -1.62, 0.26], 0.12, 0.06)),
    ...pair(E([-0.52, -1.70, 0.26], [0.20, 0.10, 0.16], 0, 0.05)),
    ...pair(E([0.62, -1.66, 0.42], [0.26, 0.11, 0.17], 0, 0.06)),  // hind paws

    // THE TAIL — as long as the cat and heavily plumed, sweeping round the
    // haunches and up. Drawn as a curve of four segments rather than a cone,
    // because a straight tail on a sitting cat looks like a stick.
    C([1.30, -1.42, 0.10], 0.19, [1.80, -1.14, 0.15], 0.23, 0.10),
    C([1.80, -1.14, 0.15], 0.23, [1.96, -0.34, 0.13], 0.25, 0.10),
    C([1.96, -0.34, 0.13], 0.25, [1.84, 0.46, 0.09], 0.21, 0.10),
    C([1.84, 0.46, 0.09], 0.21, [1.54, 0.98, 0.06], 0.135, 0.08),
  ],

  /**
   * COCKATIEL, perched.
   *
   * The previous bird was two overlapping spheres and read as a beach ball
   * with a stub on the back. Two things were wrong, and both are proportion
   * rather than detail.
   *
   * The BODY was as deep as it was long. A cockatiel is a slim bird — the body
   * is an elongated egg tilted back from the shoulders, not a sphere — so it is
   * now built from four smaller sections along that axis instead of two big
   * round ones.
   *
   * The TAIL was far too short. A cockatiel's tail is close to half the bird's
   * total length, long and sharply pointed, and it is the second thing after
   * the crest that identifies the species. It now runs nearly as long as the
   * body it hangs off.
   */
  bird: () => [
    // ── Body: an elongated egg along the perching axis. ──
    E([-0.18, -0.18, 0], [0.40, 0.46, 0.38], 0, 0.13),         // breast
    E([0.24, -0.02, 0], [0.44, 0.44, 0.38], 0, 0.13),          // mid body
    E([0.68, 0.10, 0], [0.38, 0.36, 0.33], 0, 0.12),           // back and rump
    E([1.02, 0.02, 0], [0.26, 0.24, 0.22], 0, 0.10),           // vent, tail base

    // Folded wings: long narrow sheets down the flanks, tips at the tail base.
    ...pair(E([0.30, 0.00, 0.34], [0.62, 0.30, 0.075], -12, 0.05, 2.4)),

    // THE TAIL — long and sharply pointed, angled down and back.
    C([1.16, -0.04, 0], 0.17, [1.90, -0.42, 0], 0.10, 0.07, 2.0),
    C([1.90, -0.42, 0], 0.10, [2.58, -0.78, 0], 0.035, 0.05, 3.0),

    C([-0.42, 0.46, 0], 0.19, [-0.16, 0.10, 0], 0.28, 0.10),   // slim neck
    E([-0.58, 0.80, 0], [0.31, 0.30, 0.29], 0, 0.09),          // round head
    ...pair(E([-0.68, 0.70, 0.24], [0.115, 0.115, 0.045], 0, 0.04, 1.4)), // cheek patch
    E([-0.84, 0.68, 0], [0.14, 0.13, 0.12], 0, 0.05),          // small curved beak
    E([-0.94, 0.60, 0], [0.07, 0.08, 0.065], 25, 0.03),
    // Eye. A cockatiel's is large and dark against the lemon face, which is
    // most of what gives the bird an expression at this scale.
    ...pair(E([-0.72, 0.90, 0.22], [0.075, 0.075, 0.06], 0, 0.02, 2.2)),

    // THE CREST — swept-back plumes, the one feature no other common pet bird
    // has. Heavily weighted because they are thin and would otherwise vanish.
    C([-0.74, 1.00, 0], 0.07, [-0.56, 1.46, 0], 0.022, 0.04, 3.6),
    C([-0.66, 1.06, 0], 0.10, [-0.30, 1.82, 0], 0.030, 0.045, 3.6),
    C([-0.56, 1.06, 0.07], 0.085, [-0.12, 1.66, 0.09], 0.026, 0.045, 3.6),
    C([-0.56, 1.06, -0.07], 0.085, [-0.12, 1.66, -0.09], 0.026, 0.045, 3.6),

    // Perching legs and toes.
    ...pair(C([0.08, -0.58, 0.14], 0.065, [0.02, -1.06, 0.16], 0.05, 0.04, 1.8)),
    ...pair(E([-0.04, -1.12, 0.16], [0.16, 0.045, 0.10], 0, 0.04, 2.2)),
  ],

  /**
   * DUTCH RABBIT, sitting up on its haunches.
   *
   * Changed breed from a Holland Lop deliberately. Lop ears hang flat against
   * the skull, so in a particle cloud they merge into the head and the animal
   * reads as an anonymous blob. Tall upright ears ARE the rabbit signifier —
   * they are the one feature that makes the silhouette unmistakable, so the
   * breed was chosen to show them.
   *
   * Pose matters as much as proportion here: sitting upright with a small
   * chest above a heavy rear is what separates a rabbit from a guinea pig.
   */
  rabbit: () => [
    // Upright posture: small chest stacked above a big round rear.
    E([0.14, 0.14, 0], [0.48, 0.56, 0.42]),                    // chest, held high
    E([0.74, -0.44, 0], [0.78, 0.72, 0.60]),                   // heavy round rear
    ...pair(E([0.66, -0.88, 0.42], [0.56, 0.44, 0.28])),       // powerful haunches
    /**
      * THE COTTON TAIL. It was previously centred at x = 1.46 — inside a rump
      * that reaches 1.52 — so only 0.06 units of it were ever outside the body
      * and the default blend absorbed even that. The rabbit had a tail in the
      * model and none on the screen. It now sits proud of the rump at the top
      * of the haunches, with a tight blend so it stays a distinct puff.
      */
    E([1.60, -0.20, 0], [0.27, 0.27, 0.25], 0, 0.05, 2.2),

    C([-0.14, 0.52, 0], 0.24, [0.12, 0.24, 0], 0.34),          // short neck
    E([-0.46, 0.96, 0], [0.42, 0.40, 0.38], 0, 0.11),          // head
    E([-0.78, 0.84, 0], [0.25, 0.23, 0.25], 0, 0.07),          // muzzle
    E([-0.94, 0.82, 0], [0.10, 0.09, 0.11], 0, 0.05),          // nose
    // Eye, set high and to the side the way a prey animal's is.
    ...pair(E([-0.62, 1.06, 0.30], [0.085, 0.085, 0.07], 0, 0.02, 2.0)),

    // THE EARS — tall, upright, slightly splayed, and flattened front-to-back
    // like a real ear rather than modelled as tubes.
    ...pair(E([-0.34, 1.72, 0.20], [0.15, 0.58, 0.07], -7, 0.07, 3.2)),
    ...pair(E([-0.26, 2.24, 0.26], [0.11, 0.22, 0.06], -10, 0.05, 3.2)),  // rounded tip

    // Front legs tucked short and close under the chest.
    ...pair(C([0.02, -0.28, 0.22], 0.13, [-0.04, -1.24, 0.24], 0.10)),
    ...pair(E([-0.16, -1.32, 0.24], [0.17, 0.10, 0.13], 0, 0.07)),
    ...pair(E([0.54, -1.34, 0.42], [0.40, 0.13, 0.22], 0, 0.08)),    // long hind feet
  ],

  /**
   * OCELLARIS CLOWNFISH, swimming.
   *
   * ── Why this is no longer a betta ──────────────────────────────────────────
   * A halfmoon betta is roughly seventy percent fin, and what makes one
   * beautiful is colour and translucency — a red body glowing through a veil
   * of tail. A particle cloud has neither. Rendered as points, those fins stop
   * being veils and become mass: three huge opaque sails with a small body
   * hidden somewhere inside them. Every attempt at it read as a blob, because
   * the blob was an accurate rendering of a betta minus the two properties
   * that make a betta look like a fish.
   *
   * A clownfish is the opposite trade. Its recognisability lives entirely in
   * the OUTLINE — deep oval body, blunt rounded head, notched dorsal, rounded
   * tail fan — and outline is the one thing a point cloud renders well. The
   * fins are proportionate rather than dominant, so the body survives them.
   *
   * ── Proportions ────────────────────────────────────────────────────────────
   * Taken from the species rather than invented: body depth is about half the
   * standard length, the back arches highest just behind the head, the snout
   * is blunt and the eye large and set well forward, the caudal peduncle
   * narrows sharply, and the tail is a rounded fan — not forked.
   *
   * The dorsal is deliberately TWO fins with a gap between them. That notch
   * between the spiny and soft portions is the detail that says "clownfish"
   * more than anything else in the outline, so the blend radius there is far
   * smaller than the gap, letting the body dip visibly between them.
   */
  fish: () => [
    /**
     * ── Body ──
     * A deep blade: thin in Z, deep in Y, arched over the shoulder and then
     * tapering hard into a narrow waist. The taper is doing most of the work.
     * Without a visible caudal peduncle the tail looks welded to the body and
     * the whole thing reads as a leaf, which is exactly what went wrong first
     * time — the soft dorsal and anal fins ran all the way back over the
     * waist and filled it in.
     */
    E([-0.55, 0.00, 0], [0.80, 0.58, 0.26]),                   // flank
    E([-0.72, 0.22, 0], [0.55, 0.40, 0.22]),                   // arched shoulder
    E([-0.66, -0.18, 0], [0.62, 0.44, 0.23]),                  // full belly
    E([-1.22, 0.00, 0], [0.42, 0.46, 0.24]),                   // deep rounded head
    E([-1.55, -0.12, 0], [0.18, 0.24, 0.15]),                  // blunt snout
    E([-1.66, -0.22, 0], [0.09, 0.10, 0.09], 0, 0.05),         // lip
    E([0.18, 0.00, 0], [0.42, 0.34, 0.16]),                    // rear taper
    /**
     * The caudal peduncle. Narrow enough to read as a waist, but no narrower —
     * at [0.26, 0.17] it was so small that area-weighted sampling gave it
     * almost no particles, and the tail fan visibly detached and floated away
     * from the body like a balloon on a string. The weight boost is what keeps
     * the join populated.
     */
    E([0.62, 0.00, 0], [0.30, 0.20, 0.115], 0, undefined, 2.2),

    // Gill cover — a shallow plate, not a lump, so it reads as a seam.
    ...pair(E([-1.08, -0.06, 0.20], [0.24, 0.34, 0.05], 0, 0.05)),

    // Large eye, set high and well forward.
    ...pair(E([-1.30, 0.16, 0.19], [0.12, 0.12, 0.065], 0, 0.025, 1.4)),

    /**
     * ── Fins ──
     * One thin sheet each, blended at a radius well under the sheet's own
     * thickness. Blending thin sheets at a radius LARGER than their thickness
     * inflates them and fuses neighbours into fat lumps — that is what turned
     * the previous fish into a cluster of blobs.
     *
     * The weights are modest on purpose. They were 5–7 before, which handed
     * the fins roughly eighty percent of the particles and left the body a
     * transparent ghost suspended between two solid sails.
     *
     * Every fin is positioned to overlap the body by a little, so it grows out
     * of the flank, and to stop short of the peduncle, so the waist stays open.
     */

    // Dorsal, spiny portion — tall, forward, stopping short of the notch.
    E([-0.80, 0.74, 0], [0.48, 0.25, 0.05], -3, 0.015, 2.2),

    // Dorsal, soft portion — lower and rounded, starting after the notch.
    // The gap between these two is the clearest clownfish cue in the outline.
    E([0.12, 0.54, 0], [0.32, 0.18, 0.05], 4, 0.015, 2.0),

    // Anal fin, mirroring the soft dorsal along the underside.
    E([0.10, -0.56, 0], [0.34, 0.20, 0.05], -5, 0.015, 2.0),

    /**
     * Caudal fin — a rounded fan, truncate rather than forked, and TALLER than
     * it is long. Drawn as a narrow base wedge plus the fan so it grows out of
     * the peduncle instead of hanging off it: a single round ellipsoid here
     * read as a detached ball.
     */
    E([1.02, 0.00, 0], [0.22, 0.26, 0.05], 0, 0.03, 1.2),      // fin base
    E([1.30, 0.00, 0], [0.38, 0.48, 0.05], 0, 0.02, 2.8),      // the fan

    // Pectorals — rounded paddles, held out clear of the flank.
    ...pair(E([-0.90, -0.14, 0.25], [0.24, 0.28, 0.045], -28, 0.02, 1.6)),

    // Pelvics — prominent on this species, angled down and back.
    ...pair(E([-1.00, -0.66, 0.10], [0.11, 0.26, 0.045], 12, 0.02, 1.4)),
  ],
}

/* ────────────────────────────────────────────────────────────────────────────
   Markings

   One function per species, evaluated at each sampled point, returning a tone
   in [−1, 1]. See ShapeData.tones for why these matter as much as the geometry.

   Each is written from the actual breed standard rather than invented, because
   a half-remembered marking looks worse than none at all.
   ──────────────────────────────────────────────────────────────────────────── */

type Marking = (x: number, y: number, z: number) => number

/**
 * Eye centres, given as (x, y, |z|) — the absolute z matches both of a mirrored
 * pair at once. Each species' marking function tests these first.
 *
 * Eyes get their own mechanism because they are the single highest-value
 * marking on the whole model. A dog without eyes is a shape; the same dog with
 * two dark dots is a dog looking at you. They are modelled as geometry too, but
 * geometry alone is invisible here — an eye is only an eye because it is dark.
 */
const EYES: Partial<Record<Exclude<AnimalKey, 'orb'>, { c: Vec3; r: number }>> = {
  dog: { c: [-1.26, 1.10, 0.19], r: 0.150 },
  cat: { c: [-0.90, 1.50, 0.25], r: 0.150 },
  bird: { c: [-0.72, 0.90, 0.22], r: 0.105 },
  rabbit: { c: [-0.62, 1.06, 0.30], r: 0.120 },
  fish: { c: [-1.30, 0.16, 0.19], r: 0.150 },
}

function isEye(key: Exclude<AnimalKey, 'orb'>, x: number, y: number, z: number): boolean {
  const e = EYES[key]
  if (!e) return false
  const dx = x - e.c[0], dy = y - e.c[1], dz = Math.abs(z) - e.c[2]
  return dx * dx + dy * dy + dz * dz < e.r * e.r
}

const MARKINGS: Record<Exclude<AnimalKey, 'orb'>, Marking> = {
  /**
   * BEAGLE — tricolour, the classic hound pattern: a black saddle over the
   * back, tan head and flanks, and white on the muzzle, blaze, chest, feet and
   * the very tip of the tail. The white tail tip is not decoration; beagles
   * were bred with it so a handler could see the dog in long grass.
   */
  dog: (x, y, z) => {
    if (isEye('dog', x, y, z)) return -1
    if (x < -1.70 && y > 0.78 && y < 1.10) return -1          // black nose leather
    if (y < -1.45) return 1                                    // white feet
    if (x > 1.88 && y > 1.05) return 1                         // white tail tip
    if (x < -1.28 && y > 0.62 && y < 1.12) return 0.95         // white muzzle
    // Tan ears and cheeks, checked before the blaze so the pale stripe stays a
    // narrow centre line instead of washing the whole head out.
    if (Math.abs(z) > 0.19 && x < -0.72 && y > 0.05 && y < 1.32) return -0.3
    if (Math.abs(z) < 0.11 && x > -1.42 && x < -0.86 && y > 0.98) return 0.9   // blaze
    if (x < -0.05 && y > -0.78 && y < 0.34 && Math.abs(z) < 0.34) return 0.85  // chest
    if (x > -0.5 && x < 1.55 && y > 0.18) return -0.85         // black saddle
    return 0
  },

  /**
   * MAINE COON — brown classic tabby, the breed's most common coat: dark
   * mackerel striping over the body, bold rings down the tail, and a white
   * chin and chest. The tail rings are the strongest read, because the tail is
   * nearly as long as the cat.
   */
  cat: (x, y, z) => {
    if (isEye('cat', x, y, z)) return -1
    if (x < -1.20 && y > 1.18 && y < 1.36) return -1           // nose
    // The tail: bold rings along its length, which on a plumed tail this size
    // is the most legible marking the cat has.
    if (x > 1.15 && y < 1.12) return Math.sin(x * 3.4 + y * 4.4) > 0.0 ? -0.85 : 0.35
    if (y > 1.68) return Math.abs(z) > 0.2 ? -0.6 : 0.25       // dark ears, pale tufts
    if (x < -0.94 && y > 1.0 && y < 1.26) return 0.9           // white chin
    if (y < -1.5) return 0.85                                   // white paws
    if (x < 0.2 && y > -1.2 && y < 0.85 && Math.abs(z) < 0.32) return 0.8  // white chest
    if (y > -1.45) return Math.sin(x * 3.4 + y * 5.6) > 0.3 ? -0.75 : 0.12 // mackerel
    return 0
  },

  /**
   * COCKATIEL — normal grey, the wild-type colour: slate grey body, a bright
   * lemon face and crest, and a round orange cheek patch. Adult males show the
   * strongest yellow, so that is what is modelled. The white wing bar along
   * the leading edge of the folded wing is the other giveaway.
   */
  bird: (x, y, z) => {
    if (isEye('bird', x, y, z)) return -1
    // The orange cheek patch is left at the base coat, which in this palette is
    // already a warm orange — so it reads as an orange disc set into the pale
    // face rather than needing a colour channel of its own.
    if (Math.abs(z) > 0.20 && x > -0.85 && x < -0.52 && y > 0.55 && y < 0.86) return -0.05
    if (y > 1.0) return 0.95                                       // lemon crest
    if (x < -0.40 && y > 0.48) return 0.9                          // lemon face
    if (x > 1.25) return -0.35                                     // grey tail
    if (Math.abs(z) > 0.28 && x > -0.3 && x < 0.95) {
      // A narrow white bar along the lower edge of the folded wing, not the
      // whole wing — washing the entire wing white buried the bird's shape.
      return y < -0.2 ? 0.9 : -0.4
    }
    return -0.1                                                    // slate body
  },

  /**
   * DUTCH RABBIT — the Dutch pattern IS the breed, and it is strict: a white
   * wedge (the "blaze") up the face between the eyes, coloured cheeks and
   * ears, a clean white band round the shoulders and chest, coloured
   * hindquarters, and white on the hind feet. The saddle line where colour
   * meets white is meant to be sharp, so this uses a hard cut rather than a
   * gradient.
   */
  rabbit: (x, y, z) => {
    if (isEye('rabbit', x, y, z)) return -1
    if (x < -0.9 && y > 0.74 && y < 0.9) return -1                 // nose
    if (y > 1.15) return Math.abs(z) > 0.13 ? -0.7 : 0.9           // coloured ears
    if (x < -0.62 && y > 0.55) return 0.95                          // white muzzle
    if (Math.abs(z) < 0.12 && x < -0.2 && y > 0.7) return 1         // the blaze
    if (x < -0.3 && y > 0.62) return -0.65                          // coloured cheeks
    if (y < -1.1) return 0.9                                        // white feet
    // The cotton tail, pale so it reads against the coloured rump. A Dutch's
    // tail is coloured on top, but it is the pale underside that faces you
    // when the rabbit is sitting up like this — and a dark puff on a dark
    // rump is no tail at all.
    if (x > 1.3 && y > -0.5 && y < 0.16) return 0.9
    if (x < 0.34) return 1                                          // white front
    return -0.6                                                     // coloured rear
  },

  /**
   * OCELLARIS CLOWNFISH — three white bars on an orange body, each bar edged
   * in black, and black margins on the fins. The bars lean forward towards the
   * top and the middle one carries a forward-pointing wedge, which is what
   * distinguishes ocellaris from the similar percula.
   */
  fish: (x, y, z) => {
    if (isEye('fish', x, y, z)) return -1

    // Bars lean forward at the top rather than standing vertical.
    const sx = x + y * 0.18

    const bar = (centre: number, half: number) => {
      const d = Math.abs(sx - centre)
      if (d < half) return 1
      if (d < half + 0.08) return -1     // the black edging on each bar
      return 0
    }

    // Head bar, sitting just behind the eye.
    const head = bar(-1.04, 0.13)
    if (head !== 0) return head

    // Middle bar, widening upward into its forward-pointing wedge.
    const mid = bar(-0.28, 0.17 + Math.max(0, y) * 0.12)
    if (mid !== 0) return mid

    // Tail bar, across the peduncle.
    const tail = bar(0.56, 0.13)
    if (tail !== 0) return tail

    // Dark margins on the trailing edges of the fins.
    if (Math.abs(y) > 0.62 || x > 1.5) return -0.55
    return 0
  },
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
  const w = p.w ?? 1
  if (p.kind === 'e') {
    const [a, b, c] = p.r
    const k = 1.6075
    return w * 4 * Math.PI * Math.pow((Math.pow(a * b, k) + Math.pow(a * c, k) + Math.pow(b * c, k)) / 3, 1 / k)
  }
  const len = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2])
  const rm = (p.ra + p.rb) / 2
  return w * (2 * Math.PI * rm * len + 4 * Math.PI * rm * rm)
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
  const tones = new Float32Array(count)
  const ao = new Float32Array(count)

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
    ao.fill(1)
    return { positions, normals, tones, ao }
  }

  const parts = BUILDERS[key]()
  const marking = MARKINGS[key]
  const { field, gradient } = makeField(parts)

  const areas = parts.map(areaOf)
  const total = areas.reduce((a, b) => a + b, 0) || 1
  const cdf: number[] = []
  let acc = 0
  for (const a of areas) { acc += a / total; cdf.push(acc) }

  interface P { x: number; y: number; z: number; nx: number; ny: number; nz: number; tone: number; occ: number; ang: number; rad: number }

  /**
   * Ambient occlusion from the distance field (the Inigo Quilez method).
   *
   * Step along the surface normal. In open space the field value at distance h
   * should be h; anything less means geometry is crowding in, and the shortfall
   * is how occluded the point is. Each successive sample counts for less, so
   * near geometry dominates. Five taps is enough to catch a joint or an ear
   * without the cost running away.
   */
  function occlusion(x: number, y: number, z: number, nx: number, ny: number, nz: number): number {
    let sum = 0
    let scale = 1
    for (let i = 1; i <= 5; i++) {
      // Step size is set against the scale of these models, which span roughly
      // four units. The first attempt marched only 0.11 units in total, so
      // nothing but a razor-thin crease registered: ninety percent of points
      // came back fully open and the shading was indistinguishable from having
      // no occlusion at all.
      const h = 0.07 * i
      const d = field(x + nx * h, y + ny * h, z + nz * h)
      sum += (h - d) * scale
      scale *= 0.72
    }
    return Math.max(0, Math.min(1, 1 - 2.6 * sum))
  }
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
    const tone = Math.max(-1, Math.min(1, marking(x, y, z)))
    const occ = occlusion(x, y, z, nx, ny, nz)
    pts.push({ x, y, z, nx, ny, nz, tone, occ, ang: Math.atan2(y, x), rad: Math.hypot(x, y) })
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
    tones[i] = p.tone
    ao[i] = p.occ
  }

  return { positions, normals, tones, ao }
}

export const MORPH_SEQUENCE: AnimalKey[] = ['dog', 'cat', 'bird', 'rabbit', 'fish']

/** The specific breed each shape represents, used in copy and alt text. */
export const ANIMAL_LABELS: Record<AnimalKey, string> = {
  dog: 'Beagle',
  cat: 'Maine Coon',
  bird: 'Cockatiel',
  rabbit: 'Dutch Rabbit',
  fish: 'Clownfish',
  orb: 'Every pet',
}

/**
 * Resting camera yaw per species, in radians.
 *
 * Every animal is modelled facing −X. A pure side-on view reads as a diagram,
 * so each is turned to the angle that best shows its defining feature: enough
 * three-quarter on the beagle to see both drop ears, nearly side-on for the
 * nearly side-on for the clownfish, whose whole identity is its outline.
 */
/**
 * Display scale per species, so each fills its frame similarly.
 *
 * The clownfish is wide and short while the sitting cat is tall and narrow, so
 * a single scale made the cat tower over the dog and the fish read as a small
 * blob. These are set from the measured on-screen half-extent AFTER the resting
 * yaw, so every species is drawn at roughly the same apparent size and the
 * scroll doesn't lurch between a huge cat and a small dog.
 */
export const REST_SCALE: Record<AnimalKey, number> = {
  dog: 1.08,
  cat: 0.78,
  bird: 1.03,
  rabbit: 0.83,
  fish: 1.22,
  orb: 1.0,
}

export const REST_YAW: Record<AnimalKey, number> = {
  dog: 0.58,
  cat: 0.52,
  bird: 0.62,
  rabbit: 0.60,
  fish: 0.10,
  orb: 0,
}
