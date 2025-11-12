'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, ShoppingCart, TrendingDown } from 'lucide-react'
import { InventoryManagementService } from '@/lib/inventoryManagement'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface InventoryAlertsProps {
  inventory: any
}

export function InventoryAlerts({ inventory }: InventoryAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const lowStockAlerts = await InventoryManagementService.getLowStockAlerts()
        setAlerts(lowStockAlerts)
      } catch (error) {
        toast.error('Failed to load inventory alerts')
      } finally {
        setIsLoading(false)
      }
    }

    loadAlerts()
  }, [])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'medium': return <Package className="h-4 w-4 text-yellow-500" />
      case 'low': return <TrendingDown className="h-4 w-4 text-blue-500" />
      default: return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Inventory Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            Loading alerts...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Inventory Alerts</span>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <Alert>
            <ShoppingCart className="h-4 w-4" />
            <AlertTitle>All Good!</AlertTitle>
            <AlertDescription>
              No low stock alerts at the moment. All products are adequately stocked.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, index) => (
              <Alert key={index} className="border-l-4 border-l-orange-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getUrgencyIcon(alert.urgency)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{alert.name}</h4>
                        <Badge variant={getUrgencyColor(alert.urgency)}>
                          {alert.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Current Stock: {alert.currentStock} | Min Level: {alert.minStockLevel}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Stockout in: {alert.daysUntilStockout} days
                      </p>
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-1">
                        {alert.recommendedAction}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">
                    Restock
                  </Button>
                </div>
              </Alert>
            ))}
            
            {alerts.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All {alerts.length} Alerts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}