'use client'

import dynamic from 'next/dynamic'
import type { PlotlyChartProps } from './PlotlyChartInner'

const PlotlyChartDynamic = dynamic(
  () => import('./PlotlyChartInner').then((mod) => mod.PlotlyChartInner),
  {
    ssr: false,
    loading: () => (
      <div className="my-6 flex h-72 w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span>Loading chart...</span>
        </div>
      </div>
    ),
  }
)

export default function PlotlyChart(props: PlotlyChartProps) {
  return <PlotlyChartDynamic {...props} />
}
