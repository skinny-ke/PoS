// Define enums locally since Prisma client isn't generated yet
export type UserRole = 'CASHIER' | 'MANAGER' | 'ADMIN'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'SPLIT'
export type SaleStatus = 'COMPLETED' | 'VOID' | 'REFUNDED'
export type VATStatus = 'INCLUSIVE' | 'EXCLUSIVE' | 'NONE'

// User types
export interface User {
  id: string
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Product types
export interface Product {
  id: string
  name: string
  description?: string
  barcode?: string
  sku?: string
  categoryId: string
  supplierId?: string
  costPrice: number
  retailPrice: number
  wholesalePrice?: number
  stockQuantity: number
  minStockLevel: number
  maxStockLevel: number
  vatStatus: VATStatus
  isActive: boolean
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
  category?: Category
  supplier?: Supplier
  wholesaleTiers?: WholesaleTier[]
}

// Category types
export interface Category {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Supplier types
export interface Supplier {
  id: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Wholesale tier types
export interface WholesaleTier {
  id: string
  productId: string
  minQuantity: number
  maxQuantity?: number
  price: number
  isActive: boolean
  createdAt: Date
  product?: Product
}

// Sale types
export interface Sale {
  id: string
  saleNumber: string
  userId: string
  totalAmount: number
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  paidAmount: number
  changeAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: SaleStatus
  customerName?: string
  customerPhone?: string
  receiptPrinted: boolean
  offlineId?: string
  createdAt: Date
  updatedAt: Date
  user?: User
  saleItems?: SaleItem[]
  payments?: Payment[]
  refunds?: Refund[]
}

// Sale item types
export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discountAmount: number
  taxAmount: number
  wholesaleTierId?: string
  createdAt: Date
  sale?: Sale
  product?: Product
  wholesaleTier?: WholesaleTier
}

// Payment types
export interface Payment {
  id: string
  saleId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  reference?: string
  mpesaMerchantId?: string
  mpesaCheckoutRequestId?: string
  mpesaTimestamp?: string
  createdAt: Date
  updatedAt: Date
  sale?: Sale
}

// Refund types
export interface Refund {
  id: string
  saleId: string
  userId: string
  totalRefundAmount: number
  reason: string
  status: string
  createdAt: Date
  sale?: Sale
  user?: User
}

// County types
export interface County {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt: Date
}

// Stock entry types
export interface StockEntry {
  id: string
  productId: string
  quantity: number
  costPrice: number
  totalCost: number
  supplierId?: string
  userId: string
  referenceNumber?: string
  notes?: string
  createdAt: Date
  product?: Product
  supplier?: Supplier
  user?: User
}

// POS specific types
export interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  totalPrice: number
  discountAmount: number
  taxAmount: number
  wholesaleTier?: WholesaleTier
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  customerName?: string
  customerPhone?: string
}

export interface PaymentRequest {
  amount: number
  method: PaymentMethod
  customerPhone?: string
  reference?: string
}

export interface ReceiptData {
  saleNumber: string
  cashierName: string
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  customerName?: string
  customerPhone?: string
  date: string
}

// M-Pesa types
export interface MpesaAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

export interface MpesaSTKPushRequest {
  BusinessShortCode: string
  Password: string
  Timestamp: string
  TransactionType: string
  Amount: number
  PartyA: string
  PartyB: string
  PhoneNumber: string
  CallBackURL: string
  AccountReference: string
  TransactionDesc: string
}

export interface MpesaSTKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

export interface MpesaCallbackData {
  stkCallback: {
    MerchantRequestID: string
    CheckoutRequestID: string
    ResultCode: number
    ResultDesc: string
    CallbackMetadata: {
      Item: Array<{
        Name: string
        Value: string
      }>
    }
  }
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface ProductForm {
  name: string
  description?: string
  barcode?: string
  sku?: string
  categoryId: string
  supplierId?: string
  costPrice: string
  retailPrice: string
  wholesalePrice?: string
  stockQuantity: string
  minStockLevel: string
  maxStockLevel: string
  vatStatus: VATStatus
  imageUrl?: string
}

export interface SaleForm {
  customerName?: string
  customerPhone?: string
  paymentMethod: PaymentMethod
  items: Array<{
    productId: string
    quantity: string
  }>
}

// Store types
export interface POSStore {
  cart: Cart
  isProcessing: boolean
  currentUser?: User
  isOnline: boolean
  pendingSync: any[]
  
  // Actions
  addToCart: (product: Product, quantity?: number) => void
  updateCartItem: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  applyDiscount: (amount: number) => void
  setCustomerInfo: (name: string, phone: string) => void
  processPayment: (paymentRequest: PaymentRequest) => Promise<ApiResponse>
  setProcessing: (processing: boolean) => void
  setUser: (user: User) => void
  setOnlineStatus: (online: boolean) => void
  addToSyncQueue: (data: any) => void
}

export interface InventoryStore {
  products: Product[]
  categories: Category[]
  suppliers: Supplier[]
  isLoading: boolean
  
  // Actions
  loadProducts: () => Promise<void>
  loadCategories: () => Promise<void>
  loadSuppliers: () => Promise<void>
  addProduct: (product: ProductForm) => Promise<ApiResponse>
  updateProduct: (id: string, product: ProductForm) => Promise<ApiResponse>
  deleteProduct: (id: string) => Promise<ApiResponse>
  addStock: (productId: string, quantity: number, costPrice: number, notes?: string) => Promise<ApiResponse>
}

export interface SalesStore {
  sales: Sale[]
  currentSale?: Sale
  isLoading: boolean
  
  // Actions
  loadSales: (filters?: any) => Promise<void>
  loadSale: (id: string) => Promise<ApiResponse>
  refundSale: (saleId: string, reason: string) => Promise<ApiResponse>
  printReceipt: (saleId: string) => Promise<ApiResponse>
}

export interface AuthStore {
  user?: User
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  loadUser: (clerkUserId: string) => Promise<void>
  updateUser: (user: Partial<User>) => Promise<ApiResponse>
  logout: () => void
}

// Report types
export interface SalesReport {
  date: string
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  paymentMethodBreakdown: {
    cash: number
    mpesa: number
    card: number
  }
}

export interface ProductReport {
  productId: string
  productName: string
  quantitySold: number
  totalRevenue: number
  profitMargin: number
}

export interface InventoryReport {
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalValue: number
  categoryBreakdown: Array<{
    categoryName: string
    productCount: number
    totalValue: number
  }>
}
