'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  UserPlus, 
  Settings,
  AlertTriangle,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLog {
  id: string
  action: string
  entityType: string
  entityId: string
  userName?: string
  oldValues?: any
  newValues?: any
  createdAt: Date
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadRecentActivity = async () => {
    try {
      const response = await fetch('/api/audit-logs?limit=10')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActivityIcon = (action: string, entityType: string) => {
    switch (action) {
      case 'create':
        return entityType === 'User' ? 
          <UserPlus className="h-4 w-4 text-green-500" /> :
          <Package className="h-4 w-4 text-green-500" />
      case 'update':
        return <Settings className="h-4 w-4 text-blue-500" />
      case 'delete':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'sale':
        return <ShoppingCart className="h-4 w-4 text-purple-500" />
      case 'stock_adjustment':
        return <TrendingUp className="h-4 w-4 text-orange-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getActivityDescription = (activity: ActivityLog) => {
    const { action, entityType, newValues, userName } = activity
    
    switch (action) {
      case 'create':
        if (entityType === 'Sale') {
          return `New sale processed by ${userName || 'System'}`
        } else if (entityType === 'Product') {
          return `Product added by ${userName || 'System'}`
        } else if (entityType === 'User') {
          return `User created by ${userName || 'System'}`
        }
        return `${entityType} created by ${userName || 'System'}`
      
      case 'update':
        if (entityType === 'Product') {
          const changes = JSON.parse(newValues || '{}')
          return `Product updated by ${userName || 'System'}`
        }
        return `${entityType} updated by ${userName || 'System'}`
      
      case 'delete':
        return `${entityType} deleted by ${userName || 'System'}`
      
      case 'sale':
        const saleInfo = JSON.parse(newValues || '{}')
        return `Sale ${saleInfo.saleNumber} - ${saleInfo.paymentMethod} payment`
      
      case 'stock_adjustment':
        return `Stock adjusted by ${userName || 'System'}`
      
      default:
        return `${activity.action} performed on ${entityType}`
    }
  }

  const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'Sale':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'Product':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'User':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'Category':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.action, activity.entityType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getEntityBadgeColor(activity.entityType)}`}
                    >
                      {activity.entityType}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 dark:text-white">
                    {getActivityDescription(activity)}
                  </p>
                  
                  {activity.userName && (
                    <p className="text-xs text-gray-500 mt-1">
                      by {activity.userName}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            <div className="text-center pt-2">
              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                View all activity logs
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}