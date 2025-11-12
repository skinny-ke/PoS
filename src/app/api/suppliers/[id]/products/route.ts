import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/suppliers/[id]/products - Get supplier's products
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, isActive: true }
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const where = {
      supplierId,
      isActive: true
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          wholesaleTiers: {
            where: { isActive: true },
            orderBy: { minQuantity: 'asc' }
          },
          stockEntries: {
            where: { supplierId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              quantity: true,
              costPrice: true,
              totalCost: true,
              createdAt: true,
              referenceNumber: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({ where })
    ])

    // Calculate supplier-specific statistics for each product
    const productsWithStats = products.map(product => {
      const supplierStockEntries = product.stockEntries
      const totalPurchased = supplierStockEntries
        .filter(entry => entry.quantity > 0)
        .reduce((sum, entry) => sum + entry.quantity, 0)
      const totalPurchaseValue = supplierStockEntries
        .filter(entry => entry.quantity > 0)
        .reduce((sum, entry) => sum + Number(entry.totalCost), 0)
      const lastPurchaseDate = supplierStockEntries.length > 0 ?
        supplierStockEntries[0].createdAt : null
      const averagePurchasePrice = totalPurchased > 0 ?
        totalPurchaseValue / totalPurchased : 0

      return {
        ...product,
        supplierStats: {
          totalPurchased,
          totalPurchaseValue,
          lastPurchaseDate,
          averagePurchasePrice,
          purchaseCount: supplierStockEntries.filter(e => e.quantity > 0).length
        }
      }
    })

    // Calculate overall supplier product statistics
    const allProducts = await prisma.product.findMany({
      where: { supplierId, isActive: true },
      select: {
        stockQuantity: true,
        costPrice: true,
        stockEntries: {
          where: { supplierId },
          select: {
            quantity: true,
            totalCost: true
          }
        }
      }
    })

    const supplierStats = {
      totalProducts: allProducts.length,
      totalStockValue: allProducts.reduce(
        (sum, product) => sum + (Number(product.costPrice) * product.stockQuantity), 0
      ),
      totalPurchaseValue: allProducts.reduce(
        (sum, product) => sum + product.stockEntries
          .filter(entry => entry.quantity > 0)
          .reduce((sum, entry) => sum + Number(entry.totalCost), 0), 0
      ),
      totalPurchasedQuantity: allProducts.reduce(
        (sum, product) => sum + product.stockEntries
          .filter(entry => entry.quantity > 0)
          .reduce((sum, entry) => sum + entry.quantity, 0), 0
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          isActive: supplier.isActive
        },
        products: productsWithStats,
        supplierStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching supplier products:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}