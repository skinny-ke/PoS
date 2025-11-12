import { prisma } from './prisma'

export interface PerformanceMetrics {
  apiResponseTime: number
  databaseQueryTime: number
  memoryUsage: number
  activeConnections: number
  errorRate: number
  timestamp: Date
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    status: 'connected' | 'disconnected' | 'slow'
    responseTime: number
    activeConnections: number
  }
  services: {
    mpesa: 'online' | 'offline' | 'degraded'
    storage: 'available' | 'limited' | 'unavailable'
  }
}

export class PerformanceMonitor {
  private static startTime = Date.now()
  private static errorCount = 0
  private static totalRequests = 0
  private static responseTimes: number[] = []
  private static maxResponseTimes = 1000 // Keep last 1000 response times

  // Track API response time
  static trackApiResponse(path: string, responseTime: number, statusCode: number) {
    this.totalRequests++
    
    if (statusCode >= 400) {
      this.errorCount++
    }

    // Keep only recent response times
    this.responseTimes.push(responseTime)
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes)
    }

    // Log slow requests
    if (responseTime > 5000) {
      console.warn(`Slow API request detected: ${path} took ${responseTime}ms`)
    }
  }

  // Calculate average response time
  static getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    return Math.round(sum / this.responseTimes.length)
  }

  // Calculate error rate
  static getErrorRate(): number {
    if (this.totalRequests === 0) return 0
    return Math.round((this.errorCount / this.totalRequests) * 100 * 100) / 100
  }

  // Get current system metrics
  static async getSystemMetrics(): Promise<PerformanceMetrics> {
    const memUsage = process.memoryUsage()
    const dbConnections = await this.getDatabaseConnections()

    return {
      apiResponseTime: this.getAverageResponseTime(),
      databaseQueryTime: await this.getDatabaseResponseTime(),
      memoryUsage: memUsage.heapUsed,
      activeConnections: dbConnections,
      errorRate: this.getErrorRate(),
      timestamp: new Date()
    }
  }

  // Get comprehensive system health
  static async getSystemHealth(): Promise<SystemHealth> {
    const memUsage = process.memoryUsage()
    const memoryPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

    const [dbHealth, serviceHealth] = await Promise.all([
      this.getDatabaseHealth(),
      this.getServiceHealth()
    ])

    // Determine overall system status
    let status: SystemHealth['status'] = 'healthy'
    
    if (memoryPercentage > 90 || dbHealth.status === 'disconnected') {
      status = 'unhealthy'
    } else if (memoryPercentage > 75 || dbHealth.status === 'slow' || serviceHealth.mpesa === 'degraded') {
      status = 'degraded'
    }

    return {
      status,
      uptime: Date.now() - this.startTime,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: memoryPercentage
      },
      database: dbHealth,
      services: serviceHealth
    }
  }

  // Database health check
  private static async getDatabaseHealth() {
    try {
      const responseTime = await this.getDatabaseResponseTime()
      const connections = await this.getDatabaseConnections()

      let status: 'connected' | 'disconnected' | 'slow' = 'connected'
      if (responseTime > 1000) {
        status = 'slow'
      }

      return {
        status,
        responseTime,
        activeConnections: connections
      }
    } catch (error) {
      return {
        status: 'disconnected' as const,
        responseTime: 0,
        activeConnections: 0
      }
    }
  }

  // Service health check
  private static async getServiceHealth() {
    // Check M-Pesa service
    const mpesaStatus = await this.checkMpesaService()
    
    // Check storage (simplified check)
    const storageStatus = await this.checkStorageService()

    return {
      mpesa: mpesaStatus,
      storage: storageStatus
    }
  }

  // M-Pesa service check
  private static async checkMpesaService(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      // Simple connectivity check to M-Pesa sandbox
      const startTime = Date.now()
      const response = await fetch('https://sandbox.safaricom.co.ke/', {
        method: 'HEAD',
        timeout: 5000
      } as any)
      const responseTime = Date.now() - startTime

      if (response.ok && responseTime < 2000) {
        return 'online'
      } else {
        return 'degraded'
      }
    } catch (error) {
      return 'offline'
    }
  }

  // Storage service check
  private static async checkStorageService(): Promise<'available' | 'limited' | 'unavailable'> {
    try {
      // Check disk space (simplified)
      // In a real implementation, you might check cloud storage quota
      return 'available'
    } catch (error) {
      return 'unavailable'
    }
  }

  // Database connection count
  private static async getDatabaseConnections(): Promise<number> {
    try {
      // This would typically query database connection pool
      // For now, return a mock value
      return Math.floor(Math.random() * 10) + 1
    } catch (error) {
      return 0
    }
  }

  // Database response time
  private static async getDatabaseResponseTime(): Promise<number> {
    try {
      const startTime = Date.now()
      await prisma.$queryRaw`SELECT 1`
      return Date.now() - startTime
    } catch (error) {
      return 0
    }
  }

  // Performance middleware for API routes
  static performanceMiddleware(req: Request, next: () => Promise<Response>) {
    const startTime = Date.now()
    
    return next().then(response => {
      const responseTime = Date.now() - startTime
      const path = new URL(req.url).pathname
      const statusCode = response.status

      this.trackApiResponse(path, responseTime, statusCode)

      // Add performance headers
      const newHeaders = new Headers(response.headers)
      newHeaders.set('X-Response-Time', `${responseTime}ms`)
      newHeaders.set('X-Timestamp', new Date().toISOString())

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    })
  }

  // Memory usage optimization
  static optimizeMemoryUsage() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    // Log memory usage
    const memUsage = process.memoryUsage()
    console.log('Memory usage:', {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    })
  }

  // Clean up old performance data
  static cleanupPerformanceData() {
    // Reset counters periodically to prevent memory leaks
    if (this.responseTimes.length > this.maxResponseTimes) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimes)
    }

    // Reset error count if it gets too high
    if (this.errorCount > 1000) {
      this.errorCount = Math.floor(this.errorCount / 2)
    }

    if (this.totalRequests > 10000) {
      this.totalRequests = Math.floor(this.totalRequests / 2)
    }
  }

  // Generate performance report
  static generatePerformanceReport(): string {
    const avgResponseTime = this.getAverageResponseTime()
    const errorRate = this.getErrorRate()
    const uptime = Date.now() - this.startTime

    return `
Performance Report - ${new Date().toISOString()}
============================================
Uptime: ${Math.round(uptime / 1000 / 60)} minutes
Average Response Time: ${avgResponseTime}ms
Error Rate: ${errorRate}%
Total Requests: ${this.totalRequests}
Errors: ${this.errorCount}

Memory Usage:
${JSON.stringify(process.memoryUsage(), null, 2)}
`
  }
}

// Health check endpoint
export async function healthCheck(): Promise<SystemHealth> {
  return await PerformanceMonitor.getSystemHealth()
}

// Performance monitoring utilities
export class DatabaseOptimizer {
  // Analyze slow queries
  static async analyzeSlowQueries(limit = 10) {
    // This would typically analyze database query logs
    // For now, return mock data
    return [
      {
        query: 'SELECT * FROM products WHERE categoryId = ?',
        averageTime: 150,
        executionCount: 25,
        suggestion: 'Add index on categoryId column'
      }
    ]
  }

  // Suggest optimizations
  static async suggestOptimizations() {
    const suggestions = []

    // Check response times
    const metrics = await PerformanceMonitor.getSystemMetrics()
    if (metrics.apiResponseTime > 1000) {
      suggestions.push({
        type: 'performance',
        message: 'API response times are high. Consider caching frequently accessed data.',
        priority: 'high'
      })
    }

    if (metrics.databaseQueryTime > 500) {
      suggestions.push({
        type: 'database',
        message: 'Database queries are slow. Consider adding indexes or optimizing queries.',
        priority: 'high'
      })
    }

    // Check memory usage
    const memUsage = process.memoryUsage()
    const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100
    
    if (memoryPercentage > 80) {
      suggestions.push({
        type: 'memory',
        message: 'High memory usage detected. Consider implementing data pagination.',
        priority: 'medium'
      })
    }

    return suggestions
  }
}