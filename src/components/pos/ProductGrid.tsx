'use client'

import { useState, useEffect } from 'react'
import { usePOSStore } from '@/stores/posStore'
import { Product } from '@/types'
import { Package, Search } from 'lucide-react'

export function ProductGrid() {
  const { addToCart, cart } = usePOSStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [selectedCategory, searchTerm])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      params.append('limit', '50')

      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity > 0) {
      addToCart(product, 1)
    }
  }

  const isInCart = (productId: string) => {
    return cart.items.some(item => item.product.id === productId)
  }

  const formatCurrency = (amount: number) => `KSh ${amount.toFixed(2)}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Products
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {products.length} products
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Categories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No products found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'No products available in this category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const inCart = isInCart(product.id)
            return (
              <div
                key={product.id}
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-2 transition-all cursor-pointer hover:shadow-md ${
                  inCart
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : product.stockQuantity === 0
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                onClick={() => handleAddToCart(product)}
              >
                <div className="aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg mb-3 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-400" />
                  )}
                </div>

                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                  {product.name}
                </h3>

                <div className="space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Stock: {product.stockQuantity}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(product.retailPrice)}
                    </span>
                    {product.wholesaleTiers && product.wholesaleTiers.length > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Wholesale
                      </span>
                    )}
                  </div>

                  {product.stockQuantity === 0 && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {inCart && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                        In Cart
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}