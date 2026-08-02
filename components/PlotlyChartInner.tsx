'use client'

import React, { useEffect, useState, useMemo } from 'react'
import createPlotlyComponent from 'react-plotly.js/factory'
import Plotly from 'plotly.js-dist-min'
import { useTheme } from 'next-themes'

const Plot = createPlotlyComponent(Plotly)

export interface PlotlyChartProps {
  src?: string
  spec?: {
    data?: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    config?: Partial<Plotly.Config>
  }
  data?: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  title?: string
  caption?: string
  height?: number | string
  className?: string
  maxLabelLength?: number
}

// Utility function to wrap long label strings with <br> HTML breaks
function wrapText(text: string, maxChar: number = 22): string {
  if (typeof text !== 'string' || text.length <= maxChar || text.includes('<br>')) {
    return text
  }
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length > maxChar) {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    } else {
      currentLine += (currentLine ? ' ' : '') + word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.join('<br>')
}

export function PlotlyChartInner({
  src,
  spec,
  data: dataProp,
  layout: layoutProp,
  config: configProp,
  title,
  caption,
  height = 440,
  className = '',
  maxLabelLength = 22,
}: PlotlyChartProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [fetchedSpec, setFetchedSpec] = useState<{
    data?: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    config?: Partial<Plotly.Config>
  } | null>(null)
  const [loading, setLoading] = useState(Boolean(src))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!src) return

    setLoading(true)
    setError(null)
    fetch(src)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load chart data (${res.status} ${res.statusText})`)
        }
        return res.json()
      })
      .then((json) => {
        setFetchedSpec(json.spec || json)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading Plotly JSON:', err)
        setError(err.message || 'Error loading chart dataset')
        setLoading(false)
      })
  }, [src])

  const rawData = useMemo(
    () => dataProp || spec?.data || fetchedSpec?.data || [],
    [dataProp, spec?.data, fetchedSpec?.data]
  )
  const rawLayout = useMemo(
    () => layoutProp || spec?.layout || fetchedSpec?.layout || {},
    [layoutProp, spec?.layout, fetchedSpec?.layout]
  )
  const rawConfig = useMemo(
    () => configProp || spec?.config || fetchedSpec?.config || {},
    [configProp, spec?.config, fetchedSpec?.config]
  )

  const isDark = mounted && resolvedTheme === 'dark'

  // Postprocess data for optimal contrast, readability, and automatic line wrapping
  const processedData = useMemo(() => {
    const textColor = isDark ? '#f8fafc' : '#0f172a'

    return rawData.map((trace: Plotly.Data) => {
      const updatedTrace: Record<string, unknown> = { ...trace }

      // Auto-wrap long string labels on Y-axis (for horizontal charts) or X-axis (for vertical charts)
      if (updatedTrace.orientation === 'h' && Array.isArray(updatedTrace.y)) {
        updatedTrace.y = updatedTrace.y.map((item: unknown) =>
          typeof item === 'string' ? wrapText(item, maxLabelLength) : item
        )
      } else if (Array.isArray(updatedTrace.x)) {
        updatedTrace.x = updatedTrace.x.map((item: unknown) =>
          typeof item === 'string' ? wrapText(item, maxLabelLength) : item
        )
      }

      // Postprocess Bar charts for crisp text
      if (updatedTrace.type === 'bar') {
        updatedTrace.cliponaxis = false

        if (
          updatedTrace.orientation === 'h' &&
          (!updatedTrace.textposition ||
            updatedTrace.textposition === 'auto' ||
            updatedTrace.textposition === 'inside')
        ) {
          updatedTrace.textposition = 'outside'
        }

        updatedTrace.textfont = {
          color: textColor,
          size: 12,
          family: 'Inter, system-ui, sans-serif',
          ...((updatedTrace.textfont as Record<string, unknown>) || {}),
        }
      }

      return updatedTrace as Plotly.Data
    })
  }, [rawData, isDark, maxLabelLength])

  // Postprocess layout for dark/light themes, typography, annotations and margins
  const themeLayout = useMemo(() => {
    const textColor = isDark ? '#f8fafc' : '#0f172a'
    const mutedTextColor = isDark ? '#cbd5e1' : '#334155'
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
    const zeroLineColor = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)'

    const isHorizontalBar = rawData.some(
      (t: Plotly.Data) => 'orientation' in t && t.orientation === 'h'
    )

    const mergedLayout: Partial<Plotly.Layout> = {
      autosize: true,
      margin: {
        l: isHorizontalBar ? 150 : 70,
        r: 50,
        t: rawLayout.title || title ? 60 : 50,
        b: 65,
        pad: 6,
        ...(rawLayout.margin || {}),
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        size: 13,
        color: textColor,
        ...(rawLayout.font || {}),
      },
      legend: {
        font: { color: textColor, size: 12 },
        orientation: 'h',
        y: -0.22,
        x: 0.5,
        xanchor: 'center',
        ...(rawLayout.legend || {}),
      },
      xaxis: {
        automargin: true,
        gridcolor: gridColor,
        zerolinecolor: zeroLineColor,
        tickfont: { color: mutedTextColor, size: 12 },
        title: rawLayout.xaxis?.title
          ? {
              ...(typeof rawLayout.xaxis.title === 'string'
                ? { text: rawLayout.xaxis.title }
                : rawLayout.xaxis.title),
              font: { color: textColor, size: 13, weight: 600 },
            }
          : undefined,
        ...(rawLayout.xaxis || {}),
      },
      yaxis: {
        automargin: true,
        gridcolor: gridColor,
        zerolinecolor: zeroLineColor,
        tickfont: { color: mutedTextColor, size: 12 },
        title: rawLayout.yaxis?.title
          ? {
              ...(typeof rawLayout.yaxis.title === 'string'
                ? { text: rawLayout.yaxis.title }
                : rawLayout.yaxis.title),
              font: { color: textColor, size: 13, weight: 600 },
            }
          : undefined,
        ...(rawLayout.yaxis || {}),
      },
      ...rawLayout,
    }

    // Dynamic theme styling for layout annotations (e.g. sub-chart titles)
    if (Array.isArray(rawLayout.annotations)) {
      mergedLayout.annotations = rawLayout.annotations.map((ann: Record<string, unknown>) => ({
        ...ann,
        font: {
          color: textColor,
          family: 'Inter, system-ui, sans-serif',
          ...((ann.font as Record<string, unknown>) || {}),
        },
      })) as Partial<Plotly.Annotations>[]
    }

    if (title && !mergedLayout.title) {
      mergedLayout.title = {
        text: title,
        font: { color: textColor, size: 16 },
      }
    } else if (mergedLayout.title && typeof mergedLayout.title === 'object') {
      mergedLayout.title = {
        ...mergedLayout.title,
        font: { color: textColor, size: 16, ...(mergedLayout.title.font || {}) },
      }
    }

    return mergedLayout
  }, [rawLayout, rawData, isDark, title])

  const defaultConfig: Partial<Plotly.Config> = useMemo(
    () => ({
      responsive: true,
      displayModeBar: false,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'chart',
        height: 600,
        width: 1000,
        scale: 2,
      },
      ...rawConfig,
    }),
    [rawConfig]
  )

  if (loading) {
    return (
      <div
        style={{ height }}
        className="my-6 flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50"
      >
        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span>Loading interactive chart...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-6 rounded-xl border border-red-200 bg-red-50/50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
        <p className="font-semibold">Unable to display chart</p>
        <p className="mt-1 text-xs opacity-80">{error}</p>
      </div>
    )
  }

  return (
    <figure
      className={`my-6 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80 ${className}`}
    >
      <div style={{ width: '100%', height }}>
        <Plot
          data={processedData}
          layout={themeLayout}
          config={defaultConfig}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
