'use client'

import { useEffect, useRef } from 'react'

/**
 * Insane animated hero background — a living particle constellation.
 * Particles drift, connect with lines, and react to the cursor with a
 * repulsion + glow field. GPU-light, pure canvas 2D.
 */
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0, h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mouse = { x: -9999, y: -9999 }

    const COLORS = ['#FF7A6B', '#2DD4BF', '#2DD4BF', '#2DD4BF', '#FFB84D']

    interface P { x: number; y: number; vx: number; vy: number; r: number; c: string; baseR: number }
    let particles: P[] = []

    function resize() {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(90, Math.floor((w * h) / 14000))
      particles = Array.from({ length: count }, () => {
        const r = Math.random() * 2 + 1
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r, baseR: r,
          c: COLORS[Math.floor(Math.random() * COLORS.length)],
        }
      })
    }

    function tick() {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)

      // draw connections
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130) {
            const op = (1 - dist / 130) * 0.18
            ctx.strokeStyle = `rgba(255,122,107,${op})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // update + draw particles
      for (const p of particles) {
        // cursor repulsion + glow
        const dx = p.x - mouse.x, dy = p.y - mouse.y
        const md = Math.hypot(dx, dy)
        if (md < 160) {
          const force = (1 - md / 160) * 1.4
          p.vx += (dx / (md || 1)) * force * 0.08
          p.vy += (dy / (md || 1)) * force * 0.08
          p.r = p.baseR + (1 - md / 160) * 2.5
        } else {
          p.r += (p.baseR - p.r) * 0.1
        }

        p.x += p.vx; p.y += p.vy
        p.vx *= 0.985; p.vy *= 0.985

        // gentle drift floor
        if (Math.abs(p.vx) < 0.08) p.vx += (Math.random() - 0.5) * 0.06
        if (Math.abs(p.vy) < 0.08) p.vy += (Math.random() - 0.5) * 0.06

        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c
        ctx.shadowColor = p.c
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // cursor light orb
      if (mouse.x > -9000) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 180)
        g.addColorStop(0, 'rgba(255,122,107,0.10)')
        g.addColorStop(1, 'rgba(255,122,107,0)')
        ctx.fillStyle = g
        ctx.fillRect(mouse.x - 180, mouse.y - 180, 360, 360)
      }

      raf = requestAnimationFrame(tick)
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }
    function onLeave() { mouse.x = -9999; mouse.y = -9999 }

    resize()
    tick()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
