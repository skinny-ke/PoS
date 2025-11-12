import { 
  CustomError, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  handleApiError,
  validateRequired,
  validateEmail,
  validatePhone,
  validateCurrency
} from '@/lib/errorHandler'

describe('Error Handling', () => {
  describe('CustomError', () => {
    it('should create a custom error with default values', () => {
      const error = new CustomError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.isOperational).toBe(true)
    })

    it('should create a custom error with custom values', () => {
      const error = new CustomError('Test error', 400, 'TEST_ERROR')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
    })
  })

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('is invalid', 'email')
      expect(error.message).toBe('email: is invalid')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('AuthenticationError', () => {
    it('should create an authentication error', () => {
      const error = new AuthenticationError()
      expect(error.message).toBe('Authentication required')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_ERROR')
    })
  })

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('Product')
      expect(error.message).toBe('Product not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND_ERROR')
    })
  })

  describe('handleApiError', () => {
    it('should handle CustomError', () => {
      const error = new CustomError('Test error', 400, 'TEST_ERROR')
      const result = handleApiError(error)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error')
      expect(result.code).toBe('TEST_ERROR')
    })

    it('should handle regular Error', () => {
      const error = new Error('Regular error')
      const result = handleApiError(error)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Regular error')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle unknown error', () => {
      const result = handleApiError('unknown error' as any)
      expect(result.success).toBe(false)
      expect(result.error).toBe('An unexpected error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })

  describe('Validation Functions', () => {
    describe('validateRequired', () => {
      it('should pass for non-empty values', () => {
        expect(() => validateRequired('value', 'field')).not.toThrow()
        expect(() => validateRequired(0, 'field')).not.toThrow()
        expect(() => validateRequired(false, 'field')).not.toThrow()
      })

      it('should throw for empty values', () => {
        expect(() => validateRequired('', 'field')).toThrow(ValidationError)
        expect(() => validateRequired(null, 'field')).toThrow(ValidationError)
        expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError)
      })
    })

    describe('validateEmail', () => {
      it('should pass for valid emails', () => {
        expect(() => validateEmail('test@example.com')).not.toThrow()
        expect(() => validateEmail('user.name@domain.co.ke')).not.toThrow()
      })

      it('should throw for invalid emails', () => {
        expect(() => validateEmail('invalid-email')).toThrow(ValidationError)
        expect(() => validateEmail('test@')).toThrow(ValidationError)
        expect(() => validateEmail('@domain.com')).toThrow(ValidationError)
      })
    })

    describe('validatePhone', () => {
      it('should pass for valid Kenyan phone numbers', () => {
        expect(() => validatePhone('+254712345678')).not.toThrow()
        expect(() => validatePhone('0712345678')).not.toThrow()
        expect(() => validatePhone('254712345678')).not.toThrow()
      })

      it('should throw for invalid phone numbers', () => {
        expect(() => validatePhone('123456789')).toThrow(ValidationError)
        expect(() => validatePhone('+25471234567')).toThrow(ValidationError)
        expect(() => validatePhone('invalid-phone')).toThrow(ValidationError)
      })
    })

    describe('validateCurrency', () => {
      it('should pass for valid currency amounts', () => {
        expect(() => validateCurrency(0)).not.toThrow()
        expect(() => validateCurrency(100.50)).not.toThrow()
        expect(() => validateCurrency(999999999.99)).not.toThrow()
      })

      it('should throw for invalid currency amounts', () => {
        expect(() => validateCurrency(-10)).toThrow(ValidationError)
        expect(() => validateCurrency(NaN)).toThrow(ValidationError)
        expect(() => validateCurrency(Infinity)).toThrow(ValidationError)
        expect(() => validateCurrency(1000000000)).toThrow(ValidationError)
      })
    })
  })
})