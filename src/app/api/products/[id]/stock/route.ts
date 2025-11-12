import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// POST /api/products/[id]/stock - Adjust stock levels (Admin/Manager only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const productId = params.id
    const body = await request.json()
    const {
      quantity,
      costPrice,
      supplierId,
      referenceNumber,
      notes,
      reason
    } = body

    // Validate required fields
    if (!quantity || quantity === 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity is required and cannot be zero' },
        { status: 400 }
      )
    }

    // Get current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, supplier: true }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if stock adjustment would result in negative stock (unless it's a stock-in)
    if (quantity < 0 && product.stockQuantity + quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient stock for this adjustment' },
        { status: 400 }
      )
    }

    // Use provided cost price or current product cost price
    const adjustmentCostPrice = costPrice ? parseFloat(costPrice) : product.costPrice
    const totalCost = Number(adjustmentCostPrice) * Math.abs(quantity)

    // Create stock entry
    const stockEntry = await prisma.stockEntry.create({
      data: {
        productId,
        quantity: parseInt(quantity),
        costPrice: adjustmentCostPrice,
        totalCost,
        supplierId,
        userId: user.id,
        referenceNumber: referenceNumber || `ADJ-${Date.now()}`,
        notes: notes || reason || 'Manual stock adjustment'
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Update product stock quantity
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: parseInt(quantity)
        }
      },
      include: {
        category: true,
        supplier: true
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
          totalCost
        })
      }
    })

    // Check for low stock alert
    const stockStatus = updatedProduct.stockQuantity <= updatedProduct.minStockLevel ? 'LOW_STOCK' :
                       updatedProduct.stockQuantity >= updatedProduct.maxStockLevel ? 'OVERSTOCK' : 'NORMAL'

    return NextResponse.json({
      success: true,
      data: {
        product: updatedProduct,
        stockEntry,
        stockStatus,
        previousStock: product.stockQuantity,
        newStock: updatedProduct.stockQuantity
      }
    })

  } catch (error) {
    console.error('Error adjusting stock:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}