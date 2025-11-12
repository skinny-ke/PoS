import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product, Cart, CartItem, PaymentRequest, User, UserRole, PaymentMethod } from '@/types'

interface POSState {
  cart: Cart
  isProcessing: boolean
  currentUser?: User
  isOnline: boolean
  pendingSync: any[]
  error?: string

  // Cart actions
  addToCart: (product: Product, quantity?: number) => void
  updateCartItem: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  applyDiscount: (amount: number) => void
  setCustomerInfo: (name: string, phone: string) => void

  // Payment actions
  processPayment: (paymentRequest: PaymentRequest) => Promise<{ success: boolean; saleId?: string; error?: string }>

  // Store actions
  setProcessing: (processing: boolean) => void
  setUser: (user: User) => void
  setOnlineStatus: (online: boolean) => void
  addToSyncQueue: (data: any) => void
  setError: (error: string | undefined) => void
}

const initialCart: Cart = {
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0
}

function calculateCartTotals(items: CartItem[]): Pick<Cart, 'subtotal' | 'tax' | 'total'> {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  
  // Calculate VAT (16% for Kenya)
  const tax = items.reduce((sum, item) => sum + item.taxAmount, 0)
  
  return {
    subtotal,
    tax,
    total: subtotal + tax
  }
}

function calculateWholesalePrice(product: Product, quantity: number): number {
  if (!product.wholesaleTiers || product.wholesaleTiers.length === 0) {
    return product.retailPrice
  }

  // Find the appropriate wholesale tier
  const tier = product.wholesaleTiers
    .filter(t => t.isActive && t.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0]

  return tier ? Number(tier.price) : product.retailPrice
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      cart: initialCart,
      isProcessing: false,
      isOnline: true,
      pendingSync: [],

      addToCart: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.cart.items.find(item => item.product.id === product.id)
          
          let newItems: CartItem[]
          if (existingItem) {
            newItems = state.cart.items.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          } else {
            const unitPrice = calculateWholesalePrice(product, quantity)
            const totalPrice = unitPrice * quantity
            const taxAmount = product.vatStatus === 'INCLUSIVE' 
              ? totalPrice * 0.16 / 1.16 // VAT inclusive calculation
              : product.vatStatus === 'EXCLUSIVE'
              ? totalPrice * 0.16
              : 0

            newItems = [...state.cart.items, {
              product,
              quantity,
              unitPrice,
              totalPrice,
              discountAmount: 0,
              taxAmount
            }]
          }

          const totals = calculateCartTotals(newItems)
          
          return {
            cart: {
              ...state.cart,
              items: newItems,
              ...totals
            }
          }
        })
      },

      updateCartItem: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId)
          return
        }

        set((state) => {
          const newItems = state.cart.items.map(item => {
            if (item.product.id === productId) {
              const unitPrice = calculateWholesalePrice(item.product, quantity)
              const totalPrice = unitPrice * quantity
              const taxAmount = item.product.vatStatus === 'INCLUSIVE' 
                ? totalPrice * 0.16 / 1.16
                : item.product.vatStatus === 'EXCLUSIVE'
                ? totalPrice * 0.16
                : 0

              return {
                ...item,
                quantity,
                unitPrice,
                totalPrice,
                taxAmount
              }
            }
            return item
          })

          const totals = calculateCartTotals(newItems)
          
          return {
            cart: {
              ...state.cart,
              items: newItems,
              ...totals
            }
          }
        })
      },

      removeFromCart: (productId) => {
        set((state) => {
          const newItems = state.cart.items.filter(item => item.product.id !== productId)
          const totals = calculateCartTotals(newItems)
          
          return {
            cart: {
              ...state.cart,
              items: newItems,
              ...totals
            }
          }
        })
      },

      clearCart: () => {
        set({ cart: initialCart })
      },

      applyDiscount: (amount) => {
        set((state) => {
          const discount = Math.max(0, Math.min(amount, state.cart.subtotal))
          const total = state.cart.subtotal + state.cart.tax - discount
          
          return {
            cart: {
              ...state.cart,
              discount,
              total
            }
          }
        })
      },

      setCustomerInfo: (name, phone) => {
        set((state) => ({
          cart: {
            ...state.cart,
            customerName: name,
            customerPhone: phone
          }
        }))
      },

      processPayment: async (paymentRequest) => {
        const { cart, addToSyncQueue } = get()
        
        if (cart.items.length === 0) {
          return { success: false, error: 'Cart is empty' }
        }

        set({ isProcessing: true, error: undefined })

        try {
          // Create sale data
          const saleData = {
            items: cart.items.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount
            })),
            totalAmount: cart.total,
            subtotalAmount: cart.subtotal,
            discountAmount: cart.discount,
            taxAmount: cart.tax,
            paymentMethod: paymentRequest.method,
            customerName: cart.customerName,
            customerPhone: cart.customerPhone
          }

          if (paymentRequest.method === 'MPESA') {
            // Handle M-Pesa STK push
            const mpesaResponse = await fetch('/api/mpesa/stk-push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: paymentRequest.amount,
                phoneNumber: paymentRequest.customerPhone
              })
            })

            if (!mpesaResponse.ok) {
              throw new Error('M-Pesa STK push failed')
            }

            const mpesaData = await mpesaResponse.json()
            
            // Add to offline sync queue if offline
            if (!get().isOnline) {
              addToSyncQueue({
                type: 'sale',
                data: saleData,
                mpesaData
              })
            }
          } else {
            // Handle cash or card payment
            const response = await fetch('/api/sales', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(saleData)
            })

            if (!response.ok) {
              throw new Error('Sale processing failed')
            }

            const result = await response.json()
            
            if (!get().isOnline) {
              addToSyncQueue({
                type: 'sale',
                data: saleData
              })
            }

            // Clear cart on successful sale
            get().clearCart()
            return { success: true, saleId: result.data?.id }
          }

          get().clearCart()
          return { success: true, saleId: 'pending' }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Payment processing failed'
          get().setError(errorMessage)
          return { success: false, error: errorMessage }
        } finally {
          set({ isProcessing: false })
        }
      },

      setProcessing: (processing) => set({ isProcessing: processing }),
      setUser: (user) => set({ currentUser: user }),
      setOnlineStatus: (online) => set({ isOnline: online }),
      addToSyncQueue: (data) => set((state) => ({ 
        pendingSync: [...state.pendingSync, data] 
      })),
      setError: (error) => set({ error })
    }),
    {
      name: 'pos-store',
      partialize: (state) => ({
        cart: state.cart,
        pendingSync: state.pendingSync,
        isOnline: state.isOnline
      })
    }
  )
)