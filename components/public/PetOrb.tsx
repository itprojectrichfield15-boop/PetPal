'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'

/**
 * The hero's 3D element: a slowly turning sphere assembled from several
 * thousand GPU particles.
 *
 * Why a sphere of particles rather than a model of an animal — PetPal covers
 * dogs, cats, birds, rabbits, reptiles and fish, so any single creature on the
 * hero would misrepresent the product. The orb reads as "a whole world of care,
 * in one place" and stays true to every species.
 *
 * Performance notes (these are the difference between a showpiece and a
 * battery drain):
 *   - one draw call: a single THREE.Points with a custom shader, no per-particle
 *     objects and no per-frame allocation,
 *   - device pixel ratio capped at 2,
 *   - the render loop is stopped entirely when the canvas scrolls out of view
 *     or the tab is hidden,
 *   - `prefers-reduced-motion` renders one static frame and never starts a loop,
 *   - everything (geometry, material, renderer, context) is disposed on unmount.
 */

const PARTICLE_COUNT = 7000

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uScroll;
  uniform vec2  uMouse;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute vec3  aTarget;
  attribute vec3  aScatter;
  attribute float aSeed;

  varying float vDepth;
  varying float vLat;
  varying float vSeed;

  void main() {
    // Smoothstep easing so the particles settle rather than snap.
    float e = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    vec3 pos = mix(aScatter, aTarget, e);

    // Organic breathing drift, scaled by how formed the orb is.
    float t = uTime * 0.25 + aSeed * 6.2831853;
    pos += vec3(sin(t), cos(t * 1.1), sin(t * 0.9)) * 0.04 * e;

    // Scrolling gently blooms the orb outward.
    pos *= 1.0 + uScroll * 0.55;

    // Cursor parallax — a small rotation, not a full orbit.
    float mx = uMouse.x * 0.38;
    float my = uMouse.y * 0.24;
    mat3 ry = mat3(cos(mx), 0.0, sin(mx), 0.0, 1.0, 0.0, -sin(mx), 0.0, cos(mx));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(my), -sin(my), 0.0, sin(my), cos(my));
    pos = rx * ry * pos;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    vLat = normalize(aTarget).y;
    vSeed = aSeed;
    vDepth = -mv.z;

    gl_PointSize = uSize * (0.55 + aSeed * 0.9) * uPixelRatio * (18.0 / max(vDepth, 0.001));
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uOpacity;

  varying float vDepth;
  varying float vLat;
  varying float vSeed;

  void main() {
    // Round the square point sprite into a soft dot.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = pow(smoothstep(0.5, 0.0, d), 1.6);

    vec3 col = mix(uColorA, uColorB, smoothstep(-0.75, 0.85, vLat + vSeed * 0.25));

    // Depth fade keeps the far side of the sphere from muddying the front.
    float fog = smoothstep(11.5, 3.0, vDepth);

    gl_FragColor = vec4(col, alpha * uOpacity * fog);
  }
`

/** Even point distribution over a sphere (Fibonacci lattice). */
function fibonacciSphere(i: number, n: number, radius: number): [number, number, number] {
  const offset = 2 / n
  const increment = Math.PI * (3 - Math.sqrt(5))
  const y = i * offset - 1 + offset / 2
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const phi = i * increment
  return [Math.cos(phi) * r * radius, y * radius, Math.sin(phi) * r * radius]
}

export default function PetOrb({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  // Cheap capability probe during render — no renderer is constructed, and no
  // state is set from inside an effect.
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
      // Context creation can still fail on a driver blocklist even when the
      // probe passed. The CSS glow underneath stays visible, so the hero is
      // never an empty box.
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(dpr)
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100)
    camera.position.set(0, 0, 7.2)

    // ── Geometry ──────────────────────────────────────────────────────────
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const targets = new Float32Array(PARTICLE_COUNT * 3)
    const scatter = new Float32Array(PARTICLE_COUNT * 3)
    const seeds = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [x, y, z] = fibonacciSphere(i, PARTICLE_COUNT, 2.05)
      // A little thickness so it reads as a volume, not a shell.
      const jitter = 1 + (Math.random() - 0.5) * 0.12
      targets[i * 3] = x * jitter
      targets[i * 3 + 1] = y * jitter
      targets[i * 3 + 2] = z * jitter

      // Start scattered in a much larger volume, so the orb assembles itself.
      const sr = 7 + Math.random() * 9
      const st = Math.random() * Math.PI * 2
      const sp = Math.acos(2 * Math.random() - 1)
      scatter[i * 3] = Math.sin(sp) * Math.cos(st) * sr
      scatter[i * 3 + 1] = Math.sin(sp) * Math.sin(st) * sr * 0.6
      scatter[i * 3 + 2] = Math.cos(sp) * sr

      seeds[i] = Math.random()
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3))
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    // `position` is unused by the shader but three.js needs it for bounds.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20)

    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: reduceMotion ? 1 : 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uSize: { value: 2.6 },
      uPixelRatio: { value: dpr },
      uOpacity: { value: reduceMotion ? 1 : 0 },
      uColorA: { value: new THREE.Color('#FF7A6B') },
      uColorB: { value: new THREE.Color('#2DD4BF') },
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

    // ── Interaction state ─────────────────────────────────────────────────
    const mouseTarget = new THREE.Vector2(0, 0)
    let scrollTarget = 0
    let raf = 0
    let running = false
    let visible = true
    const clock = new THREE.Clock()
    const start = performance.now()

    function resize() {
      if (!host) return
      const w = host.clientWidth
      const h = Math.max(host.clientHeight, 1)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Shrink the orb on narrow screens so it never overflows the column.
      const scale = Math.min(1, Math.max(0.62, w / 620))
      points.scale.setScalar(scale)
    }

    function renderFrame() {
      const elapsed = clock.getElapsedTime()
      uniforms.uTime.value = elapsed

      if (!reduceMotion) {
        // Intro: assemble over ~2.2s.
        const introT = Math.min(1, (performance.now() - start) / 2200)
        uniforms.uProgress.value = introT
        uniforms.uOpacity.value = Math.min(1, introT * 1.4)

        // Inertial easing toward the pointer + scroll targets.
        uniforms.uMouse.value.x += (mouseTarget.x - uniforms.uMouse.value.x) * 0.045
        uniforms.uMouse.value.y += (mouseTarget.y - uniforms.uMouse.value.y) * 0.045
        uniforms.uScroll.value += (scrollTarget - uniforms.uScroll.value) * 0.06

        points.rotation.y = elapsed * 0.055
      }

      renderer.render(scene, camera)
    }

    function loop() {
      renderFrame()
      raf = requestAnimationFrame(loop)
    }

    function startLoop() {
      if (running || reduceMotion) return
      running = true
      clock.start()
      raf = requestAnimationFrame(loop)
    }

    function stopLoop() {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
    }

    // ── Listeners ─────────────────────────────────────────────────────────
    function onPointerMove(e: PointerEvent) {
      // Normalised to -1..1 across the viewport.
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }

    function onScroll() {
      const rect = host!.getBoundingClientRect()
      const past = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)))
      scrollTarget = past
    }

    function onVisibility() {
      if (document.hidden) stopLoop()
      else if (visible) startLoop()
    }

    const io = new IntersectionObserver(
      entries => {
        visible = entries[0]?.isIntersecting ?? true
        if (visible && !document.hidden) startLoop()
        else stopLoop()
      },
      { threshold: 0 }
    )
    io.observe(host)

    const ro = new ResizeObserver(resize)
    ro.observe(host)

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    onScroll()

    if (reduceMotion) {
      // One static, fully-formed frame. No loop, no motion, no battery cost.
      renderFrame()
    } else {
      startLoop()
    }

    // ── Teardown ──────────────────────────────────────────────────────────
    return () => {
      stopLoop()
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [webglSupported])

  // The CSS glow always renders underneath the canvas. If WebGL is missing or
  // its context fails to initialise, the hero degrades to the glow instead of
  // an empty box — and the layout never shifts either way.
  return (
    <div className={`relative ${className ?? ''}`} aria-hidden="true">
      <div
        className="absolute inset-0 rounded-full animate-glow-pulse"
        style={{ background: 'radial-gradient(circle, rgba(255,122,107,0.24) 0%, rgba(45,212,191,0.10) 45%, transparent 70%)' }}
      />
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
