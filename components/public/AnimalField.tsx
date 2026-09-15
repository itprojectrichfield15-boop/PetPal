'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'
import { sampleAnimal, MORPH_SEQUENCE, REST_YAW, REST_SCALE, type AnimalKey, type ShapeData } from '@/lib/animal-shapes'
import type { ShapeResponse } from './shape-worker'

/**
 * The site's 3D layer: a fixed, full-viewport particle field behind every
 * section that morphs from one animal into the next as the page scrolls.
 *
 * Dog → cat → bird → rabbit → fish, because PetPal is not a dog app and the
 * hero should say so before any copy does.
 *
 * ── What makes it read as solid rather than as a haze ───────────────────────
 * Each point carries a real surface NORMAL — the gradient of the blended
 * distance field it was sampled from. That normal is lit here with a key
 * light, a cool fill, a rim and a specular term, so the dog's chest catches
 * light and its far flank falls away. A particle cloud without normals has no
 * form to light and always looks flat — which is exactly how the first version
 * looked.
 *
 * ── What makes the morph flow rather than jump ──────────────────────────────
 *   - corresponding points already sit in comparable places on each body
 *     (they are spatially sorted at sample time), so travel distances are short,
 *   - each point follows a curved arc with a swell peaking mid-transition,
 *     rather than a straight line,
 *   - turbulence is injected while in flight and removed as it settles, so the
 *     cloud behaves like a swarm reorganising into the next animal.
 *
 * ── Performance ────────────────────────────────────────────────────────────
 * Shapes are sampled in a worker, so the main thread never blocks building
 * them. One draw call. Two shapes on the GPU at a time; buffers swap only when
 * the scroll crosses into a new pair. DPR capped at 2 and the particle budget
 * scales with viewport width, so a phone draws the same on-screen density as a
 * desktop rather than several times more. Loop stops when the tab is hidden.
 * `prefers-reduced-motion` draws one static frame. Everything disposed on
 * unmount.
 *
 * ── Mobile ─────────────────────────────────────────────────────────────────
 * Portrait gets its own composition. The desktop layout sits the subject to
 * the right of the headline, which on a phone puts it off the edge of the
 * screen entirely; portrait centres it below the copy instead. The layer is
 * also pinned to the large viewport so the URL bar appearing and disappearing
 * cannot resize the drawing buffer while the page is scrolling.
 */

/**
 * Particle budget, chosen from the viewport width.
 *
 * A constant 22,000 was wrong on a phone in both directions. The subject is
 * drawn into far fewer pixels there, so the same count is packed several times
 * denser than on a desktop — it does not look better, it looks like mush — and
 * a phone GPU pays for every one of those overlapping additive sprites. Scaling
 * the budget to the area the animal actually occupies keeps the ON-SCREEN
 * density, and therefore the apparent quality, the same everywhere.
 */
function particleBudget(width: number): number {
  if (width < 700) return 12000
  if (width < 1100) return 17000
  return 22000
}

const SEQ: AnimalKey[] = MORPH_SEQUENCE

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform float uMix;
  uniform vec2  uMouse;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSpin;
  uniform float uBreath;

  attribute vec3  aFrom;
  attribute vec3  aTo;
  attribute vec3  aNormalFrom;
  attribute vec3  aNormalTo;
  attribute vec3  aScatter;
  attribute float aSeed;
  attribute float aToneFrom;
  attribute float aToneTo;
  attribute float aAoFrom;
  attribute float aAoTo;

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;
  varying vec3  vNormal;
  varying float vFlight;
  varying float vTone;
  varying float vAo;
  varying float vFacing;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    // ── Morph ──────────────────────────────────────────────────────────────
    // A per-point offset staggers the transition so the body flows instead of
    // snapping across as one rigid piece.
    float stagger = (aSeed - 0.5) * 0.22;
    float m = clamp((uMix - stagger) * 1.35, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);

    vec3 shape  = mix(aFrom, aTo, m);
    vec3 normal = normalize(mix(aNormalFrom, aNormalTo, m) + 1e-5);
    // Markings cross-fade with the shape, so a beagle's saddle becomes a Maine
    // Coon's stripes over the same transition rather than popping at the end.
    vTone = mix(aToneFrom, aToneTo, m);
    vAo = mix(aAoFrom, aAoTo, m);

    // 0 when settled, 1 at the midpoint of a transition.
    float flight = sin(m * 3.14159265);
    vFlight = flight;

    // Curved travel. A straight-line lerp is what makes a morph look robotic.
    vec3 travel = aTo - aFrom;
    float dist = length(travel);
    if (dist > 0.0001) {
      vec3 perp = normalize(cross(travel, vec3(0.0, 0.0, 1.0)) + 1e-4);
      shape += perp * flight * dist * 0.22 * (aSeed - 0.5) * 2.0;
      // Outward puff so the silhouette opens as it changes.
      shape += normalize(shape + 1e-4) * flight * 0.30;
    }

    // Turbulence only while in flight — gone entirely once settled.
    float n = hash(floor(aScatter * 2.0));
    shape += vec3(
      sin(uTime * 1.7 + n * 31.0),
      cos(uTime * 1.4 + n * 27.0),
      sin(uTime * 1.1 + n * 19.0)
    ) * flight * 0.22;

    // ── Intro: assemble from a scattered cloud ─────────────────────────────
    float e = uIntro * uIntro * (3.0 - 2.0 * uIntro);
    vec3 pos = mix(aScatter, shape, e);

    // ── Idle life ──────────────────────────────────────────────────────────
    // Breathing: the whole body swells very slightly from its centre.
    pos *= 1.0 + uBreath * 0.012 * e;
    // Secondary drift, strongest at the extremities so tails and ears move most.
    float limb = smoothstep(1.2, 2.4, length(pos.xy));
    float t = uTime * 0.7 + aSeed * 6.2831853;
    pos += vec3(sin(t), cos(t * 0.9), sin(t * 1.3)) * (0.012 + limb * 0.03) * e;

    // ── Orientation ────────────────────────────────────────────────────────
    float ay = uSpin + uMouse.x * 0.34;
    float ax = uMouse.y * 0.20;
    mat3 ry = mat3(cos(ay), 0.0, -sin(ay), 0.0, 1.0, 0.0, sin(ay), 0.0, cos(ay));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(ax), sin(ax), 0.0, -sin(ax), cos(ax));
    pos = rx * ry * pos;
    vNormal = normalize(rx * ry * normal);
    // How squarely this point faces the camera. Points on the FAR side of the
    // body are the reason an additive cloud looks hollow — every one of them
    // shines straight through the near surface. Carried to the fragment shader
    // so they can be held back.
    vFacing = dot(vNormal, vec3(0.0, 0.0, 1.0));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    vDepth = -mv.z;
    vSeed = aSeed;
    vBlend = clamp((shape.y + 2.4) / 4.8, 0.0, 1.0);

    gl_PointSize = uSize * (0.62 + aSeed * 0.75) * uPixelRatio * (16.0 / max(vDepth, 0.001));
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform vec3  uKeyLight;
  uniform vec3  uRimLight;
  uniform float uOpacity;
  uniform float uLight;

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;
  varying vec3  vNormal;
  varying float vFlight;
  varying float vTone;
  varying float vAo;
  varying float vFacing;

  void main() {
    // Round the square point sprite into a soft dot with a hot core.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = pow(smoothstep(0.5, 0.0, d), 1.5);
    float core  = pow(smoothstep(0.34, 0.0, d), 2.0);

    // Three-stop gradient up the body.
    // Bias the ramp upward so the warm mid tone carries most of the body and
    // the cool tone is reserved for the very top — otherwise additive blending
    // drags the whole animal toward purple.
    float g = pow(vBlend, 1.7);
    vec3 base = g < 0.62
      ? mix(uColorA, uColorB, g / 0.62)
      : mix(uColorB, uColorC, (g - 0.62) / 0.38);

    // ── Coat markings ──────────────────────────────────────────────────────
    // Light markings wash towards a warm white; dark ones drop towards a deep
    // plum rather than to black, because true black against a dark background
    // reads as a hole punched in the animal rather than as a marking.
    base = mix(base, vec3(1.0, 0.96, 0.90), max(vTone, 0.0) * 0.88);
    base = mix(base, vec3(0.20, 0.13, 0.24), max(-vTone, 0.0) * 0.80);

    // ── Lighting ───────────────────────────────────────────────────────────
    vec3 N = normalize(vNormal);
    vec3 V = vec3(0.0, 0.0, 1.0);                 // camera looks down -Z
    vec3 L = normalize(vec3(-0.45, 0.75, 0.75));  // key, upper-left-front
    vec3 F = normalize(vec3(0.65, -0.25, 0.35));  // cool fill from the far side

    float diff = max(dot(N, L), 0.0);
    float fill = max(dot(N, F), 0.0) * 0.35;
    float rim  = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 18.0) * 0.5;

    // Baked ambient occlusion. Creases, armpits and the inside of an ear stop
    // glowing as brightly as an open flank, which is most of what gives the
    // form volume rather than the flat glow of a lit point cloud.
    float occ = mix(0.34, 1.0, vAo);

    vec3 lit =
        base * (0.52 * occ + diff * 1.25 * occ + fill * occ)   // ambient + key + fill
      + uKeyLight * spec                      // specular glint
      + uRimLight * rim * (0.42 + max(-vTone, 0.0) * 0.5);  // rim separates the silhouette

    // Hold back the far side of the body. A real animal is opaque; without
    // this every point behind the subject reads through the front of it and
    // the whole thing looks like a hollow shell of dots.
    float facingFade = smoothstep(-0.55, 0.12, vFacing);
    alpha *= 0.12 + 0.88 * facingFade;

    // Points in flight glow hotter, so a morph reads as energy.
    lit += uKeyLight * vFlight * 0.35;
    // Hot core keeps individual particles crisp rather than muddy.
    lit += base * core * 0.70;

    float fog = smoothstep(18.0, 2.0, vDepth);

    /*
     * On a light ground this has to be drawn as INK, not as glow.
     *
     * The dark theme renders these additively: every point adds light to a
     * near-black page, which is why they shine. Additive blending onto white
     * can only ever reach white, so on the light theme the animals would be
     * invisible. Switching to normal blending is half the answer; the other
     * half is inverting what carries the form. Here density does it — a
     * shadowed part of the body takes MORE ink and a lit part takes less,
     * which is how shading works on paper.
     */
    if (uLight > 0.5) {
      float lum = dot(lit, vec3(0.2126, 0.7152, 0.0722));
      vec3 ink = mix(vec3(0.16, 0.11, 0.21), base * 0.42, 0.55);
      gl_FragColor = vec4(ink, alpha * uOpacity * fog * clamp(1.05 - lum * 0.85, 0.10, 1.0));
    } else {
      gl_FragColor = vec4(lit, alpha * uOpacity * fog);
    }
  }
`

export default function AnimalField() {
  const hostRef = useRef<HTMLDivElement>(null)

  const webglSupported = useClientValue(() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      return false
    }
  }, true)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !webglSupported) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' })
    } catch {
      return
    }

    const PARTICLE_COUNT = particleBudget(host.clientWidth || window.innerWidth)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' })
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100)
    camera.position.set(0, 0, 8.4)

    // ── Shapes ────────────────────────────────────────────────────────────
    let pairIndex = -1
    let disposed = false
    // 0 until the first shape lands. The intro is timed from that moment.
    let introStarted = 0
    const shapes: (ShapeData | undefined)[] = new Array(SEQ.length)

    /**
     * Sampling projects every point onto a blended distance field, which costs
     * roughly a quarter of a second per animal. It runs in a worker, so the
     * main thread pays nothing for it.
     *
     * The previous arrangement built the opening shape synchronously on mount
     * and queued the other four onto `requestIdleCallback`. Idle callbacks are
     * not preemptible: once one starts it runs to completion, so each of those
     * four builds froze the page for 200–300ms, and they landed while the intro
     * animation was still playing. That is what made the opening stutter.
     */
    function accept(i: number, shape: ShapeData) {
      if (disposed) return
      shapes[i] = shape
      // A shape arriving after `setPair` already asked for it means the GPU
      // buffers are stale; force the next frame to re-upload them.
      if (i === pairIndex || i === pairIndex + 1) pairIndex = -1
      // The intro is timed from the first shape landing rather than from mount,
      // so the assemble always plays in full instead of starting against an
      // empty buffer.
      if (introStarted === 0) introStarted = performance.now()
    }

    let worker: Worker | null = null
    try {
      worker = new Worker(new URL('./shape-worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<ShapeResponse>) => {
        const { index, positions, normals, tones, ao } = event.data
        accept(index, { positions, normals, tones, ao })
      }
      // A worker that fails at runtime must not leave the field permanently
      // empty — fall back to building on the main thread.
      worker.onerror = () => {
        worker?.terminate()
        worker = null
        buildOnMainThread()
      }
      SEQ.forEach((key, i) => {
        worker!.postMessage({ index: i, key, count: PARTICLE_COUNT, seed: 11 + i })
      })
    } catch {
      worker = null
      buildOnMainThread()
    }

    /** Fallback only: no worker support, or the worker failed to start. */
    function buildOnMainThread() {
      const idle: (cb: () => void) => void =
        typeof window.requestIdleCallback === 'function'
          ? cb => window.requestIdleCallback(() => cb(), { timeout: 900 })
          : cb => window.setTimeout(cb, 32)
      let queued = 0
      const step = () => {
        if (disposed || queued >= SEQ.length) return
        const i = queued++
        accept(i, sampleAnimal(SEQ[i], PARTICLE_COUNT, 11 + i))
        idle(step)
      }
      step()
    }

    const geometry = new THREE.BufferGeometry()
    // No shape exists yet — they all arrive from the worker. The buffers start
    // zeroed, which is invisible: `uIntro` is held at 0 until the first shape
    // lands, so every point is still sitting out at its scatter position.
    const aFrom = new Float32Array(PARTICLE_COUNT * 3)
    const aTo = new Float32Array(PARTICLE_COUNT * 3)
    const aNormalFrom = new Float32Array(PARTICLE_COUNT * 3)
    const aNormalTo = new Float32Array(PARTICLE_COUNT * 3)
    const aToneFrom = new Float32Array(PARTICLE_COUNT)
    const aToneTo = new Float32Array(PARTICLE_COUNT)
    const aAoFrom = new Float32Array(PARTICLE_COUNT)
    const aAoTo = new Float32Array(PARTICLE_COUNT)
    const scatter = new Float32Array(PARTICLE_COUNT * 3)
    const seeds = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 9 + Math.random() * 12
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r
      scatter[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r * 0.6
      scatter[i * 3 + 2] = Math.cos(ph) * r
      seeds[i] = Math.random()
    }

    const fromAttr = new THREE.BufferAttribute(aFrom, 3)
    const toAttr = new THREE.BufferAttribute(aTo, 3)
    const nFromAttr = new THREE.BufferAttribute(aNormalFrom, 3)
    const nToAttr = new THREE.BufferAttribute(aNormalTo, 3)
    const tFromAttr = new THREE.BufferAttribute(aToneFrom, 1)
    const tToAttr = new THREE.BufferAttribute(aToneTo, 1)
    const oFromAttr = new THREE.BufferAttribute(aAoFrom, 1)
    const oToAttr = new THREE.BufferAttribute(aAoTo, 1)

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geometry.setAttribute('aFrom', fromAttr)
    geometry.setAttribute('aTo', toAttr)
    geometry.setAttribute('aNormalFrom', nFromAttr)
    geometry.setAttribute('aNormalTo', nToAttr)
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.setAttribute('aToneFrom', tFromAttr)
    geometry.setAttribute('aToneTo', tToAttr)
    geometry.setAttribute('aAoFrom', oFromAttr)
    geometry.setAttribute('aAoTo', oToAttr)
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 26)

    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: reduceMotion ? 1 : 0 },
      uMix: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uSize: { value: 3.5 },
      uPixelRatio: { value: dpr },
      uSpin: { value: 0 },
      uBreath: { value: 0 },
      uOpacity: { value: reduceMotion ? 1 : 0 },
      uLight: { value: 0 },
      uColorA: { value: new THREE.Color('#FF8A4C') },
      uColorB: { value: new THREE.Color('#FFDCAE') },
      uColorC: { value: new THREE.Color('#B9B4FF') },
      uKeyLight: { value: new THREE.Color('#FFE3BC') },
      uRimLight: { value: new THREE.Color('#8E8BF5') },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // ── Scroll-driven morph ───────────────────────────────────────────────
    function setPair(i: number) {
      if (i === pairIndex) return

      const a = shapes[Math.min(i, shapes.length - 1)]
      if (!a) return
      // The destination may still be queued. Fall back to holding the current
      // shape rather than snapping to a half-built state; `buildNext` resets
      // `pairIndex` so the next frame re-uploads once it lands.
      const b = shapes[Math.min(i + 1, shapes.length - 1)] ?? a

      pairIndex = i
      aFrom.set(a.positions); aNormalFrom.set(a.normals); aToneFrom.set(a.tones); aAoFrom.set(a.ao)
      aTo.set(b.positions); aNormalTo.set(b.normals); aToneTo.set(b.tones); aAoTo.set(b.ao)
      fromAttr.needsUpdate = true
      toAttr.needsUpdate = true
      nFromAttr.needsUpdate = true
      nToAttr.needsUpdate = true
      tFromAttr.needsUpdate = true
      tToAttr.needsUpdate = true
      oFromAttr.needsUpdate = true
      oToAttr.needsUpdate = true
    }
    setPair(0)


    /*
     * Keep the renderer in step with the theme.
     *
     * Additive blending onto a light page can only ever reach white, so the
     * light theme needs normal blending plus the ink path in the fragment
     * shader. Both have to change together, and `needsUpdate` is required
     * because blending is a compiled material property, not a uniform.
     */
    /*
     * Ambient strength differs by theme, and by more than it looks.
     *
     * On the dark page the settled field is a faint glow that content sits
     * comfortably on top of. The same nominal opacity in light mode is dark
     * ink on white — far higher contrast — and it smudges across the cards
     * instead of sitting behind them. Light therefore runs at roughly half.
     */
    let themeOpacity = 1

    function syncTheme() {
      const light = document.documentElement.getAttribute('data-theme') === 'light'
      uniforms.uLight.value = light ? 1 : 0
      themeOpacity = light ? 0.5 : 1
      material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      material.needsUpdate = true
    }
    syncTheme()
    window.addEventListener('petpal:prefs-changed', syncTheme)

    const mouseTarget = new THREE.Vector2()
    let scrollTarget = 0
    let scrollEased = 0
    let raf = 0
    let running = false
    const clock = new THREE.Clock()

    /**
     * Cached so the scroll fraction does not depend on a fresh `innerHeight`
     * read every frame. On a phone `innerHeight` changes as the URL bar hides,
     * which would make the morph position jump mid-scroll for no reason.
     */
    let scrollMax = 1
    function measureScrollRange() {
      scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    }

    function readScroll() {
      scrollTarget = Math.min(1, Math.max(0, window.scrollY / scrollMax))
    }

    /**
     * Framing, recomputed on resize.
     *
     * The desktop composition sits the subject to the RIGHT of the headline and
     * sweeps it left as the page scrolls. On a portrait phone there is no right
     * hand side: the copy runs full width, the visible half-width is only about
     * 2.2 world units, and a subject centred at x = 2.68 is entirely off screen.
     * That is why the animal was barely visible on a phone. Portrait therefore
     * gets its own composition — centred horizontally, sitting below the copy,
     * with only a small drift instead of a full sweep.
     */
    let homeX = 2.68
    let homeY = -0.10
    let travelX = 4.7
    let fitScale = 1
    /**
     * How bright the subject is allowed to be over the hero.
     *
     * On a wide screen it sits BESIDE the headline, so it can run at full
     * strength. Stacked on a phone it sits BEHIND the copy, where full strength
     * competes with the text for the same pixels — so portrait holds it back to
     * a backdrop. It is still the first thing you see; it just stops fighting
     * the words.
     */
    let heroOpacity = 1

    let lastW = 0
    let lastH = 0
    function resize() {
      const w = host!.clientWidth
      const h = Math.max(host!.clientHeight, 1)

      // Guard against the URL-bar resize storm. `setSize` reallocates the
      // drawing buffer, so it must not run for a 60px nudge mid-scroll; the
      // projection update below is cheap and always runs.
      const widthChanged = w !== lastW
      const heightJump = Math.abs(h - lastH) / Math.max(lastH, 1)
      if (widthChanged || heightJump > 0.2) {
        renderer.setSize(w, h, false)
        lastW = w
        lastH = h
      }

      const aspect = w / h
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      camera.position.z = w < 700 ? 11.5 : w < 1100 ? 9.6 : 8.4

      const portrait = aspect < 0.95
      if (portrait) {
        const halfTan = Math.tan((camera.fov * Math.PI) / 360)
        const halfW = camera.position.z * halfTan * aspect
        homeX = 0
        // Sit low, clear of the stacked hero copy above it.
        homeY = -2.5
        travelX = 0.9
        // The widest species is drawn about 2.2 half-units across; hold it
        // inside the frame with a margin rather than letting it clip.
        fitScale = Math.min(1, (halfW * 0.92) / 2.2)
        heroOpacity = 0.68
      } else {
        homeX = 2.68
        homeY = -0.10
        travelX = 4.7
        fitScale = 1
        heroOpacity = 1
      }

      measureScrollRange()
      readScroll()
    }

    function frame() {
      const elapsed = clock.getElapsedTime()
      uniforms.uTime.value = elapsed

      if (reduceMotion) {
        uniforms.uSpin.value = 0.45
        // Nothing to show until the worker delivers the opening shape.
        uniforms.uIntro.value = introStarted === 0 ? 0 : 1
        uniforms.uOpacity.value = introStarted === 0 ? 0 : 1
        renderer.render(scene, camera)
        return
      }

      const intro = introStarted === 0 ? 0 : Math.min(1, (performance.now() - introStarted) / 2600)
      uniforms.uIntro.value = intro
      // Full strength across the hero, then settle to an ambient presence so it
      // sits behind card content instead of reading through it.
      const ambient = heroOpacity - Math.min(1, scrollEased / 0.18) * (heroOpacity * 0.62)
      uniforms.uOpacity.value = Math.min(1, intro * 1.5) * ambient * themeOpacity

      // Read the scroll position every frame rather than trusting the scroll
      // event. Mobile browsers batch and throttle that event during momentum
      // scrolling, so listener-driven values arrive in bursts and the morph
      // moves in steps; `scrollY` read here is always current.
      readScroll()
      // Eased scroll — the morph should lag the wheel slightly, not snap to it.
      scrollEased += (scrollTarget - scrollEased) * 0.055
      uniforms.uMouse.value.x += (mouseTarget.x - uniforms.uMouse.value.x) * 0.05
      uniforms.uMouse.value.y += (mouseTarget.y - uniforms.uMouse.value.y) * 0.05

      uniforms.uBreath.value = Math.sin(elapsed * 1.5)

      const span = SEQ.length - 1
      // Finish the sequence before the page bottom rather than exactly at it.
      // Mapping the morph across the full scroll meant the last species — the
      // fish — only completed on the final pixel, and with the eased follow
      // below it never actually got there: every visit ended on a half-built
      // shape that read as a blob. Landing the last transition at 88% gives
      // each animal, the fish included, a stretch where it is simply itself.
      const progress = Math.min(1, scrollEased / 0.88)
      const pos = progress * span
      const idx = Math.min(span - 1, Math.floor(pos))
      setPair(idx)
      uniforms.uMix.value = pos - idx

      // Hold each species at its own flattering three-quarter angle and sway
      // gently around it, rather than spinning through angles where the
      // anatomy reads badly. Blends between the two shapes mid-morph.
      const restA = REST_YAW[SEQ[Math.min(idx, SEQ.length - 1)]]
      const restB = REST_YAW[SEQ[Math.min(idx + 1, SEQ.length - 1)]]
      const rest = restA + (restB - restA) * uniforms.uMix.value
      uniforms.uSpin.value = rest + Math.sin(elapsed * 0.22) * 0.16 + scrollEased * 0.35
      // Framing: sit the subject clear of the headline on the right, whole and
      // uncropped. A complete readable animal beats a larger cropped one — at
      // 1.10 scale the beagle’s head collided with the first line of copy, so
      // the subject is pushed further right as it grows to keep that clearance.
      points.position.x = homeX - scrollEased * travelX
      // The closing lift. At the foot of the page the subject would otherwise
      // land squarely on the footer's first column; this raises it into the
      // open band between the closing card and the footer, so the last species
      // in the sequence gets a clear moment instead of sitting on top of text.
      const closingLift = Math.max(0, scrollEased - 0.80) * 3.6
      points.position.y = homeY + Math.sin(scrollEased * Math.PI * 2) * 0.45 + closingLift
      // Blend the per-species display scale through the morph too.
      const scaleA = REST_SCALE[SEQ[Math.min(idx, SEQ.length - 1)]]
      const scaleB = REST_SCALE[SEQ[Math.min(idx + 1, SEQ.length - 1)]]
      const speciesScale = scaleA + (scaleB - scaleA) * uniforms.uMix.value
      const s = (1.0 - scrollEased * 0.18) * speciesScale * fitScale
      points.scale.setScalar(s)

      renderer.render(scene, camera)
    }

    function loop() { frame(); raf = requestAnimationFrame(loop) }
    function start() {
      if (running || reduceMotion) return
      running = true
      clock.start()
      raf = requestAnimationFrame(loop)
    }
    function stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
    }

    function onPointerMove(e: PointerEvent) {
      // Touch and pen are ignored. On a phone every scroll drags a pointer
      // across the screen, which swung the subject around as you scrolled and
      // was a large part of why the motion felt unsteady.
      if (e.pointerType !== 'mouse') return
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    function onVisibility() {
      if (document.hidden) stop()
      else start()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    window.addEventListener('orientationchange', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    readScroll()
    scrollEased = scrollTarget

    if (reduceMotion) frame()
    else start()

    return () => {
      disposed = true
      worker?.terminate()
      stop()
      ro.disconnect()
      window.removeEventListener('petpal:prefs-changed', syncTheme)
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [webglSupported])

  return (
    /**
     * Height is pinned to the LARGE viewport (`lvh`), not `inset-0`.
     *
     * On a phone the viewport grows and shrinks by the height of the URL bar
     * as you scroll. A full-bleed fixed layer sized to that viewport therefore
     * changes size mid-scroll, which fires the ResizeObserver and reallocates
     * the WebGL drawing buffer — expensive, and it flashes. `100lvh` is the
     * height with the browser chrome retracted, so it does not move at all
     * while scrolling; the bottom strip simply sits behind the URL bar when
     * that is showing, which for a background layer is exactly right.
     * `h-screen` is the fallback where `lvh` is unsupported.
     */
    <div
      className="fixed inset-x-0 top-0 h-screen [height:100lvh] z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* Stage lighting behind the subject — also the fallback when WebGL is
          unavailable, so this layer is never an empty rectangle.

          The light theme needs its own, far fainter version: these washes are
          sized to glow against a near-black page, and at that strength on a
          warm white one they turned the whole interface muddy. The `stage-glow`
          class carries the light-theme values; see globals.css. */}
      <div
        className="absolute inset-0 stage-glow"
        style={{
          background:
            'radial-gradient(52% 44% at 64% 36%, rgba(255,138,76,0.30) 0%, transparent 70%), radial-gradient(44% 40% at 26% 74%, rgba(142,139,245,0.22) 0%, transparent 72%)',
        }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
