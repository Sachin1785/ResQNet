"use client"

import { Clock, TrendingDown, TrendingUp, Minus } from "lucide-react"

interface ResponseTimeWidgetProps {
  avgResponseTime: number // in minutes
  previousPeriodAvg?: number // optional comparison
}

export function ResponseTimeWidget({ avgResponseTime, previousPeriodAvg }: ResponseTimeWidgetProps) {
  // Calculate trend
  let trend: 'up' | 'down' | 'neutral' = 'neutral'
  let trendValue = 0

  if (previousPeriodAvg) {
    if (avgResponseTime < previousPeriodAvg) {
      trend = 'down' // Good (faster response)
      trendValue = Math.abs(((avgResponseTime - previousPeriodAvg) / previousPeriodAvg) * 100)
    } else if (avgResponseTime > previousPeriodAvg) {
      trend = 'up' // Bad (slower response)
      trendValue = Math.abs(((avgResponseTime - previousPeriodAvg) / previousPeriodAvg) * 100)
    }
  }

  // Determine color based on response time thresholds
  const getColor = (time: number) => {
    if (time <= 5) return "text-green-500" // Excellent
    if (time <= 10) return "text-yellow-500" // Acceptable
    return "text-red-500" // Critical
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3 flex flex-col items-center justify-center min-w-[120px]">
      <div className="flex items-center gap-1.5 mb-1 text-muted-foreground text-xs font-medium uppercase tracking-wide">
        <Clock className="w-3 h-3" />
        Avg Response
      </div>
      
      <div className={`text-2xl font-bold ${getColor(avgResponseTime)}`}>
        {avgResponseTime > 0 ? `${avgResponseTime}m` : '--'}
      </div>

      {previousPeriodAvg && (
        <div className="flex items-center gap-1 mt-1 text-[10px]">
          {trend === 'down' ? (
            <TrendingDown className="w-3 h-3 text-green-500" />
          ) : trend === 'up' ? (
            <TrendingUp className="w-3 h-3 text-red-500" />
          ) : (
            <Minus className="w-3 h-3 text-muted-foreground" />
          )}
          <span className={trend === 'down' ? 'text-green-500' : trend === 'up' ? 'text-red-500' : 'text-muted-foreground'}>
            {trendValue.toFixed(1)}% vs last month
          </span>
        </div>
      )}
    </div>
  )
}
