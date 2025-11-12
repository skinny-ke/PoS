'use client'

import { useState } from 'react'
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'
import { usePOSStore } from '@/stores/posStore'
import { PaymentMethod } from '@/types'

interface CartProps {
  onCheckout: () => void
}

export function Cart({ onCheckout }: CartProps) {
  const { 
    cart, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    applyDiscount,
    setCustomerInfo 
  } = usePOSStore()

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [discount, setDiscount] = useState(0)

  const handleCustomerInfoChange = (name: string, phone: string) => {
    setCustomerName(name)
    setCustomerPhone(phone)
    setCustomerInfo(name, phone)
  }

  const handleDiscountChange = (value: number) => {
    setDiscount(value)
    applyDiscount(value)
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      updateCartItem(productId, newQuantity)
    }
  }

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toFixed(2)}`
  }

  if (cart.items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 h-fit">
        <div className="text-center py-8">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Cart is empty
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start adding products to your cart
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Current Order
        </h2>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 p-1"
          title="Clear cart"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pos-scroll">
        {cart.items.map((item) => (
          <div
            key={item.product.id}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                {item.product.name}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                KSh {item.unitPrice} each
              </p>
              {item.product.vatStatus !== 'NONE' && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  VAT {item.product.vatStatus}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <span className="w-8 text-center text-sm font-medium">
                {item.quantity}
              </span>
              
              <button
                onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="text-right ml-4">
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(item.totalPrice)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Information */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Customer Information
        </h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => handleCustomerInfoChange(e.target.value, customerPhone)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
          <input
            type="tel"
            placeholder="Phone number (for receipt)"
            value={customerPhone}
            onChange={(e) => handleCustomerInfoChange(customerName, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Discount */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-4">
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          Discount (KSh)
        </label>
        <input
          type="number"
          min="0"
          max={cart.subtotal}
          value={discount}
          onChange={(e) => handleDiscountChange(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Order Summary */}
      <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(cart.subtotal)}</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Discount:</span>
              <span className="text-red-600 dark:text-red-400">-{formatCurrency(cart.discount)}</span>
            </div>
          )}
          {cart.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">VAT (16%):</span>
              <span className="text-gray-900 dark:text-white">{formatCurrency(cart.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span className="text-gray-900 dark:text-white">Total:</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(cart.total)}</span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckout}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        Proceed to Payment
      </button>
    </div>
  )
}