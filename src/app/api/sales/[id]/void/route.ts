import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// POST /api/sales/[id]/void - Void transactions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details and check role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only managers and admins can void transactions
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const saleId = params.id
    const body = await request.json()
    const { reason } = body

    // Validate required fields
    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Void reason is required' },
        { status: 400 }
      )
    }

    // Find the sale
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        saleItems: {
          include: {
            product: true
          }
        },
        payments: true,
        refunds: true
      }
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Check if sale can be voided
    if (sale.status === 'VOID') {
      return NextResponse.json(
        { success: false, error: 'Sale is already voided' },
        { status: 400 }
      )
    }

    // Check if sale has been refunded
    if (sale.status === 'REFUNDED') {
      return NextResponse.json(
        { success: false, error: 'Cannot void a refunded sale' },
        { status: 400 }
      )
    }

    // Check time limit for voiding (e.g., within 24 hours)
    const saleTime = new Date(sale.createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - saleTime.getTime()) / (1000 * 60 * 60)

    if (hoursDiff > 24) {
      return NextResponse.json(
        { success: false, error: 'Cannot void sale after 24 hours' },
        { status: 400 }
      )
    }

    // Restore inventory for all items
    for (const saleItem of sale.saleItems) {
      await prisma.product.update({
        where: { id: saleItem.productId },
        data: {
          stockQuantity: {
            increment: saleItem.quantity
          }
        }
      })
    }

    // Update sale status to void
    const updatedSale = await prisma.sale.update({
      where: { id: sale.id },
      data: {
        status: 'VOID',
        paymentStatus: 'FAILED' // Mark payment as failed
      }
    })

    // Update payment status if exists
    if (sale.payments.length > 0) {
      await prisma.payment.updateMany({
        where: { saleId: sale.id },
        data: {
          status: 'FAILED'
        }
      })
    }

    // Add to offline sync queue
    await prisma.offlineSyncQueue.create({
      data: {
        type: 'void',
        data: JSON.stringify({
          saleId: sale.id,
          saleNumber: sale.saleNumber,
          reason,
          voidedBy: user.id
        })
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'void',
        entityType: 'Sale',
        entityId: sale.id,
        oldValues: JSON.stringify({
          status: sale.status,
          paymentStatus: sale.paymentStatus,
          totalAmount: sale.totalAmount
        }),
        newValues: JSON.stringify({
          status: 'VOID',
          paymentStatus: 'FAILED',
          reason
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sale: updatedSale,
        voidedBy: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role
        },
        reason,
        voidedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error voiding sale:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}