import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/audit-logs - Get recent audit logs
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role - only Admin and Manager can view audit logs
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')
    const userIdFilter = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (entityType) {
      where.entityType = entityType
    }

    if (action) {
      where.action = action
    }

    if (userIdFilter) {
      where.userId = userIdFilter
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.count({ where })
    ])

    // Format the response
    const formattedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      userEmail: log.user?.email,
      oldValues: log.oldValues,
      newValues: log.newValues,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      productName: log.product?.name
    }))

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/audit-logs - Create audit log entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      action,
      entityType,
      entityId,
      productId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    } = body

    // Validate required fields
    if (!action || !entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: user?.id,
        productId,
        action,
        entityType,
        entityId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: auditLog.id,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        userName: auditLog.user ? `${auditLog.user.firstName} ${auditLog.user.lastName}` : 'System',
        createdAt: auditLog.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}