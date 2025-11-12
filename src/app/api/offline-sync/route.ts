import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// POST /api/offline-sync - Process offline sync queue
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { syncItems } = body

    if (!syncItems || !Array.isArray(syncItems)) {
      return NextResponse.json(
        { success: false, error: 'Sync items array is required' },
        { status: 400 }
      )
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each sync item
    for (const item of syncItems) {
      try {
        const { id, type, data } = item

        switch (type) {
          case 'sale':
            await processOfflineSale(data, user.id)
            break
          case 'stock_entry':
            await processOfflineStockEntry(data, user.id)
            break
          case 'refund':
            await processOfflineRefund(data, user.id)
            break
          default:
            throw new Error(`Unknown sync type: ${type}`)
        }

        // Mark sync item as completed
        await prisma.offlineSyncQueue.update({
          where: { id },
          data: {
            status: 'completed',
            updatedAt: new Date()
          }
        })

        results.processed++
      } catch (error) {
        console.error(`Error processing sync item ${item.id}:`, error)

        // Mark sync item as failed and increment retry count
        await prisma.offlineSyncQueue.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: {
              increment: 1
            },
            updatedAt: new Date()
          }
        })

        results.failed++
        results.errors.push(`Item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Clean up old completed sync items (older than 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    await prisma.offlineSyncQueue.deleteMany({
      where: {
        status: 'completed',
        updatedAt: {
          lt: sevenDaysAgo
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Error processing offline sync:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/offline-sync - Get pending sync items
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const pendingItems = await prisma.offlineSyncQueue.findMany({
      where: {
        status: 'pending',
        retryCount: {
          lt: prisma.offlineSyncQueue.fields.maxRetries
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit
    })

    return NextResponse.json({
      success: true,
      data: pendingItems
    })

  } catch (error) {
    console.error('Error fetching sync items:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions for processing different sync types

async function processOfflineSale(data: any, userId: string) {
  const {
    saleId,
    cartItems,
    paymentMethod,
    customerName,
    customerPhone,
    discountAmount = 0,
    paidAmount,
    offlineId
  } = data

  // Check if sale already exists (avoid duplicates)
  const existingSale = await prisma.sale.findUnique({
    where: { id: saleId }
  })

  if (existingSale) {
    return // Already processed
  }

  // Recalculate totals and validate products
  let subtotal = 0
  let totalTax = 0
  const validatedItems = []

  for (const item of cartItems) {
    const { productId, quantity, wholesaleTierId } = item

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { wholesaleTiers: true }
    })

    if (!product) {
      throw new Error(`Product not found: ${productId}`)
    }

    if (product.stockQuantity < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`)
    }

    let unitPrice = product.retailPrice
    let selectedTier = null

    if (wholesaleTierId) {
      selectedTier = product.wholesaleTiers.find(tier => tier.id === wholesaleTierId)
      if (selectedTier && quantity >= selectedTier.minQuantity) {
        unitPrice = selectedTier.price
      }
    }

    const itemTotal = Number(unitPrice) * quantity
    const itemTax = product.vatStatus === 'INCLUSIVE' ? 0 : (itemTotal * 0.16)

    subtotal += itemTotal
    totalTax += itemTax

    validatedItems.push({
      productId,
      quantity,
      unitPrice,
      totalPrice: itemTotal,
      discountAmount: 0,
      taxAmount: itemTax,
      wholesaleTierId: selectedTier?.id
    })
  }

  const totalAmount = subtotal + totalTax - discountAmount
  const changeAmount = Math.max(0, paidAmount - totalAmount)

  const saleNumber = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

  // Create sale transaction
  await prisma.sale.create({
    data: {
      id: saleId, // Use provided ID for offline sync
      saleNumber,
      userId,
      totalAmount,
      subtotalAmount: subtotal,
      discountAmount,
      taxAmount: totalTax,
      paidAmount,
      changeAmount,
      paymentMethod,
      paymentStatus: 'COMPLETED',
      status: 'COMPLETED',
      customerName,
      customerPhone,
      offlineId,
      saleItems: {
        create: validatedItems
      }
    }
  })

  // Update inventory
  for (const item of validatedItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stockQuantity: {
          decrement: item.quantity
        }
      }
    })
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      saleId,
      amount: totalAmount,
      method: paymentMethod,
      status: 'COMPLETED'
    }
  })
}

async function processOfflineStockEntry(data: any, userId: string) {
  const { productId, quantity, costPrice, supplierId, referenceNumber, notes } = data

  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  const totalCost = Number(costPrice) * quantity

  await prisma.stockEntry.create({
    data: {
      productId,
      quantity,
      costPrice: Number(costPrice),
      totalCost,
      supplierId,
      userId,
      referenceNumber,
      notes
    }
  })

  // Update product stock
  await prisma.product.update({
    where: { id: productId },
    data: {
      stockQuantity: {
        increment: quantity
      }
    }
  })
}

async function processOfflineRefund(data: any, userId: string) {
  const { refundId, saleId, refundAmount, reason } = data

  // Check if refund already exists
  const existingRefund = await prisma.refund.findUnique({
    where: { id: refundId }
  })

  if (existingRefund) {
    return // Already processed
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { refunds: true }
  })

  if (!sale) {
    throw new Error(`Sale not found: ${saleId}`)
  }

  const totalRefunded = sale.refunds.reduce((sum, refund) => sum + Number(refund.totalRefundAmount), 0)
  const remainingAmount = Number(sale.totalAmount) - totalRefunded

  if (Number(refundAmount) > remainingAmount) {
    throw new Error('Refund amount exceeds remaining sale amount')
  }

  // Create refund
  await prisma.refund.create({
    data: {
      id: refundId,
      saleId,
      userId,
      totalRefundAmount: Number(refundAmount),
      reason
    }
  })

  // Update sale status if fully refunded
  if (totalRefunded + Number(refundAmount) >= Number(sale.totalAmount)) {
    await prisma.sale.update({
      where: { id: saleId },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED'
      }
    })
  }
}