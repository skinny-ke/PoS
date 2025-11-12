import { NextRequest } from 'next/server'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
  code?: string
}

export class CustomError extends Error implements AppError {
  statusCode: number
  isOperational: boolean
  code: string

  constructor(message: string, statusCode: number = 500, code: string = 'UNKNOWN_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.code = code
    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error types
export class ValidationError extends CustomError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR')
    if (field) {
      this.message = `${field}: ${message}`
    }
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR')
  }
}

export class ConflictError extends CustomError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR')
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR')
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR')
  }
}

export class MpesaError extends CustomError {
  constructor(message: string, code?: string) {
    super(`M-Pesa Error: ${message}`, 502, code || 'MPESA_ERROR')
  }
}

export class OfflineError extends CustomError {
  constructor(message: string = 'Operation requires internet connection') {
    super(message, 503, 'OFFLINE_ERROR')
  }
}

// Error handler utility
export function handleApiError(error: unknown): {
  success: false
  error: string
  code?: string
  details?: any
} {
  console.error('API Error:', error)

  if (error instanceof CustomError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.statusCode >= 500 ? 'Internal server error' : undefined
    }
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR'
    }
  }

  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

// Validation utilities
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError('is required', fieldName)
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email')
  }
}

export function validatePhone(phone: string): void {
  // Kenyan phone number validation
  const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    throw new ValidationError('Invalid phone number format', 'phone')
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (value < 0) {
    throw new ValidationError('Must be a positive number', fieldName)
  }
}

export function validateCurrency(amount: number): void {
  if (amount < 0 || !isFinite(amount)) {
    throw new ValidationError('Invalid currency amount')
  }
  if (amount > 999999999.99) {
    throw new ValidationError('Amount exceeds maximum limit')
  }
}

export function validateDate(date: string | Date): void {
  const parsedDate = new Date(date)
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid date format')
  }
}

// Business logic validators
export function validateSaleItems(items: any[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Sale must contain at least one item')
  }

  items.forEach((item, index) => {
    validateRequired(item.productId, `item[${index}].productId`)
    validatePositiveNumber(item.quantity, `item[${index}].quantity`)
    validateCurrency(item.totalPrice)
  })
}

export function validateMpesaPayment(amount: number, phone: string): void {
  validateCurrency(amount)
  validatePhone(phone)
  
  if (amount < 1) {
    throw new ValidationError('Minimum M-Pesa amount is KSh 1')
  }
  
  if (amount > 70000) {
    throw new ValidationError('M-Pesa limit exceeded (max KSh 70,000)')
  }
}

export function validateStockAdjustment(productId: string, newStock: number): void {
  validateRequired(productId, 'productId')
  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new ValidationError('Stock quantity must be a non-negative integer')
  }
}

// Request validation middleware
export function validateRequest<T extends Record<string, any>>(schema: {
  [K in keyof T]?: (value: T[K], key: string) => void
}): (req: NextRequest, data: T) => void {
  return (req: NextRequest, data: T) => {
    Object.entries(schema).forEach(([key, validator]) => {
      if (validator && data[key as keyof T] !== undefined) {
        try {
          validator(data[key as keyof T], key)
        } catch (error) {
          if (error instanceof ValidationError) {
            error.message = `${key} ${error.message}`
          }
          throw error
        }
      }
    })
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown, context?: string) {
  const errorResponse = handleApiError(error)
  
  if (context) {
    console.error(`Error in ${context}:`, errorResponse)
  }
  
  return {
    success: false,
    error: errorResponse.error,
    code: errorResponse.code,
    ...(errorResponse.details && { details: errorResponse.details }),
    timestamp: new Date().toISOString(),
    ...(context && { context })
  }
}

// Async error wrapper
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      console.error(`Error in ${context || fn.name}:`, error)
      throw error
    }
  }) as T
}

// Network/connectivity checks
export async function checkExternalService(endpoint: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(endpoint, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    })
    
    clearTimeout(timeoutId)
    return response.ok
  } catch (error) {
    return false
  }
}

export async function isOnline(): Promise<boolean> {
  try {
    // Try to reach a reliable external service
    return await checkExternalService('https://www.google.com/favicon.ico')
  } catch {
    return false
  }
}