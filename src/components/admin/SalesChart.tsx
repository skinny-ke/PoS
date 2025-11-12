'use client'

import { BarChart3, TrendingUp, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SalesChartProps {
  data: Array<{ date: string; amount: number; count: number }>
}

export function SalesChart({ data }: SalesChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Sales Trend (Last 7 Days)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((day, index) => {
            const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
            return (
              <div key={day.date} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-24 text-right text-sm font-medium">
                  KSh {day.amount.toLocaleString()}
                </div>
                <div className="w-12 text-right text-xs text-gray-500">
                  {day.count} sales
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}