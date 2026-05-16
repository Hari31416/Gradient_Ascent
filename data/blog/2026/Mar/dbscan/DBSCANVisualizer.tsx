'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Settings2,
  Activity,
  Zap,
  Target,
  Maximize2,
  Info,
} from 'lucide-react'

// types
type PointStatus = 'unvisited' | 'visiting' | 'core' | 'border' | 'noise'
type DatasetType = 'blobs' | 'rings' | 'smiley' | 'custom'

interface Point {
  x: number
  y: number
  id: number
  status: PointStatus
  clusterId?: number
}

interface Step {
  type: 'visit' | 'expand' | 'neighbor_check' | 'assign'
  pointId: number
  neighbors?: number[]
  clusterId?: number
  status?: PointStatus
}

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#14b8a6', // teal
]

const DBSCANVisualizer = () => {
  // Params
  const [epsilon, setEpsilon] = useState(40)
  const [minPoints, setMinPoints] = useState(3)
  const [datasetType, setDatasetType] = useState<DatasetType>('blobs')
  const [speed, setSpeed] = useState(70)

  // State
  const [points, setPoints] = useState<Point[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [steps, setSteps] = useState<Step[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [activePointId, setActivePointId] = useState<number | null>(null)
  const [neighborIds, setNeighborIds] = useState<number[]>([])
  const [showSettings, setShowSettings] = useState(true)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const viewBoxSize = { width: 800, height: 500 }

  // Dataset Generation
  const generatePoints = useCallback(
    (type: DatasetType) => {
      const newPoints: Point[] = []
      let id = 0

      const addPoint = (x: number, y: number) => {
        newPoints.push({ x, y, id: id++, status: 'unvisited' })
      }

      if (type === 'blobs') {
        for (let i = 0; i < 30; i++) addPoint(150 + Math.random() * 100, 150 + Math.random() * 100)
        for (let i = 0; i < 30; i++) addPoint(550 + Math.random() * 100, 300 + Math.random() * 100)
        for (let i = 0; i < 25; i++) addPoint(200 + Math.random() * 80, 350 + Math.random() * 80)
      } else if (type === 'rings') {
        for (let i = 0; i < 50; i++) {
          const a = (i / 50) * Math.PI * 2
          const r = 100 + Math.random() * 20
          addPoint(400 + Math.cos(a) * r, 250 + Math.sin(a) * r)
        }
        for (let i = 0; i < 80; i++) {
          const a = (i / 80) * Math.PI * 2
          const r = 200 + Math.random() * 30
          addPoint(400 + Math.cos(a) * r, 250 + Math.sin(a) * r)
        }
      } else if (type === 'smiley') {
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2
          addPoint(400 + Math.cos(a) * 220, 250 + Math.sin(a) * 220)
        }
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2
          addPoint(320 + Math.cos(a) * 25, 180 + Math.sin(a) * 25)
          addPoint(480 + Math.cos(a) * 25, 180 + Math.sin(a) * 25)
        }
        for (let i = 0; i < 25; i++) {
          const a = (i / 25) * Math.PI * 0.8 + 0.1 * Math.PI
          addPoint(400 + Math.cos(a) * 140, 280 + Math.sin(a) * 140)
        }
      }

      if (type !== 'custom') {
        for (let i = 0; i < 20; i++) {
          addPoint(Math.random() * viewBoxSize.width, Math.random() * viewBoxSize.height)
        }
      }

      setPoints(newPoints)
      setCurrentStepIndex(-1)
      setSteps([])
      setIsPlaying(false)
    },
    [viewBoxSize.width, viewBoxSize.height]
  )

  useEffect(() => {
    generatePoints('blobs')
  }, [generatePoints])

  const computeSteps = useCallback(() => {
    const pts: (Point & { visited: boolean })[] = points.map((p) => ({
      ...p,
      visited: false,
      clusterId: undefined,
    }))
    const generatedSteps: Step[] = []
    let currentClusterId = 0

    const getNeighbors = (pIdx: number) => {
      const neighbors: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const d = Math.sqrt((pts[i].x - pts[pIdx].x) ** 2 + (pts[i].y - pts[pIdx].y) ** 2)
        if (d <= epsilon) neighbors.push(i)
      }
      return neighbors
    }

    for (let i = 0; i < pts.length; i++) {
      if (pts[i].visited) continue
      pts[i].visited = true
      generatedSteps.push({ type: 'visit', pointId: pts[i].id })

      const neighbors = getNeighbors(i)
      generatedSteps.push({
        type: 'neighbor_check',
        pointId: pts[i].id,
        neighbors: neighbors.map((n) => pts[n].id),
      })

      if (neighbors.length < minPoints) {
        generatedSteps.push({ type: 'assign', pointId: pts[i].id, status: 'noise' })
      } else {
        currentClusterId++
        generatedSteps.push({
          type: 'assign',
          pointId: pts[i].id,
          status: 'core',
          clusterId: currentClusterId,
        })

        const queue = neighbors.filter((n) => n !== i)
        let head = 0
        while (head < queue.length) {
          const nextIdx = queue[head++]
          const nextPt = pts[nextIdx]

          if (!nextPt.visited) {
            nextPt.visited = true
            generatedSteps.push({ type: 'expand', pointId: nextPt.id })

            const nextNeighbors = getNeighbors(nextIdx)
            generatedSteps.push({
              type: 'neighbor_check',
              pointId: nextPt.id,
              neighbors: nextNeighbors.map((n) => pts[n].id),
            })

            if (nextNeighbors.length >= minPoints) {
              nextPt.clusterId = currentClusterId
              generatedSteps.push({
                type: 'assign',
                pointId: nextPt.id,
                status: 'core',
                clusterId: currentClusterId,
              })
              for (const nIdx of nextNeighbors) {
                if (!queue.includes(nIdx)) queue.push(nIdx)
              }
            } else {
              nextPt.clusterId = currentClusterId
              generatedSteps.push({
                type: 'assign',
                pointId: nextPt.id,
                status: 'border',
                clusterId: currentClusterId,
              })
            }
          } else if (nextPt.clusterId === undefined) {
            nextPt.clusterId = currentClusterId
            generatedSteps.push({
              type: 'assign',
              pointId: nextPt.id,
              status: 'border',
              clusterId: currentClusterId,
            })
          }
        }
      }
    }
    setSteps(generatedSteps)
    setCurrentStepIndex(0)
  }, [points, epsilon, minPoints])

  useEffect(() => {
    if (isPlaying && currentStepIndex < steps.length - 1) {
      const delay = Math.max(5, 400 - speed * 3.8)
      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
      }, delay)
    } else if (currentStepIndex >= steps.length - 1 && steps.length > 0) {
      setIsPlaying(false)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, currentStepIndex, steps.length, speed])

  const displayPoints = useMemo(() => {
    const pts = points.map((p) => ({ ...p }))
    if (currentStepIndex === -1) return pts

    for (let i = 0; i <= currentStepIndex; i++) {
      const step = steps[i]
      const p = pts.find((pt) => pt.id === step.pointId)
      if (!p) continue
      if (step.type === 'assign') {
        p.status = step.status!
        p.clusterId = step.clusterId
      }
    }

    const currentStep = steps[currentStepIndex]
    if (currentStep) {
      setActivePointId(currentStep.pointId)
      if (currentStep.type === 'neighbor_check') {
        setNeighborIds(currentStep.neighbors || [])
      } else if (currentStep.type === 'visit' || currentStep.type === 'expand') {
        setNeighborIds([])
      }
    }

    return pts
  }, [points, steps, currentStepIndex])

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setActivePointId(null)
    setNeighborIds([])
    setPoints(points.map((p) => ({ ...p, status: 'unvisited', clusterId: undefined })))
  }

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      if (steps.length === 0) computeSteps()
      setIsPlaying(true)
    }
  }

  const handleStep = () => {
    if (steps.length === 0) {
      computeSteps()
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * viewBoxSize.width
    const y = ((e.clientY - rect.top) / rect.height) * viewBoxSize.height

    const newId = points.length > 0 ? Math.max(...points.map((p) => p.id)) + 1 : 0
    setPoints([...points, { x, y, id: newId, status: 'unvisited' }])

    setCurrentStepIndex(-1)
    setSteps([])
    setIsPlaying(false)
  }

  return (
    <div className="my-10 font-sans selection:bg-indigo-500/30">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/50 bg-slate-50/50 p-1 shadow-2xl backdrop-blur-3xl dark:border-white/10 dark:bg-slate-950/40">
        {/* Background Decorative Blobs */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative flex flex-col">
          {/* Top Bar */}
          <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200/50 p-6 dark:border-white/5 md:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/40">
                <Activity className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  DBSCAN{' '}
                  <span className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                    Explorer
                  </span>
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <Zap size={10} className="text-amber-500" /> Density-Based Clustering
                </div>
              </div>
            </div>

            {/* Dataset Picker */}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-200/50 p-1.5 dark:bg-slate-800/50">
              {(['blobs', 'rings', 'smiley'] as DatasetType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setDatasetType(type)
                    generatePoints(type)
                  }}
                  className={`relative px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                    datasetType === type
                      ? 'text-indigo-600 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {datasetType === type && (
                    <div className="absolute inset-0 rounded-xl bg-slate-100 shadow-sm dark:bg-indigo-500/20" />
                  )}
                  <span className="relative z-10">{type}</span>
                </button>
              ))}
              <div className="h-6 w-[1.5px] bg-slate-300/50 dark:bg-slate-700" />
              <button
                onClick={() => {
                  setPoints([])
                  setDatasetType('custom')
                  setSteps([])
                  setCurrentStepIndex(-1)
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  datasetType === 'custom'
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Custom / Clear"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Visualizer Area */}
            <div className="relative flex-1 p-6">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.5rem] bg-slate-50 shadow-inner dark:bg-slate-950">
                <svg
                  viewBox={`0 0 ${viewBoxSize.width} ${viewBoxSize.height}`}
                  className="h-full w-full cursor-crosshair"
                  onClick={handleCanvasClick}
                >
                  <defs>
                    <pattern id="dotGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle
                        cx="2"
                        cy="2"
                        r="1"
                        fill="currentColor"
                        className="text-slate-200 dark:text-slate-700/40"
                      />
                    </pattern>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#dotGrid)" />

                  {/* Search Radius */}
                  {activePointId !== null && (
                    <circle
                      cx={displayPoints.find((p) => p.id === activePointId)?.x}
                      cy={displayPoints.find((p) => p.id === activePointId)?.y}
                      r={epsilon}
                      className="fill-indigo-500/5 stroke-indigo-500/30 transition-all duration-500 dark:fill-indigo-400/5 dark:stroke-indigo-400/40"
                      strokeWidth="2"
                    />
                  )}

                  {displayPoints.map((point) => {
                    const isActive = activePointId === point.id
                    const isNeighbor = neighborIds.includes(point.id)
                    let fillColor = '#94a3b8' // unvisited slate-400
                    let filter = ''

                    if (point.status === 'noise') fillColor = '#f43f5e'
                    else if (point.clusterId !== undefined) {
                      fillColor = COLORS[(point.clusterId - 1) % COLORS.length]
                      filter = 'url(#glow)'
                    }

                    return (
                      <g key={point.id} className="transition-all duration-500">
                        {isNeighbor && !isActive && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={12}
                            className="animate-ping-slow fill-indigo-500/20"
                          />
                        )}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isActive ? 8 : point.status === 'unvisited' ? 4 : 5}
                          fill={fillColor}
                          filter={filter}
                          className={`
                            ${isActive ? 'stroke-white stroke-2 dark:stroke-slate-950' : ''}
                            ${point.status === 'unvisited' ? 'opacity-30' : 'opacity-100'}
                          `}
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* Floating State Badge */}
                {currentStepIndex >= 0 && steps[currentStepIndex] && (
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-slate-50/90 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                        <Info size={20} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                          Current Action
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {steps[currentStepIndex].type === 'visit' &&
                            `Inspecting point #${steps[currentStepIndex].pointId}`}
                          {steps[currentStepIndex].type === 'neighbor_check' &&
                            `Evaluating radius: ${steps[currentStepIndex].neighbors?.length} neighbors found`}
                          {steps[currentStepIndex].type === 'assign' &&
                            `Point labeled as ${steps[currentStepIndex].status === 'core' ? 'Core Node' : steps[currentStepIndex].status === 'border' ? 'Edge Node' : 'Noise Point'}`}
                          {steps[currentStepIndex].type === 'expand' &&
                            `Propagating density from point #${steps[currentStepIndex].pointId}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls Grid */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePlay}
                    className={`flex h-14 w-14 items-center justify-center rounded-[1.25rem] transition-all active:scale-95 ${
                      isPlaying
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause size={24} fill="currentColor" />
                    ) : (
                      <Play size={24} fill="currentColor" className="translate-x-0.5" />
                    )}
                  </button>
                  <button
                    onClick={handleStep}
                    disabled={
                      isPlaying || (steps.length > 0 && currentStepIndex === steps.length - 1)
                    }
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-30 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <SkipForward size={20} />
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-all hover:bg-slate-100 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>

                <div className="flex-1 md:max-w-xs">
                  <div className="mb-2 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="whitespace-nowrap">Animation Progress</span>
                    <span className="font-mono text-indigo-500">
                      {steps.length > 0
                        ? Math.round(((currentStepIndex + 1) / steps.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-300"
                      style={{
                        width: `${steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Controls */}
            <div className="w-full border-t border-slate-200/50 p-6 dark:border-white/5 lg:w-80 lg:border-l lg:border-t-0">
              <div className="space-y-8">
                {/* Stats Card */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50 p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Nodes
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                      {points.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50 p-4 shadow-sm dark:border-white/5 dark:bg-slate-900/50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Clusters
                    </p>
                    <p className="text-2xl font-black text-emerald-500">
                      {displayPoints.reduce((acc, p) => Math.max(acc, p.clusterId || 0), 0)}
                    </p>
                  </div>
                </div>

                {/* Range Sliders */}
                <div className="space-y-6">
                  <div className="group">
                    <div className="mb-3 flex justify-between">
                      <label
                        htmlFor="epsilon-slider"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors group-hover:text-indigo-500"
                      >
                        <Maximize2 size={12} /> Epsilon ($\epsilon$)
                      </label>
                      <span className="font-mono text-xs font-bold text-indigo-500">
                        {epsilon}px
                      </span>
                    </div>
                    <input
                      id="epsilon-slider"
                      type="range"
                      min="10"
                      max="80"
                      value={epsilon}
                      onChange={(e) => {
                        setEpsilon(parseInt(e.target.value))
                        setSteps([])
                        setCurrentStepIndex(-1)
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-white/10"
                    />
                  </div>

                  <div className="group">
                    <div className="mb-3 flex justify-between">
                      <label
                        htmlFor="minpoints-slider"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors group-hover:text-emerald-500"
                      >
                        <Target size={12} /> MinPoints
                      </label>
                      <span className="font-mono text-xs font-bold text-emerald-500">
                        {minPoints} pts
                      </span>
                    </div>
                    <input
                      id="minpoints-slider"
                      type="range"
                      min="1"
                      max="10"
                      value={minPoints}
                      onChange={(e) => {
                        setMinPoints(parseInt(e.target.value))
                        setSteps([])
                        setCurrentStepIndex(-1)
                      }}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-white/10"
                    />
                  </div>

                  <div className="group">
                    <div className="mb-3 flex justify-between">
                      <label
                        htmlFor="speed-slider"
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors group-hover:text-amber-500"
                      >
                        <Zap size={12} /> Speed
                      </label>
                      <span className="font-mono text-xs font-bold text-amber-500">{speed}%</span>
                    </div>
                    <input
                      id="speed-slider"
                      type="range"
                      min="1"
                      max="100"
                      value={speed}
                      onChange={(e) => setSpeed(parseInt(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-white/10"
                    />
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3 rounded-[1.5rem] bg-slate-900/90 p-5 dark:bg-black/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Legend
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />{' '}
                      Core Points
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />{' '}
                      Cluster Points
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />{' '}
                      Noise / Outliers
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <div className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />{' '}
                      Unvisited
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DBSCANVisualizer
