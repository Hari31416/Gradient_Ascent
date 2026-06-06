'use client'

/* eslint-disable jsx-a11y/no-static-element-interactions */

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

let mermaidInitialized = false

interface MermaidProps {
  chart: string
}

export default function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [mounted, setMounted] = useState<boolean>(false)
  const [id] = useState(() => `mermaid-${Math.floor(Math.random() * 1000000)}`)

  // Inline view state
  const [scale, setScale] = useState<number>(1)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const inlineContainerRef = useRef<HTMLDivElement>(null)

  // Fullscreen Modal view state
  const [modalScale, setModalScale] = useState<number>(1)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [modalIsDragging, setModalIsDragging] = useState<boolean>(false)
  const [modalDragStart, setModalDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const modalContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            themeVariables: {
              background: 'transparent',
            },
          })
          mermaidInitialized = true
        }

        const cleanChart = chart.trim()
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart)
        setSvg(renderedSvg)
        setError(false)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(true)
      }
    }

    renderChart()
  }, [chart, id])

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
        setModalScale(1)
        setModalPosition({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // --- Inline interaction handlers ---
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const zoomFactor = 1.1
    const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor
    setScale(Math.min(Math.max(newScale, 0.5), 4))
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0]
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      })
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // --- Fullscreen Modal interaction handlers ---
  const handleModalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const zoomFactor = 1.1
    const newScale = e.deltaY < 0 ? modalScale * zoomFactor : modalScale / zoomFactor
    setModalScale(Math.min(Math.max(newScale, 0.4), 6))
  }

  const handleModalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    setModalIsDragging(true)
    setModalDragStart({ x: e.clientX - modalPosition.x, y: e.clientY - modalPosition.y })
  }

  const handleModalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalIsDragging) return
    setModalPosition({
      x: e.clientX - modalDragStart.x,
      y: e.clientY - modalDragStart.y,
    })
  }

  const handleModalMouseUp = () => {
    setModalIsDragging(false)
  }

  const handleModalTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setModalIsDragging(true)
      const touch = e.touches[0]
      setModalDragStart({ x: touch.clientX - modalPosition.x, y: touch.clientY - modalPosition.y })
    }
  }

  const handleModalTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (modalIsDragging && e.touches.length === 1) {
      const touch = e.touches[0]
      setModalPosition({
        x: touch.clientX - modalDragStart.x,
        y: touch.clientY - modalDragStart.y,
      })
    }
  }

  const handleModalTouchEnd = () => {
    setModalIsDragging(false)
  }

  const handleModalReset = () => {
    setModalScale(1)
    setModalPosition({ x: 0, y: 0 })
  }

  if (error) {
    return (
      <pre className="overflow-x-auto rounded bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="flex h-32 items-center justify-center rounded bg-gray-50 dark:bg-gray-900">
        <span className="animate-pulse text-sm text-gray-500">Rendering diagram...</span>
      </div>
    )
  }

  // Generate a safe unique ID for modal render
  const modalSvgId = `${id}-modal`
  const modalSvg = svg.replace(new RegExp(id, 'g'), modalSvgId)

  return (
    <>
      {/* Inline view block */}
      <div
        ref={inlineContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        className="group relative my-6 flex h-[350px] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50 md:h-[450px]"
      >
        {/* Dynamic transform wrapper */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
          className="flex h-full w-full items-center justify-center [&>svg]:!h-auto [&>svg]:!max-h-full [&>svg]:!w-auto [&>svg]:!max-w-full"
        />

        {/* Floating control overlay (only visible on container hover or focus) */}
        <div className="absolute bottom-4 right-4 z-10 flex select-none flex-col gap-2 opacity-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">
          {/* Action bar (Zoom & Fullscreen) */}
          <div className="flex items-center justify-center gap-1 rounded-lg border border-gray-700/60 bg-gray-900/80 p-1 shadow-lg backdrop-blur-sm dark:bg-gray-950/80">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setScale((s) => Math.min(s * 1.2, 4))
              }}
              className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setScale((s) => Math.max(s / 1.2, 0.5))
              }}
              className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleReset()
              }}
              className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
              title="Reset Position"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsFullscreen(true)
                handleModalReset()
              }}
              className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
              title="Open Fullscreen Modal"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay Modal (rendered via React Portal at body level) */}
      {isFullscreen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm md:p-10">
            {/* Modal Box */}
            <div className="dark:border-gray-850 flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:bg-gray-900">
              {/* Modal Header */}
              <div className="dark:border-gray-850 flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  Interactive Diagram Viewer
                </span>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  title="Close Viewer (Esc)"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body (Viewport) */}
              <div
                ref={modalContainerRef}
                onWheel={handleModalWheel}
                onMouseDown={handleModalMouseDown}
                onMouseMove={handleModalMouseMove}
                onMouseUp={handleModalMouseUp}
                onMouseLeave={handleModalMouseUp}
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
                style={{ cursor: modalIsDragging ? 'grabbing' : 'grab' }}
                className="relative flex-1 overflow-hidden bg-gray-50/50 dark:bg-gray-950/20"
              >
                {/* SVG Render with transform */}
                <div
                  style={{
                    transform: `translate(${modalPosition.x}px, ${modalPosition.y}px) scale(${modalScale})`,
                    transformOrigin: 'center center',
                    transition: modalIsDragging ? 'none' : 'transform 0.1s ease-out',
                  }}
                  dangerouslySetInnerHTML={{ __html: modalSvg }}
                  className="flex h-full w-full items-center justify-center p-6 [&>svg]:!h-auto [&>svg]:!max-h-full [&>svg]:!w-auto [&>svg]:!max-w-full"
                />

                {/* Floating control overlay in modal */}
                <div className="absolute bottom-6 right-6 flex select-none flex-col gap-2">
                  {/* D-Pad controls for panning */}
                  <div className="grid h-24 w-24 grid-cols-3 items-center justify-center gap-1 rounded-lg border border-gray-700/60 bg-gray-900/80 p-1 shadow-lg backdrop-blur-sm dark:bg-gray-950/80">
                    <div />
                    <button
                      onClick={() => setModalPosition((p) => ({ ...p, y: p.y + 60 }))}
                      className="flex items-center justify-center rounded p-1 text-white transition-colors hover:bg-gray-800"
                      title="Pan Up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <div />

                    <button
                      onClick={() => setModalPosition((p) => ({ ...p, x: p.x + 60 }))}
                      className="flex items-center justify-center rounded p-1 text-white transition-colors hover:bg-gray-800"
                      title="Pan Left"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleModalReset}
                      className="flex items-center justify-center rounded p-1 text-white transition-colors hover:bg-gray-800"
                      title="Reset Position"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => setModalPosition((p) => ({ ...p, x: p.x - 60 }))}
                      className="flex items-center justify-center rounded p-1 text-white transition-colors hover:bg-gray-800"
                      title="Pan Right"
                    >
                      <ChevronRight size={16} />
                    </button>

                    <div />
                    <button
                      onClick={() => setModalPosition((p) => ({ ...p, y: p.y - 60 }))}
                      className="flex items-center justify-center rounded p-1 text-white transition-colors hover:bg-gray-800"
                      title="Pan Down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <div />
                  </div>

                  {/* Zoom controls */}
                  <div className="flex items-center justify-center gap-1 rounded-lg border border-gray-700/60 bg-gray-900/80 p-1 shadow-lg backdrop-blur-sm dark:bg-gray-950/80">
                    <button
                      onClick={() => setModalScale((s) => Math.min(s * 1.2, 6))}
                      className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      onClick={() => setModalScale((s) => Math.max(s / 1.2, 0.4))}
                      className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={handleModalReset}
                      className="rounded p-1.5 text-white transition-colors hover:bg-gray-800"
                      title="Reset Position"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
