'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import siteMetadata from '@/data/siteMetadata'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  history: { x: number; y: number }[]
  color: string
  lr: number
  momentum: number
}

const HeroSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const themeRef = useRef(resolvedTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    themeRef.current = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    if (!mounted) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number

    // Set canvas dimensions based on container
    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      canvas.width = (rect?.width || 800) * window.devicePixelRatio
      canvas.height = (rect?.height || 300) * window.devicePixelRatio
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Feature coordinates and properties
    // Valley 1: Global Minimum
    const valley1 = { x: 0.75, y: 0.65, amp: -400, sigma: 180 }
    // Valley 2: Local Minimum
    const valley2 = { x: 0.25, y: 0.35, amp: -250, sigma: 120 }
    // Hill 1: Obstacle (Peak)
    const hill1 = { x: 0.48, y: 0.5, amp: 350, sigma: 140 }

    // Dynamic mouse target (starts inactive)
    const mouseValley = { x: 0, y: 0, amp: -600, sigma: 220, active: false }
    const clickRipple = { x: 0, y: 0, radius: 0, active: false }

    const colors = [
      '#6366f1', // indigo-500
      '#818cf8', // indigo-400
      '#ec4899', // pink-500
      '#f43f5e', // rose-500
      '#f59e0b', // amber-500
    ]

    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)]

    // Create a particle
    const createParticle = (x?: number, y?: number): Particle => {
      const W = canvas.width
      const H = canvas.height
      return {
        x: x !== undefined ? x : Math.random() * W,
        y: y !== undefined ? y : Math.random() * H,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        history: [],
        color: getRandomColor(),
        lr: 0.05 + Math.random() * 0.08,
        momentum: 0.9 + Math.random() * 0.05,
      }
    }

    const maxParticles = 40
    let particles: Particle[] = Array.from({ length: maxParticles }, () => createParticle())

    // Track mouse interactions
    const getCanvasMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * window.devicePixelRatio,
        y: (e.clientY - rect.top) * window.devicePixelRatio,
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getCanvasMousePos(e)
      mouseValley.x = pos.x
      mouseValley.y = pos.y
      mouseValley.active = true

      if (Math.random() < 0.2 && particles.length < 80) {
        particles.push(createParticle(pos.x, pos.y))
      }
    }

    const handleMouseLeave = () => {
      mouseValley.active = false
    }

    const handleCanvasClick = (e: MouseEvent) => {
      const pos = getCanvasMousePos(e)
      clickRipple.x = pos.x
      clickRipple.y = pos.y
      clickRipple.radius = 1
      clickRipple.active = true

      valley1.x = pos.x / canvas.width
      valley1.y = pos.y / canvas.height

      for (let i = 0; i < 20; i++) {
        particles.push(
          createParticle(pos.x + (Math.random() - 0.5) * 30, pos.y + (Math.random() - 0.5) * 30)
        )
      }

      if (particles.length > 90) {
        particles = particles.slice(particles.length - 80)
      }
    }

    const canvasEl = canvas
    canvasEl.addEventListener('mousemove', handleMouseMove)
    canvasEl.addEventListener('mouseleave', handleMouseLeave)
    canvasEl.addEventListener('click', handleCanvasClick)

    // Main animation loop
    const animate = () => {
      const W = canvas.width
      const H = canvas.height
      const isDark = themeRef.current === 'dark'

      // Clear background depending on theme for motion trails
      ctx.fillStyle = isDark ? 'rgba(3, 7, 18, 0.15)' : 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(0, 0, W, H)

      // Draw background mathematical grid lines
      ctx.strokeStyle = isDark ? 'rgba(99, 102, 241, 0.02)' : 'rgba(99, 102, 241, 0.04)'
      ctx.lineWidth = 1
      const gridSize = 40 * window.devicePixelRatio
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }

      // Helper function to draw concentric rings
      const drawContours = (
        cx: number,
        cy: number,
        maxRadius: number,
        count: number,
        color: string,
        alpha: number
      ) => {
        ctx.lineWidth = 1
        for (let i = 1; i <= count; i++) {
          const r = (i / count) * maxRadius
          ctx.strokeStyle = color
          ctx.globalAlpha = alpha * (1 - i / count)
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha = 1.0
      }

      const v1x = valley1.x * W
      const v1y = valley1.y * H
      const v2x = valley2.x * W
      const v2y = valley2.y * H
      const h1x = hill1.x * W
      const h1y = hill1.y * H

      // Valley 1: Global Minimum
      drawContours(v1x, v1y, valley1.sigma, 6, isDark ? '#6366f1' : '#4f46e5', isDark ? 0.08 : 0.05)
      // Valley 2: Local Minimum
      drawContours(v2x, v2y, valley2.sigma, 5, isDark ? '#ec4899' : '#db2777', isDark ? 0.06 : 0.04)
      // Hill 1: Obstacle Peak
      drawContours(h1x, h1y, hill1.sigma, 6, isDark ? '#f59e0b' : '#d97706', isDark ? 0.05 : 0.03)

      if (mouseValley.active) {
        drawContours(
          mouseValley.x,
          mouseValley.y,
          mouseValley.sigma * 0.8,
          4,
          isDark ? '#3b82f6' : '#2563eb',
          isDark ? 0.08 : 0.05
        )
      }

      if (clickRipple.active) {
        ctx.strokeStyle = isDark ? '#f59e0b' : '#d97706'
        ctx.lineWidth = 2
        ctx.globalAlpha = Math.max(0, 1 - clickRipple.radius / 150)
        ctx.beginPath()
        ctx.arc(clickRipple.x, clickRipple.y, clickRipple.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1.0
        clickRipple.radius += 4
        if (clickRipple.radius > 150) {
          clickRipple.active = false
        }
      }

      const getGradient = (x: number, y: number) => {
        let gx = 0.0001 * (x - W / 2)
        let gy = 0.0001 * (y - H / 2)

        const applyFeatureGrad = (fx: number, fy: number, amp: number, sigma: number) => {
          const dx = x - fx
          const dy = y - fy
          const distSq = dx * dx + dy * dy
          const gVal = amp * Math.exp(-distSq / (2 * sigma * sigma))
          const fGradX = -gVal * (dx / (sigma * sigma))
          const fGradY = -gVal * (dy / (sigma * sigma))
          gx += fGradX
          gy += fGradY
        }

        applyFeatureGrad(v1x, v1y, valley1.amp, valley1.sigma)
        applyFeatureGrad(v2x, v2y, valley2.amp, valley2.sigma)
        applyFeatureGrad(h1x, h1y, hill1.amp, hill1.sigma)

        if (mouseValley.active) {
          applyFeatureGrad(mouseValley.x, mouseValley.y, mouseValley.amp, mouseValley.sigma)
        }

        return { gx, gy }
      }

      particles.forEach((p, idx) => {
        const grad = getGradient(p.x, p.y)

        p.vx = p.vx * p.momentum - p.lr * grad.gx
        p.vy = p.vy * p.momentum - p.lr * grad.gy

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const maxSpeed = 8 * window.devicePixelRatio
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed
          p.vy = (p.vy / speed) * maxSpeed
        }

        p.x += p.vx
        p.y += p.vy

        p.history.push({ x: p.x, y: p.y })
        if (p.history.length > 25) {
          p.history.shift()
        }

        if (p.history.length > 1) {
          ctx.beginPath()
          ctx.moveTo(p.history[0].x, p.history[0].y)
          for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y)
          }
          ctx.strokeStyle = p.color
          ctx.lineWidth = 2 * window.devicePixelRatio
          ctx.lineCap = 'round'
          ctx.globalAlpha = isDark ? 0.4 : 0.6
          ctx.stroke()
          ctx.globalAlpha = 1.0
        }

        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3 * window.devicePixelRatio, 0, Math.PI * 2)
        ctx.fill()

        const velocitySq = p.vx * p.vx + p.vy * p.vy
        const isOffscreen = p.x < 0 || p.x > W || p.y < 0 || p.y > H
        const isStuck = velocitySq < 0.005

        if (isOffscreen || isStuck) {
          if (Math.random() < 0.02 || isOffscreen) {
            particles[idx] = createParticle()
          }
        }
      })

      if (particles.length > maxParticles && Math.random() < 0.05) {
        particles.pop()
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvasEl.removeEventListener('mousemove', handleMouseMove)
      canvasEl.removeEventListener('mouseleave', handleMouseLeave)
      canvasEl.removeEventListener('click', handleCanvasClick)
      cancelAnimationFrame(animationFrameId)
    }
  }, [mounted])

  return (
    <div
      ref={containerRef}
      className="relative mb-6 flex min-h-[260px] w-full overflow-hidden bg-white dark:bg-gray-950 md:min-h-[320px]"
    >
      {/* Canvas background */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Custom typography overlay */}
      <div className="pointer-events-none relative z-10 flex w-full select-none flex-col justify-end pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="bg-gradient-to-r from-indigo-600 via-pink-600 to-amber-500 bg-clip-text font-black text-transparent drop-shadow-sm filter dark:from-indigo-400 dark:via-pink-400 dark:to-amber-400">
            GRADIENT ASCENT
          </span>
        </h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base md:mt-3">
          {siteMetadata.description}
        </p>
      </div>
    </div>
  )
}

export default HeroSection
