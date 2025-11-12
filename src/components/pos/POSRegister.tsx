'use client'

import { useState, useEffect } from 'react'
import { usePOSStore } from '@/stores/posStore'
import { ProductSearch } from './ProductSearch'
import { Cart } from './Cart'
import { PaymentModal } from './PaymentModal'
import { ProductGrid } from './ProductGrid'
import { User } from '@/types'

interface POSRegisterProps {
  user: User
}

export function POSRegister({ user }: POSRegisterProps) {
  const { 
    cart, 
    isProcessing, 
    isOnline, 
    clearCart, 
    setUser, 
    error 
  } = usePOSStore()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [products, setProducts] = useState([])

  useEffect(() => {
    setUser(user)
  }, [user, setUser])

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      return
    }
    setShowPaymentModal(true)
  }

  const handlePaymentComplete = () => {
    setShowPaymentModal(false)
    clearCart()
  }

  return (
    <div className="pos-container">
      <div className="pos-grid">
        {/* Product Search and Grid */}
        <div className="lg:col-span-2 space-y-6">
          <ProductSearch />
          <ProductGrid />
        </div>

        {/* Cart and Checkout */}
        <div className="lg:col-span-1">
          <Cart onCheckout={handleCheckout} />
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-lg font-medium">Processing Payment...</span>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <span className="text-sm">Working offline - changes will sync when online</span>
        </div>
      )}
    </div>
  )
}