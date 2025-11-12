import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/products/low-stock - Get low stock alerts
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get products with low stock (stockQuantity <= minStockLevel)
    const where = {
      isActive: true,
      stockQuantity: {
        lte: prisma.product.fields.minStockLevel
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          stockEntries: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { stockQuantity: 'asc' }, // Most critical first
          { name: 'asc' }
        ]
      }),
      prisma.product.count({ where })
    ])

    // Calculate additional metrics
    const lowStockProducts = products.map(product => {
      const stockDeficit = Math.max(0, product.minStockLevel - product.stockQuantity)
      const reorderValue = stockDeficit * Number(product.costPrice)
      const daysToSellOut = product.stockQuantity > 0 ?
        Math.floor(product.stockQuantity / Math.max(1, product.stockEntries
          .filter(entry => entry.quantity < 0)
          .reduce((sum, entry) => sum + Math.abs(entry.quantity), 0) / 30)) : 0

      return {
        ...product,
        stockDeficit,
        reorderValue,
        daysToSellOut,
        urgency: stockDeficit > 10 ? 'CRITICAL' :
                stockDeficit > 5 ? 'HIGH' :
                stockDeficit > 0 ? 'MEDIUM' : 'LOW'
      }
    })

    // Summary statistics
    const summary = {
      totalLowStockProducts: total,
      totalStockDeficit: lowStockProducts.reduce((sum, p) => sum + p.stockDeficit, 0),
      totalReorderValue: lowStockProducts.reduce((sum, p) => sum + p.reorderValue, 0),
      criticalCount: lowStockProducts.filter(p => p.urgency === 'CRITICAL').length,
      highCount: lowStockProducts.filter(p => p.urgency === 'HIGH').length,
      mediumCount: lowStockProducts.filter(p => p.urgency === 'MEDIUM').length
    }

    return NextResponse.json({
      success: true,
      data: lowStockProducts,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching low stock products:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}