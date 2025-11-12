import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// POST /api/products/bulk-stock - Bulk stock adjustments (Admin/Manager only)
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { adjustments, supplierId, referenceNumber, notes } = body

    // Validate adjustments array
    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Adjustments array is required' },
        { status: 400 }
      )
    }

    if (adjustments.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 adjustments allowed per request' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []
    let totalValue = 0

    // Process each adjustment
    for (const adjustment of adjustments) {
      const { productId, quantity, costPrice, reason } = adjustment

      try {
        // Validate adjustment data
        if (!productId || !quantity || quantity === 0) {
          errors.push({
            productId,
            error: 'Product ID and non-zero quantity are required'
          })
          continue
        }

        // Get current product
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: { category: true, supplier: true }
        })

        if (!product) {
          errors.push({
            productId,
            error: 'Product not found'
          })
          continue
        }

        // Check stock levels for negative adjustments
        if (quantity < 0 && product.stockQuantity + quantity < 0) {
          errors.push({
            productId,
            productName: product.name,
            error: `Insufficient stock. Current: ${product.stockQuantity}, Requested: ${quantity}`
          })
          continue
        }

        // Use provided cost price or current product cost price
        const adjustmentCostPrice = costPrice ? parseFloat(costPrice) : product.costPrice
        const adjustmentTotalCost = Number(adjustmentCostPrice) * Math.abs(quantity)

        // Create stock entry
        const stockEntry = await prisma.stockEntry.create({
          data: {
            productId,
            quantity: parseInt(quantity),
            costPrice: adjustmentCostPrice,
            totalCost: adjustmentTotalCost,
            supplierId: supplierId || product.supplierId,
            userId: user.id,
            referenceNumber: referenceNumber || `BULK-${Date.now()}`,
            notes: notes || reason || 'Bulk stock adjustment'
          }
        })

        // Update product stock quantity
        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: {
            stockQuantity: {
              increment: parseInt(quantity)
            }
          }
        })

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            productId,
            action: 'stock_adjustment',
            entityType: 'Product',
            entityId: productId,
            oldValues: JSON.stringify({
              stockQuantity: product.stockQuantity,
              costPrice: product.costPrice
            }),
            newValues: JSON.stringify({
              stockQuantity: updatedProduct.stockQuantity,
              costPrice: updatedProduct.costPrice,
              adjustment: quantity,
              totalCost: adjustmentTotalCost
            })
          }
        })

        totalValue += adjustmentTotalCost

        results.push({
          productId,
          productName: product.name,
          previousStock: product.stockQuantity,
          newStock: updatedProduct.stockQuantity,
          adjustment: quantity,
          costPrice: adjustmentCostPrice,
          totalCost: adjustmentTotalCost,
          stockEntryId: stockEntry.id
        })

      } catch (error) {
        console.error(`Error processing adjustment for product ${productId}:`, error)
        errors.push({
          productId,
          error: 'Internal error processing adjustment'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        successful: results.length - errors.length,
        failed: errors.length,
        results,
        errors,
        summary: {
          totalValue,
          totalAdjustments: results.length,
          referenceNumber: referenceNumber || `BULK-${Date.now()}`
        }
      }
    })

  } catch (error) {
    console.error('Error processing bulk stock adjustments:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}