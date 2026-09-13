'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'
import { sampleAnimal, MORPH_SEQUENCE, type AnimalKey } from '@/lib/animal-shapes'

/**
 * The site's 3D layer: a fixed, full-viewport particle field that sits behind
 * every section and morphs from one animal into the next as the page scrolls.
 *
 * It opens as a dog — the first thing a visitor sees, before any copy — then
 * becomes a cat, a bird, a rabbit and a fish on the way down the page. The
 * point is that PetPal is not a dog app: the hero literally turns into the
 * other species it supports.
 *
 * How the morph works
 *   Every silhouette is sampled to the SAME number of points (lib/animal-shapes),
 *   so turning one into another is a straight lerp between two position
 *   buffers. Only two shapes live on the GPU at a time (`aFrom`/`aTo`); the
 *   buffers are swapped on the CPU when the scroll crosses into a new pair,
 *   which happens a handful of times per page rather than per frame.
 *
 * Performance
 *   - one draw call, one custom shader, zero per-frame allocation
 *   - device pixel ratio capped at 2
 *   - the render loop stops when the tab is hidden
 *   - `prefers-reduced-motion` renders a single static frame and never loops
 *   - geometry, material, renderer and GL context are all disposed on unmount
 */

const PARTICLE_COUNT = 9000
const SEQ: AnimalKey[] = MORPH_SEQUENCE

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;     // 0 scattered -> 1 formed
  uniform float uMix;       // 0 = aFrom, 1 = aTo
  uniform vec2  uMouse;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uSpin;

  attribute vec3  aFrom;
  attribute vec3  aTo;
  attribute vec3  aScatter;
  attribute float aSeed;

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;

  void main() {
    // Stagger the morph very slightly per particle so the shape flows rather
    // than snapping as one rigid block.
    float stagger = (aSeed - 0.5) * 0.18;
    float m = clamp((uMix - stagger) / (1.0 - abs(stagger) * 0.5), 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);

    vec3 shape = mix(aFrom, aTo, m);

    // Intro: fly in from a scattered cloud.
    float e = uIntro * uIntro * (3.0 - 2.0 * uIntro);
    vec3 pos = mix(aScatter, shape, e);

    // Breathing drift so it never looks frozen.
    float t = uTime * 0.3 + aSeed * 6.2831853;
    pos += vec3(sin(t), cos(t * 1.1), sin(t * 0.9)) * 0.035 * e;

    // Slow turn + cursor parallax.
    float ay = uSpin + uMouse.x * 0.30;
    float ax = uMouse.y * 0.18;
    mat3 ry = mat3(cos(ay), 0.0, sin(ay), 0.0, 1.0, 0.0, -sin(ay), 0.0, cos(ay));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(ax), -sin(ax), 0.0, sin(ax), cos(ax));
    pos = rx * ry * pos;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    vDepth = -mv.z;
    vSeed = aSeed;
    // Colour by height on the shape, so the gradient follows the animal.
    vBlend = clamp((shape.y + 2.3) / 4.6, 0.0, 1.0);

    gl_PointSize = uSize * (0.65 + aSeed * 0.8) * uPixelRatio * (16.0 / max(vDepth, 0.001));
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uOpacity;

  varying float vDepth;
  varying float vBlend;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = pow(smoothstep(0.5, 0.0, d), 1.7);

    // Three-stop gradient up the body: warm at the feet, bright through the
    // middle, cool at the head.
    vec3 col = vBlend < 0.5
      ? mix(uColorA, uColorB, vBlend * 2.0)
      : mix(uColorB, uColorC, (vBlend - 0.5) * 2.0);

    float fog = smoothstep(17.0, 2.0, vDepth);
    // Slight lift so the subject reads on a dark ground without blowing out.
    gl_FragColor = vec4(col * 1.15, alpha * uOpacity * fog);
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
    // Sampled once; each is PARTICLE_COUNT * 3 floats.
    const shapes = SEQ.map((key, i) => sampleAnimal(key, PARTICLE_COUNT, 11 + i))

    const geometry = new THREE.BufferGeometry()
    const aFrom = new Float32Array(shapes[0])
    const aTo = new Float32Array(shapes[Math.min(1, shapes.length - 1)])
    const scatter = new Float32Array(PARTICLE_COUNT * 3)
    const seeds = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 9 + Math.random() * 11
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r
      scatter[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r * 0.6
      scatter[i * 3 + 2] = Math.cos(ph) * r
      seeds[i] = Math.random()
    }

    const fromAttr = new THREE.BufferAttribute(aFrom, 3)
    const toAttr = new THREE.BufferAttribute(aTo, 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geometry.setAttribute('aFrom', fromAttr)
    geometry.setAttribute('aTo', toAttr)
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)

    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: reduceMotion ? 1 : 0 },
      uMix: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
      uSize: { value: 3.6 },
      uPixelRatio: { value: dpr },
      uSpin: { value: 0 },
      uOpacity: { value: reduceMotion ? 1 : 0 },
      // Apricot -> butter -> iris, bottom to top.
      uColorA: { value: new THREE.Color('#F2814F') },
      uColorB: { value: new THREE.Color('#FFC978') },
      uColorC: { value: new THREE.Color('#8E8BF5') },
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
    /** Swap which two shapes are on the GPU. Runs a few times per page, not per frame. */
    function setPair(i: number) {
      if (i === pairIndex) return
      pairIndex = i
      aFrom.set(shapes[Math.min(i, shapes.length - 1)])
      aTo.set(shapes[Math.min(i + 1, shapes.length - 1)])
      fromAttr.needsUpdate = true
      toAttr.needsUpdate = true
    }
    setPair(0)

    const mouseTarget = new THREE.Vector2()
    let scrollTarget = 0        // 0..1 across the whole document
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
      // Pull the camera back on narrow screens so the animal always fits.
      camera.position.z = w < 700 ? 11.5 : w < 1100 ? 9.6 : 8.4
    }

    function frame() {
      const elapsed = clock.getElapsedTime()
      uniforms.uTime.value = elapsed

      if (reduceMotion) {
        uniforms.uSpin.value = 0.5
        renderer.render(scene, camera)
        return
      }

      const intro = Math.min(1, (performance.now() - started) / 2400)
      uniforms.uIntro.value = intro
      uniforms.uOpacity.value = Math.min(1, intro * 1.5)

      scrollEased += (scrollTarget - scrollEased) * 0.07
      uniforms.uMouse.value.x += (mouseTarget.x - uniforms.uMouse.value.x) * 0.045
      uniforms.uMouse.value.y += (mouseTarget.y - uniforms.uMouse.value.y) * 0.045

      // Map scroll across the sequence: 0 -> dog, 1 -> fish.
      const span = SEQ.length - 1
      const pos = scrollEased * span
      const idx = Math.min(span - 1, Math.floor(pos))
      setPair(idx)
      uniforms.uMix.value = pos - idx

      // Drift the subject across the viewport and turn it as the page moves.
      uniforms.uSpin.value = 0.35 + scrollEased * 2.2
      points.position.x = 2.3 - scrollEased * 4.6
      points.position.y = Math.sin(scrollEased * Math.PI * 2) * 0.5

      renderer.render(scene, camera)
    }

    function loop() {
      frame()
      raf = requestAnimationFrame(loop)
    }
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
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* Sits behind the canvas so the layer is never an empty rectangle when
          WebGL is unavailable or its context is lost. */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 60% 40%, rgba(242,129,79,0.16) 0%, transparent 70%), radial-gradient(50% 45% at 30% 70%, rgba(142,139,245,0.13) 0%, transparent 70%)',
        }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
