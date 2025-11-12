import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { OfflineSyncService } from '@/lib/offlineSync'

// POST /api/offline-sync/process - Process offline sync queue
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role - only Admin and Manager can process sync queue
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await OfflineSyncService.processSyncQueue()

    return NextResponse.json({
      success: result.success,
      data: {
        syncedItems: result.syncedItems || 0,
        timestamp: new Date().toISOString()
      },
      error: result.error
    })

  } catch (error) {
    console.error('Error processing sync queue:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/offline-sync/status - Get sync queue status
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [status, isOnline] = await Promise.all([
      OfflineSyncService.getSyncQueueStatus(),
      OfflineSyncService.isOnline()
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        isOnline,
        lastSync: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}