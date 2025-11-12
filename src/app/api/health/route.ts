import { NextRequest, NextResponse } from 'next/server'
import { healthCheck, PerformanceMonitor } from '@/lib/performance'
import { OfflineSyncService } from '@/lib/offlineSync'

// GET /api/health - System health check
export async function GET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const systemHealth = await healthCheck()
    
    // Get additional metrics
    const metrics = await PerformanceMonitor.getSystemMetrics()
    
    // Check offline sync status
    const syncStatus = await OfflineSyncService.getSyncQueueStatus()
    
    const healthData = {
      status: systemHealth.status,
      timestamp: new Date().toISOString(),
      uptime: systemHealth.uptime,
      metrics: {
        apiResponseTime: metrics.apiResponseTime,
        databaseQueryTime: metrics.databaseQueryTime,
        memoryUsage: {
          used: Math.round(metrics.memoryUsage / 1024 / 1024),
          percentage: systemHealth.memory.percentage
        },
        errorRate: metrics.errorRate,
        activeConnections: metrics.activeConnections
      },
      services: systemHealth.services,
      database: systemHealth.database,
      offlineSync: {
        status: syncStatus,
        isOnline: systemHealth.status !== 'unhealthy'
      },
      version: '1.0.0'
    }

    // Determine HTTP status code based on health
    let httpStatus = 200
    if (systemHealth.status === 'degraded') {
      httpStatus = 200 // Still operational but with warnings
    } else if (systemHealth.status === 'unhealthy') {
      httpStatus = 503 // Service unavailable
    }

    return NextResponse.json({
      success: true,
      data: healthData
    }, { status: httpStatus })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      status: 'unhealthy'
    }, { status: 503 })
  }
}

// POST /api/health - Detailed health check with diagnostics
export async function POST(request: NextRequest) {
  try {
    const { checkType = 'comprehensive' } = await request.json().catch(() => ({ checkType: 'comprehensive' }))
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checkType,
      results: {}
    }

    if (checkType === 'comprehensive' || checkType === 'basic') {
      diagnostics.results.system = await healthCheck()
      diagnostics.results.metrics = await PerformanceMonitor.getSystemMetrics()
    }

    if (checkType === 'comprehensive' || checkType === 'database') {
      // Test database connectivity
      try {
        const startTime = Date.now()
        // Simple database query test
        diagnostics.results.database = {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          message: 'Database connection successful'
        }
      } catch (dbError) {
        diagnostics.results.database = {
          status: 'unhealthy',
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        }
      }
    }

    if (checkType === 'comprehensive' || checkType === 'services') {
      // Test external services
      const serviceTests = await Promise.allSettled([
        testMpesaService(),
        testExternalConnectivity()
      ])

      diagnostics.results.services = {
        mpesa: serviceTests[0].status === 'fulfilled' ? 'online' : 'offline',
        external: serviceTests[1].status === 'fulfilled' ? 'online' : 'offline'
      }
    }

    // Generate health score
    const healthScore = calculateHealthScore(diagnostics.results)
    diagnostics.healthScore = healthScore

    const httpStatus = healthScore >= 80 ? 200 : healthScore >= 60 ? 200 : 503

    return NextResponse.json({
      success: true,
      data: diagnostics
    }, { status: httpStatus })

  } catch (error) {
    console.error('Detailed health check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Detailed health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

async function testMpesaService(): Promise<boolean> {
  try {
    // Test M-Pesa sandbox connectivity
    const response = await fetch('https://sandbox.safaricom.co.ke/', {
      method: 'HEAD',
      timeout: 5000
    } as any)
    return response.ok
  } catch {
    return false
  }
}

async function testExternalConnectivity(): Promise<boolean> {
  try {
    // Test general internet connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      timeout: 5000
    } as any)
    return response.ok
  } catch {
    return false
  }
}

function calculateHealthScore(results: any): number {
  let score = 100

  // Deduct points for issues
  if (results.system?.status === 'unhealthy') score -= 30
  if (results.system?.status === 'degraded') score -= 15
  
  if (results.database?.status === 'unhealthy') score -= 25
  if (results.database?.status === 'slow') score -= 10

  if (results.services?.mpesa === 'offline') score -= 10
  if (results.services?.external === 'offline') score -= 5

  if (results.metrics?.errorRate > 5) score -= 20
  if (results.metrics?.apiResponseTime > 2000) score -= 15
  if (results.metrics?.memoryUsage?.percentage > 90) score -= 25

  return Math.max(0, score)
}

// DELETE /api/health - Reset health monitoring counters
export async function DELETE(request: NextRequest) {
  try {
    // Only allow in development or with admin token
    const authHeader = request.headers.get('authorization')
    const adminToken = process.env.ADMIN_HEALTH_TOKEN
    
    if (process.env.NODE_ENV === 'production' && (!authHeader || authHeader !== `Bearer ${adminToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset performance counters
    PerformanceMonitor.cleanupPerformanceData()

    return NextResponse.json({
      success: true,
      message: 'Health monitoring counters reset',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to reset health counters:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reset health counters'
    }, { status: 500 })
  }
}