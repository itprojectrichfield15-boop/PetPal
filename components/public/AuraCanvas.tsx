'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'
import { sampleAnimal, type AnimalKey } from '@/lib/animal-shapes'

/**
 * A small, lit particle form for a feature-page header.
 *
 * Same volumetric shapes and lighting model as the landing page's AnimalField,
 * but a single static subject at a fraction of the particle count — a tool page
 * should feel like part of the same product without paying the landing page's
 * frame budget while someone is trying to use a calculator.
 *
 * Each page picks the species that suits it, so the header art differs from
 * screen to screen instead of every tool wearing the same banner.
 */

const PARTICLE_COUNT = 4200

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2  uMouse;

  attribute vec3  aShape;
  attribute vec3  aNormalIn;
  attribute vec3  aScatter;
  attribute float aSeed;

  varying vec3  vNormal;
  varying float vDepth;
  varying float vBlend;

  void main() {
    float e = uIntro * uIntro * (3.0 - 2.0 * uIntro);
    vec3 pos = mix(aScatter, aShape, e);

    // Gentle drift, strongest at the extremities.
    float limb = smoothstep(1.0, 2.2, length(pos.xy));
    float t = uTime * 0.6 + aSeed * 6.2831853;
    pos += vec3(sin(t), cos(t * 0.9), sin(t * 1.2)) * (0.01 + limb * 0.025) * e;

    float ay = uTime * 0.18 + uMouse.x * 0.3;
    float ax = uMouse.y * 0.16;
    mat3 ry = mat3(cos(ay), 0.0, sin(ay), 0.0, 1.0, 0.0, -sin(ay), 0.0, cos(ay));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(ax), -sin(ax), 0.0, sin(ax), cos(ax));
    pos = rx * ry * pos;
    vNormal = normalize(rx * ry * aNormalIn);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = -mv.z;
    vBlend = clamp((aShape.y + 2.4) / 4.8, 0.0, 1.0);

    gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uPixelRatio * (14.0 / max(vDepth, 0.001));
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uAccent;
  uniform float uOpacity;

  varying vec3  vNormal;
  varying float vDepth;
  varying float vBlend;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = pow(smoothstep(0.5, 0.0, d), 1.5);

    vec3 base = mix(uColorA, uColorB, pow(vBlend, 1.6));

    vec3 N = normalize(vNormal);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
    float diff = max(dot(N, L), 0.0);
    float rim  = pow(1.0 - max(dot(N, V), 0.0), 2.2);

    vec3 lit = base * (0.5 + diff * 1.1) + uAccent * rim * 0.4;

    float fog = smoothstep(16.0, 2.0, vDepth);
    gl_FragColor = vec4(lit, alpha * uOpacity * fog);
  }
`

export default function AuraCanvas({
  species = 'dog',
  className,
}: {
  species?: AnimalKey
  className?: string
}) {
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
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
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
    camera.position.set(0, 0, 7.6)

    const shape = sampleAnimal(species, PARTICLE_COUNT, 5)
    const scatter = new Float32Array(PARTICLE_COUNT * 3)
    const seeds = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 6 + Math.random() * 8
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * r
      scatter[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * r * 0.6
      scatter[i * 3 + 2] = Math.cos(ph) * r
      seeds[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3))
    geometry.setAttribute('aShape', new THREE.BufferAttribute(shape.positions, 3))
    geometry.setAttribute('aNormalIn', new THREE.BufferAttribute(shape.normals, 3))
    geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 18)

    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: reduceMotion ? 1 : 0 },
      uSize: { value: 2.7 },
      uPixelRatio: { value: dpr },
      uMouse: { value: new THREE.Vector2() },
      uOpacity: { value: reduceMotion ? 0.85 : 0 },
      uColorA: { value: new THREE.Color('#FF8A4C') },
      uColorB: { value: new THREE.Color('#B9B4FF') },
      uAccent: { value: new THREE.Color('#FFD98E') },
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

    const mouseTarget = new THREE.Vector2()
    let raf = 0
    let running = false
    let visible = true
    const clock = new THREE.Clock()
    const started = performance.now()

    function resize() {
      const w = host!.clientWidth
      const h = Math.max(host!.clientHeight, 1)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      camera.position.z = w < 640 ? 10.5 : 7.6
    }

    function frame() {
      uniforms.uTime.value = clock.getElapsedTime()
      if (!reduceMotion) {
        const intro = Math.min(1, (performance.now() - started) / 1800)
        uniforms.uIntro.value = intro
        uniforms.uOpacity.value = intro * 0.85
        uniforms.uMouse.value.x += (mouseTarget.x - uniforms.uMouse.value.x) * 0.05
        uniforms.uMouse.value.y += (mouseTarget.y - uniforms.uMouse.value.y) * 0.05
      }
      renderer.render(scene, camera)
    }

    function loop() { frame(); raf = requestAnimationFrame(loop) }
    function start() {
      if (running || reduceMotion) return
      running = true; clock.start(); raf = requestAnimationFrame(loop)
    }
    function stop() {
      if (!running) return
      running = false; cancelAnimationFrame(raf)
    }

    function onPointerMove(e: PointerEvent) {
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    function onVisibility() {
      if (document.hidden) stop()
      else if (visible) start()
    }

    const io = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true
      if (visible && !document.hidden) start()
      else stop()
    }, { threshold: 0 })
    io.observe(host)

    const ro = new ResizeObserver(resize)
    ro.observe(host)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    if (reduceMotion) frame()
    else start()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
    }
  }, [webglSupported, species])

  return <div ref={hostRef} className={className} aria-hidden="true" />
}
