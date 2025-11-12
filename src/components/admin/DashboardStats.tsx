'use client'

import { BarChart, TrendingUp, Users, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/components/ui/utils'

interface DashboardStatsProps {
  summary: any
  analytics: any
  customerAnalytics: any
}

export function DashboardStats({ summary, analytics, customerAnalytics }: DashboardStatsProps) {
  const stats = [
    {
      title: 'Today\'s Sales',
      value: `KSh ${summary.today.sales.toLocaleString()}`,
      change: '+12.5%',
      changeType: 'positive',
      icon: ShoppingCart
    },
    {
      title: 'Transactions',
      value: summary.today.transactions.toString(),
      change: '+8.2%',
      changeType: 'positive',
      icon: BarChart
    },
    {
      title: 'Low Stock Items',
      value: summary.inventory.lowStock.toString(),
      change: summary.inventory.lowStock > 10 ? 'High' : 'Normal',
      changeType: summary.inventory.lowStock > 10 ? 'negative' : 'positive',
      icon: TrendingUp
    },
    {
      title: 'Active Customers',
      value: customerAnalytics.totalCustomers.toString(),
      change: '+15.3%',
      changeType: 'positive',
      icon: Users
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </div>
              <p className={cn(
                "text-xs font-medium",
                stat.changeType === 'positive' 
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}