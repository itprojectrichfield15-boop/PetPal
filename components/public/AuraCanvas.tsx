'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useClientValue } from '@/lib/use-client-value'
import { sampleAnimal, REST_YAW, REST_SCALE, type AnimalKey } from '@/lib/animal-shapes'

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

/**
 * Particle budget. The header pane is much smaller on a phone, so the same
 * count would be packed denser there than on a desktop while a weaker GPU paid
 * for it — and sampling this many points is a main-thread cost on page load.
 */
function particleBudget(width: number): number {
  return width < 700 ? 2600 : 4200
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uIntro;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec2  uMouse;
  uniform float uRestYaw;

  attribute vec3  aShape;
  attribute vec3  aNormalIn;
  attribute vec3  aScatter;
  attribute float aSeed;
  attribute float aTone;
  attribute float aAo;

  varying vec3  vNormal;
  varying float vDepth;
  varying float vBlend;
  varying float vTone;
  varying float vAo;
  varying float vFacing;

  void main() {
    float e = uIntro * uIntro * (3.0 - 2.0 * uIntro);
    vec3 pos = mix(aScatter, aShape, e);

    // Gentle drift, strongest at the extremities.
    float limb = smoothstep(1.0, 2.2, length(pos.xy));
    float t = uTime * 0.6 + aSeed * 6.2831853;
    pos += vec3(sin(t), cos(t * 0.9), sin(t * 1.2)) * (0.01 + limb * 0.025) * e;

    // Held at the species’ best angle, swaying gently rather than spinning.
    float ay = uRestYaw + sin(uTime * 0.22) * 0.20 + uMouse.x * 0.26;
    float ax = uMouse.y * 0.16;
    mat3 ry = mat3(cos(ay), 0.0, -sin(ay), 0.0, 1.0, 0.0, sin(ay), 0.0, cos(ay));
    mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cos(ax), sin(ax), 0.0, -sin(ax), cos(ax));
    pos = rx * ry * pos;
    vNormal = normalize(rx * ry * aNormalIn);
    // Points on the far side of the body are why an additive cloud reads as a
    // hollow shell; this lets the fragment shader hold them back.
    vFacing = dot(vNormal, vec3(0.0, 0.0, 1.0));

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    vDepth = -mv.z;
    vBlend = clamp((aShape.y + 2.4) / 4.8, 0.0, 1.0);
    vTone = aTone;
    vAo = aAo;

    gl_PointSize = uSize * (0.6 + aSeed * 0.8) * uPixelRatio * (14.0 / max(vDepth, 0.001));
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uAccent;
  uniform float uOpacity;
  uniform float uLight;

  varying vec3  vNormal;
  varying float vDepth;
  varying float vBlend;
  varying float vTone;
  varying float vAo;
  varying float vFacing;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float alpha = pow(smoothstep(0.5, 0.0, d), 1.5);

    vec3 base = mix(uColorA, uColorB, pow(vBlend, 1.6));

    // Coat markings. Light markings wash towards a warm white; dark ones drop
    // towards a deep plum rather than to black, because true black on a dark
    // background is a hole in the animal, not a marking.
    base = mix(base, vec3(1.0, 0.96, 0.90), max(vTone, 0.0) * 0.88);
    base = mix(base, vec3(0.20, 0.13, 0.24), max(-vTone, 0.0) * 0.80);

    vec3 N = normalize(vNormal);
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(-0.4, 0.7, 0.8));
    float diff = max(dot(N, L), 0.0);
    float rim  = pow(1.0 - max(dot(N, V), 0.0), 2.2);

    // Baked ambient occlusion — creases and joins stop glowing as brightly as
    // an open flank, which is most of what gives the form volume.
    float occ = mix(0.34, 1.0, vAo);

    // Dark markings keep their rim light so the silhouette survives them.
    vec3 lit = base * (0.5 * occ + diff * 1.1 * occ) + uAccent * rim * (0.4 + max(-vTone, 0.0) * 0.5);

    // A real animal is opaque. Without this the far side shines through the
    // near side and the whole thing looks like a shell of dots.
    alpha *= 0.12 + 0.88 * smoothstep(-0.55, 0.12, vFacing);

    float fog = smoothstep(16.0, 2.0, vDepth);

    // On a light ground the form is carried by ink density rather than glow —
    // additive blending onto white can only reach white. See AnimalField.
    if (uLight > 0.5) {
      float lum = dot(lit, vec3(0.2126, 0.7152, 0.0722));
      vec3 ink = mix(vec3(0.16, 0.11, 0.21), base * 0.42, 0.55);
      gl_FragColor = vec4(ink, alpha * uOpacity * fog * clamp(1.05 - lum * 0.85, 0.10, 1.0));
    } else {
      gl_FragColor = vec4(lit, alpha * uOpacity * fog);
    }
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

    const PARTICLE_COUNT = particleBudget(window.innerWidth)
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
    geometry.setAttribute('aTone', new THREE.BufferAttribute(shape.tones, 1))
    geometry.setAttribute('aAo', new THREE.BufferAttribute(shape.ao, 1))
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 18)

    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: reduceMotion ? 1 : 0 },
      uSize: { value: 2.7 },
      uPixelRatio: { value: dpr },
      uMouse: { value: new THREE.Vector2() },
      uRestYaw: { value: REST_YAW[species] ?? 0.5 },
      uOpacity: { value: reduceMotion ? 0.85 : 0 },
      uLight: { value: 0 },
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
    points.scale.setScalar(REST_SCALE[species] ?? 1)
    scene.add(points)


    /*
     * Keep the renderer in step with the theme.
     *
     * Additive blending onto a light page can only ever reach white, so the
     * light theme needs normal blending plus the ink path in the fragment
     * shader. Both have to change together, and `needsUpdate` is required
     * because blending is a compiled material property, not a uniform.
     */
    function syncTheme() {
      const light = document.documentElement.getAttribute('data-theme') === 'light'
      uniforms.uLight.value = light ? 1 : 0
      material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending
      material.needsUpdate = true
    }
    syncTheme()
    window.addEventListener('petpal:prefs-changed', syncTheme)

    const mouseTarget = new THREE.Vector2()
    let raf = 0
    let running = false
    let visible = true
    const clock = new THREE.Clock()
    const started = performance.now()

    let lastW = 0
    let lastH = 0
    function resize() {
      const w = host!.clientWidth
      const h = Math.max(host!.clientHeight, 1)
      // Mobile browsers resize the viewport as the URL bar hides and shows,
      // which fires this observer mid-scroll. `setSize` reallocates the drawing
      // buffer, so it is skipped for small height-only changes; the projection
      // below is cheap and always runs.
      if (w !== lastW || Math.abs(h - lastH) / Math.max(lastH, 1) > 0.2) {
        renderer.setSize(w, h, false)
        lastW = w
        lastH = h
      }
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      // Frame by fitting the subject, not by an arbitrary width threshold.
      // The old `w < 640 ? 10.5 : 7.6` pushed the camera far back for the
      // header’s narrow pane, which is why the betta rendered as a small blob.
      const vFov = (45 * Math.PI) / 180
      const halfTan = Math.tan(vFov / 2)
      // The half-extents the subject must fit inside. Tightened from 3.2/3.4:
      // these animals earn their space, and the markings in particular need
      // size to read — three white bars on a small clownfish are three specks.
      const fitByHeight = 2.85 / halfTan
      const fitByWidth = 3.0 / (camera.aspect * halfTan)
      camera.position.z = Math.max(fitByHeight, fitByWidth)
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
      // Mouse only. On a phone every scroll drags a pointer across the screen,
      // which swung the subject about while the page was moving.
      if (e.pointerType !== 'mouse') return
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
      window.removeEventListener('petpal:prefs-changed', syncTheme)
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
