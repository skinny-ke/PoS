import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// PUT /api/sales/[id]/refund - Handle refunds (partial or full)
export async function PUT(
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

    // Only managers and admins can process refunds
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const saleId = params.id
    const body = await request.json()
    const { refundAmount, reason, refundItems } = body

    // Validate required fields
    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Refund reason is required' },
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
        refunds: true
      }
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Check if sale can be refunded
    if (sale.status === 'VOID') {
      return NextResponse.json(
        { success: false, error: 'Cannot refund a voided sale' },
        { status: 400 }
      )
    }

    // Calculate total already refunded
    const totalRefunded = sale.refunds.reduce((sum, refund) => sum + Number(refund.totalRefundAmount), 0)
    const remainingAmount = Number(sale.totalAmount) - totalRefunded

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Sale has already been fully refunded' },
        { status: 400 }
      )
    }

    // Determine refund amount
    let finalRefundAmount = refundAmount ? Number(refundAmount) : remainingAmount

    if (finalRefundAmount > remainingAmount) {
      return NextResponse.json(
        { success: false, error: 'Refund amount cannot exceed remaining sale amount' },
        { status: 400 }
      )
    }

    if (finalRefundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Handle partial refunds by items if specified
    if (refundItems && Array.isArray(refundItems)) {
      // Validate refund items
      for (const refundItem of refundItems) {
        const saleItem = sale.saleItems.find(item => item.id === refundItem.saleItemId)
        if (!saleItem) {
          return NextResponse.json(
            { success: false, error: `Sale item not found: ${refundItem.saleItemId}` },
            { status: 400 }
          )
        }

        if (refundItem.quantity > saleItem.quantity) {
          return NextResponse.json(
            { success: false, error: `Refund quantity cannot exceed sold quantity for ${saleItem.product.name}` },
            { status: 400 }
          )
        }
      }

      // Process item-level refunds
      for (const refundItem of refundItems) {
        const saleItem = sale.saleItems.find(item => item.id === refundItem.saleItemId)!
        const refundQuantity = refundItem.quantity
        const refundValue = (Number(saleItem.totalPrice) / saleItem.quantity) * refundQuantity

        // Restore inventory
        await prisma.product.update({
          where: { id: saleItem.productId },
          data: {
            stockQuantity: {
              increment: refundQuantity
            }
          }
        })

        // Update sale item quantity (reduce sold quantity)
        await prisma.saleItem.update({
          where: { id: saleItem.id },
          data: {
            quantity: {
              decrement: refundQuantity
            },
            totalPrice: {
              decrement: refundValue
            }
          }
        })

        finalRefundAmount = refundValue
      }
    } else {
      // Full or partial amount refund - restore inventory proportionally
      const refundRatio = finalRefundAmount / Number(sale.totalAmount)

      for (const saleItem of sale.saleItems) {
        const refundQuantity = Math.floor(saleItem.quantity * refundRatio)

        if (refundQuantity > 0) {
          await prisma.product.update({
            where: { id: saleItem.productId },
            data: {
              stockQuantity: {
                increment: refundQuantity
              }
            }
          })

          // Update sale item
          const refundValue = (Number(saleItem.totalPrice) / saleItem.quantity) * refundQuantity
          await prisma.saleItem.update({
            where: { id: saleItem.id },
            data: {
              quantity: {
                decrement: refundQuantity
              },
              totalPrice: {
                decrement: refundValue
              }
            }
          })
        }
      }
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        saleId: sale.id,
        userId: user.id,
        totalRefundAmount: finalRefundAmount,
        reason
      }
    })

    // Update sale status if fully refunded
    const newTotalRefunded = totalRefunded + finalRefundAmount
    if (newTotalRefunded >= Number(sale.totalAmount)) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED'
        }
      })
    }

    // Add to offline sync queue
    await prisma.offlineSyncQueue.create({
      data: {
        type: 'refund',
        data: JSON.stringify({
          refundId: refund.id,
          saleId: sale.id,
          refundAmount: finalRefundAmount,
          reason
        })
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'refund',
        entityType: 'Sale',
        entityId: sale.id,
        oldValues: JSON.stringify({
          totalAmount: sale.totalAmount,
          status: sale.status
        }),
        newValues: JSON.stringify({
          refundAmount: finalRefundAmount,
          totalRefunded: newTotalRefunded,
          reason
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        refund,
        refundedAmount: finalRefundAmount,
        remainingAmount: remainingAmount - finalRefundAmount
      }
    })

  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}