'use client'

import { useState } from 'react'
import { usePOSStore } from '@/stores/posStore'
import { PaymentMethod } from '@/types'
import { CreditCard, Smartphone, Banknote, X } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function PaymentModal({ isOpen, onClose, onComplete }: PaymentModalProps) {
  const { cart, processPayment, isProcessing } = usePOSStore()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paidAmount, setPaidAmount] = useState(cart.total)

  if (!isOpen) return null

  const formatCurrency = (amount: number) => `KSh ${amount.toFixed(2)}`
  
  const handlePayment = async () => {
    if (paymentMethod === 'MPESA' && !customerPhone) {
      alert('Phone number is required for M-Pesa payments')
      return
    }

    const result = await processPayment({
      amount: paidAmount,
      method: paymentMethod,
      customerPhone: paymentMethod === 'MPESA' ? customerPhone : undefined
    })

    if (result.success) {
      onComplete()
      onClose()
    } else {
      alert(result.error || 'Payment failed')
    }
  }

  const paymentMethods = [
    { id: 'CASH', label: 'Cash', icon: Banknote, description: 'Pay with cash' },
    { id: 'MPESA', label: 'M-Pesa', icon: Smartphone, description: 'Pay with M-Pesa' },
    { id: 'CARD', label: 'Card', icon: CreditCard, description: 'Pay with card' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Process Payment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Items:</span>
                <span className="text-gray-900 dark:text-white">{cart.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(cart.subtotal)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="text-red-600 dark:text-red-400">-{formatCurrency(cart.discount)}</span>
                </div>
              )}
              {cart.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">VAT:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(cart.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(cart.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Payment Method</h3>
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`flex items-center p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${
                      paymentMethod === method.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                    }`} />
                    <div className="text-left">
                      <div className={`font-medium ${
                        paymentMethod === method.id ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                      }`}>
                        {method.label}
                      </div>
                      <div className={`text-xs ${
                        paymentMethod === method.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {method.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Payment Details */}
          {paymentMethod === 'MPESA' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g., 0712345678"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          {(paymentMethod === 'CASH' || paymentMethod === 'CARD') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount Received
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                min={cart.total}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {paidAmount > cart.total && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Change: {formatCurrency(paidAmount - cart.total)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing || (paymentMethod === 'MPESA' && !customerPhone) || (paymentMethod !== 'MPESA' && paidAmount < cart.total)}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : `Pay ${formatCurrency(cart.total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}