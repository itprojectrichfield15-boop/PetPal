'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'
import { sampleAnimal, MORPH_SEQUENCE, type AnimalKey } from '@/lib/animal-shapes'

/**
 * The site's 3D layer: a fixed, full-viewport particle field behind every
 * section that morphs from one animal into the next as the page scrolls.
 *
 * Dog → cat → bird → rabbit → fish, because PetPal is not a dog app and the
 * hero should say so before any copy does.
 *
 * ── What makes it read as solid rather than as a haze ───────────────────────
 * Each point carries a real surface NORMAL, computed in lib/animal-shapes from
 * the gradient of an inflated silhouette. That normal is lit here with a key
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
 * One draw call. Two shapes on the GPU at a time; buffers swap only when the
 * scroll crosses into a new pair. DPR capped at 2. Loop stops when the tab is
 * hidden. `prefers-reduced-motion` draws one static frame. Everything disposed
 * on unmount.
 */

const PARTICLE_COUNT = 16000
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

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;
  varying vec3  vNormal;
  varying float vFlight;

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
    mat3 ry = mat3(cos(ay), 0.0, sin(ay), 0.0, 1.0, 0.0, -sin(ay), 0.0, cos(ay));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(ax), -sin(ax), 0.0, sin(ax), cos(ax));
    pos = rx * ry * pos;
    vNormal = normalize(rx * ry * normal);

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

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;
  varying vec3  vNormal;
  varying float vFlight;

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

    // ── Lighting ───────────────────────────────────────────────────────────
    vec3 N = normalize(vNormal);
    vec3 V = vec3(0.0, 0.0, 1.0);                 // camera looks down -Z
    vec3 L = normalize(vec3(-0.45, 0.75, 0.75));  // key, upper-left-front
    vec3 F = normalize(vec3(0.65, -0.25, 0.35));  // cool fill from the far side

    float diff = max(dot(N, L), 0.0);
    float fill = max(dot(N, F), 0.0) * 0.35;
    float rim  = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 18.0) * 0.5;

    vec3 lit =
        base * (0.52 + diff * 1.25 + fill)   // ambient + key + fill
      + uKeyLight * spec                      // specular glint
      + uRimLight * rim * 0.42;               // rim separates the silhouette

    // Points in flight glow hotter, so a morph reads as energy.
    lit += uKeyLight * vFlight * 0.35;
    // Hot core keeps individual particles crisp rather than muddy.
    lit += base * core * 0.70;

    float fog = smoothstep(18.0, 2.0, vDepth);
    gl_FragColor = vec4(lit, alpha * uOpacity * fog);
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
    const shapes = SEQ.map((key, i) => sampleAnimal(key, PARTICLE_COUNT, 11 + i))

    const geometry = new THREE.BufferGeometry()
    const aFrom = new Float32Array(shapes[0].positions)
    const aTo = new Float32Array(shapes[Math.min(1, shapes.length - 1)].positions)
    const aNormalFrom = new Float32Array(shapes[0].normals)
    const aNormalTo = new Float32Array(shapes[Math.min(1, shapes.length - 1)].normals)
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

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geometry.setAttribute('aFrom', fromAttr)
    geometry.setAttribute('aTo', toAttr)
    geometry.setAttribute('aNormalFrom', nFromAttr)
    geometry.setAttribute('aNormalTo', nToAttr)
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
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
    let pairIndex = -1
    function setPair(i: number) {
      if (i === pairIndex) return
      pairIndex = i
      const a = shapes[Math.min(i, shapes.length - 1)]
      const b = shapes[Math.min(i + 1, shapes.length - 1)]
      aFrom.set(a.positions); aNormalFrom.set(a.normals)
      aTo.set(b.positions); aNormalTo.set(b.normals)
      fromAttr.needsUpdate = true
      toAttr.needsUpdate = true
      nFromAttr.needsUpdate = true
      nToAttr.needsUpdate = true
    }
    setPair(0)

    const mouseTarget = new THREE.Vector2()
    let scrollTarget = 0
    let scrollEased = 0
    let raf = 0
    let running = false
    const clock = new THREE.Clock()
    const started = performance.now()

    function readScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollTarget = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }

    function resize() {
      const w = host!.clientWidth
      const h = Math.max(host!.clientHeight, 1)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      camera.position.z = w < 700 ? 11.5 : w < 1100 ? 9.6 : 8.4
    }

    function frame() {
      const elapsed = clock.getElapsedTime()
      uniforms.uTime.value = elapsed

      if (reduceMotion) {
        uniforms.uSpin.value = 0.45
        renderer.render(scene, camera)
        return
      }

      const intro = Math.min(1, (performance.now() - started) / 2600)
      uniforms.uIntro.value = intro
      // Full strength across the hero, then settle to an ambient presence so it
      // sits behind card content instead of reading through it.
      const ambient = 1.0 - Math.min(1, scrollEased / 0.18) * 0.62
      uniforms.uOpacity.value = Math.min(1, intro * 1.5) * ambient

      // Eased scroll — the morph should lag the wheel slightly, not snap to it.
      scrollEased += (scrollTarget - scrollEased) * 0.055
      uniforms.uMouse.value.x += (mouseTarget.x - uniforms.uMouse.value.x) * 0.05
      uniforms.uMouse.value.y += (mouseTarget.y - uniforms.uMouse.value.y) * 0.05

      uniforms.uBreath.value = Math.sin(elapsed * 1.5)

      const span = SEQ.length - 1
      const pos = scrollEased * span
      const idx = Math.min(span - 1, Math.floor(pos))
      setPair(idx)
      uniforms.uMix.value = pos - idx

      uniforms.uSpin.value = 0.3 + scrollEased * 2.0 + Math.sin(elapsed * 0.25) * 0.05
      points.position.x = 2.3 - scrollEased * 4.6
      points.position.y = Math.sin(scrollEased * Math.PI * 2) * 0.5

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
    window.addEventListener('resize', readScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    readScroll()
    scrollEased = scrollTarget

    if (reduceMotion) frame()
    else start()

    return () => {
      stop()
      ro.disconnect()
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', readScroll)
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
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      {/* Stage lighting behind the subject — also the fallback when WebGL is
          unavailable, so this layer is never an empty rectangle. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(52% 44% at 64% 36%, rgba(255,138,76,0.30) 0%, transparent 70%), radial-gradient(44% 40% at 26% 74%, rgba(142,139,245,0.22) 0%, transparent 72%)',
        }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
