import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Type definitions
type UserRole = 'CASHIER' | 'MANAGER' | 'ADMIN'

// Security validation schemas
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().max(1000).optional(),
  barcode: z.string().regex(/^[A-Za-z0-9]+$/, 'Barcode must be alphanumeric').optional(),
  sku: z.string().regex(/^[A-Za-z0-9\-_]+$/, 'SKU must be alphanumeric with hyphens/underscores').optional(),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().optional(),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  retailPrice: z.number().min(0, 'Retail price must be positive'),
  wholesalePrice: z.number().min(0).optional(),
  stockQuantity: z.number().int().min(0, 'Stock quantity must be non-negative'),
  minStockLevel: z.number().int().min(0).default(5),
  maxStockLevel: z.number().int().min(1).default(100),
  vatStatus: z.enum(['INCLUSIVE', 'EXCLUSIVE', 'NONE']).default('NONE'),
  imageUrl: z.string().url().optional()
})

export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    discountAmount: z.number().min(0).default(0),
    taxAmount: z.number().min(0).default(0),
    wholesaleTierId: z.string().optional()
  })).min(1, 'Sale must have at least one item'),
  totalAmount: z.number().min(0),
  subtotalAmount: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'MPESA', 'CARD', 'SPLIT']),
  customerName: z.string().max(255).optional(),
  customerPhone: z.string().regex(/^(\+254|0)\d{9}$/, 'Invalid Kenyan phone number').optional()
})

export const mpesaPaymentSchema = z.object({
  amount: z.number().min(1).max(70000, 'M-Pesa limit exceeded'),
  phoneNumber: z.string().regex(/^(\+254|0)\d{9}$/, 'Invalid Kenyan phone number'),
  saleId: z.string().optional()
})

// Simple in-memory rate limiting (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  clientIp: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const clientData = rateLimitStore.get(clientIp)
  
  if (!clientData || now > clientData.resetTime) {
    // First request or window expired
    const resetTime = now + windowMs
    rateLimitStore.set(clientIp, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }
  
  if (clientData.count >= maxRequests) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: clientData.resetTime }
  }
  
  // Increment counter
  clientData.count++
  return { allowed: true, remaining: maxRequests - clientData.count, resetTime: clientData.resetTime }
}

// Security middleware
export function securityMiddleware(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimit = checkRateLimit(clientIp)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': '0'
        }
      }
    )
  }
  
  // Input validation for all requests
  if (request.method !== 'GET') {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 415 }
      )
    }
  }

  // Block common attack patterns in headers
  const userAgent = request.headers.get('user-agent') || ''
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload/i,
    /onerror/i,
    /onclick/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(userAgent)) {
      return NextResponse.json(
        { error: 'Suspicious request blocked' },
        { status: 403 }
      )
    }
  }

  return null // Allow request
}

// Data sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// SQL injection prevention
export function validateQueryParams(params: Record<string, any>): Record<string, any> {
  const allowedParams = ['search', 'category', 'page', 'limit', 'sort', 'order']
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (allowedParams.includes(key)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeInput(value)
      } else {
        sanitized[key] = value
      }
    }
  }
  
  return sanitized
}

// Audit logging
export async function logActivity(
  prisma: any, // PrismaClient would be imported in actual usage
  data: {
    userId?: string
    action: string
    entityType: string
    entityId: string
    oldValues?: any
    newValues?: any
    ipAddress?: string
    userAgent?: string
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
        newValues: data.newValues ? JSON.stringify(data.newValues) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

// Permission checking
export async function checkPermission(
  user: any, // User type from database
  requiredRole: UserRole
): Promise<boolean> {
  if (!user || !user.isActive) {
    return false
  }

  const roleHierarchy: Record<UserRole, number> = {
    'CASHIER': 1,
    'MANAGER': 2,
    'ADMIN': 3
  }

  const userLevel = roleHierarchy[user.role as UserRole] || 0
  const requiredLevel = roleHierarchy[requiredRole]

  return userLevel >= requiredLevel
}

// Data encryption for sensitive information
export function encryptSensitiveData(data: string): string {
  // In production, use proper encryption like AES-256
  // This is a simple base64 encoding for demonstration
  return Buffer.from(data).toString('base64')
}

export function decryptSensitiveData(encryptedData: string): string {
  // In production, use proper decryption
  return Buffer.from(encryptedData, 'base64').toString('utf-8')
}

// Error handling
export function createSecureErrorResponse(message: string, status: number = 500) {
  // Don't expose sensitive information in error messages
  const safeMessage = status === 500 ? 'Internal server error' : message
  
  return NextResponse.json(
    { error: safeMessage },
    { status }
  )
}

// Request logging for security monitoring
export async function logSecurityEvent(
  event: {
    type: 'login_attempt' | 'permission_denied' | 'suspicious_activity' | 'rate_limit_exceeded'
    userId?: string
    ipAddress: string
    userAgent: string
    details?: any
  }
) {
  // In production, send to security monitoring service
  console.log('Security Event:', {
    timestamp: new Date().toISOString(),
    ...event
  })
}

// Kenya-specific validations
export function validateKenyanID(id: string): boolean {
  // Kenya National ID validation (8 digits)
  return /^\d{8}$/.test(id)
}

export function formatKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('254')) {
    return cleaned
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1)
  } else if (cleaned.length === 9) {
    return '254' + cleaned
  }
  
  throw new Error('Invalid Kenyan phone number')
}

export function validateKenyanBusinessRegistration(regNumber: string): boolean {
  // Kenya Business Registration validation
  return /^[A-Z]{2}\d{2}\d{6}$/.test(regNumber)
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}