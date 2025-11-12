'use client'

import { useState, useEffect } from 'react'
import { Search, Scan } from 'lucide-react'
import { usePOSStore } from '@/stores/posStore'
import { Product } from '@/types'

export function ProductSearch() {
  const { addToCart } = usePOSStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchTerm.length > 2) {
      searchProducts()
    } else {
      setProducts([])
    }
  }, [searchTerm])

  const searchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/products/search?q=${searchTerm}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data)
      }
    } catch (error) {
      console.error('Product search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductSelect = (product: Product) => {
    if (product.stockQuantity > 0) {
      addToCart(product, 1)
      setSearchTerm('')
      setProducts([])
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Product Search
      </h2>
      
      <div className="relative">
        <div className="flex">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name or scan barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg transition-colors">
            <Scan className="h-5 w-5" />
          </button>
        </div>

        {/* Search Results */}
        {products.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Stock: {product.stockQuantity} | KSh {product.retailPrice}
                    </p>
                  </div>
                  {product.barcode && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.barcode}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
          </div>
        )}
      </div>
    </div>
  )
}