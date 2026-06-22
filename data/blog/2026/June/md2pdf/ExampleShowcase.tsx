'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Code, ExternalLink, RefreshCw } from 'lucide-react'

interface Example {
  name: string
  mdPath: string
  pdfPath: string
}

const EXAMPLES: Record<string, Example> = {
  invoice: {
    name: 'Business Invoice',
    mdPath: '/static/images/2026/md2pdf/examples/invoice.md',
    pdfPath: '/static/images/2026/md2pdf/examples/invoice.pdf',
  },
  cv: {
    name: 'Simple CV / Resume',
    mdPath: '/static/images/2026/md2pdf/examples/cv.md',
    pdfPath: '/static/images/2026/md2pdf/examples/cv.pdf',
  },
  roadmap: {
    name: 'Project Roadmap',
    mdPath: '/static/images/2026/md2pdf/examples/roadmap.md',
    pdfPath: '/static/images/2026/md2pdf/examples/roadmap.pdf',
  },
  paper: {
    name: 'Academic Paper',
    mdPath: '/static/images/2026/md2pdf/examples/paper.md',
    pdfPath: '/static/images/2026/md2pdf/examples/paper.pdf',
  },
}

export default function ExampleShowcase() {
  const [activeKey, setActiveKey] = useState<string>('invoice')
  const [markdown, setMarkdown] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  const activeExample = EXAMPLES[activeKey]

  useEffect(() => {
    setLoading(true)
    fetch(activeExample.mdPath)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load markdown')
        return res.text()
      })
      .then((text) => {
        setMarkdown(text)
        setLoading(false)
      })
      .catch((err) => {
        setMarkdown(`Error loading preview: ${err.message}`)
        setLoading(false)
      })
  }, [activeKey, activeExample.mdPath])

  return (
    <div className="my-10 font-sans">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-slate-50/50 p-1 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-950/40">
        {/* Header Tabs */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200/50 p-6 dark:border-white/5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {Object.entries(EXAMPLES).map(([key, ex]) => (
              <button
                key={key}
                onClick={() => setActiveKey(key)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                  activeKey === key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <a
              href={activeExample.mdPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-blue-500"
            >
              Source <ExternalLink size={12} />
            </a>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a
              href={activeExample.pdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:text-green-500"
            >
              Compiled PDF <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Side-by-Side Split Viewer */}
        <div className="grid h-[600px] grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Markdown Code Viewer */}
          <div className="flex h-full min-h-0 flex-col border-b border-slate-200/50 dark:border-white/5 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-slate-200/50 bg-slate-100/50 px-6 py-3 dark:border-white/5 dark:bg-slate-900/50">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                <Code size={14} className="text-blue-500" /> Source Markdown
              </span>
              {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-6">
              <pre className="select-all whitespace-pre-wrap text-left font-mono text-[11px] leading-relaxed text-slate-300">
                <code>{markdown}</code>
              </pre>
            </div>
          </div>

          {/* PDF Frame Viewer */}
          <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200/50 bg-slate-100/50 px-6 py-3 dark:border-white/5 dark:bg-slate-900/50">
              <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
                <FileText size={14} className="text-green-500" /> Compiled PDF
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden bg-white">
              <embed
                src={activeExample.pdfPath}
                type="application/pdf"
                className="absolute inset-0 h-full w-full bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
