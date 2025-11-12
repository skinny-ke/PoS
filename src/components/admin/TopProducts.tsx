'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, TrendingUp } from 'lucide-react'

interface TopProductsProps {
  products: Array<{
    id: string
    name: string
    quantitySold: number
    revenue: number
    profitMargin: number
  }>
}

export function TopProducts({ products }: TopProductsProps) {
  const formatCurrency = (amount: number) => `KSh ${amount.toLocaleString()}`
  const formatPercentage = (margin: number) => `${margin.toFixed(1)}%`

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Top Products</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p>No sales data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Top Products (Last 7 Days)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.slice(0, 5).map((product, index) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {product.name}
                  </h4>
                  <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                    <span>{product.quantitySold} sold</span>
                    <span>{formatCurrency(product.revenue)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                <Badge
                  variant={product.profitMargin >= 30 ? 'default' : 
                          product.profitMargin >= 15 ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {formatPercentage(product.profitMargin)} margin
                </Badge>
              </div>
            </div>
          ))}
          
          {products.length > 5 && (
            <div className="text-center pt-2">
              <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                View all {products.length} products
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}