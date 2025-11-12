import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/products - List products with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
      stockQuantity: { gt: 0 }
    }

    if (category && category !== 'all') {
      where.categoryId = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          wholesaleTiers: {
            where: { isActive: true },
            orderBy: { minQuantity: 'asc' }
          }
        },
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create new product (Admin/Manager only)
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
    const {
      name,
      description,
      barcode,
      sku,
      categoryId,
      supplierId,
      costPrice,
      retailPrice,
      wholesalePrice,
      stockQuantity,
      minStockLevel,
      maxStockLevel,
      vatStatus,
      imageUrl
    } = body

    // Validate required fields
    if (!name || !categoryId || !costPrice || !retailPrice) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if barcode or SKU already exists
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode }
      })
      if (existingBarcode) {
        return NextResponse.json(
          { success: false, error: 'Barcode already exists' },
          { status: 400 }
        )
      }
    }

    if (sku) {
      const existingSKU = await prisma.product.findUnique({
        where: { sku }
      })
      if (existingSKU) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 400 }
        )
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        barcode,
        sku,
        categoryId,
        supplierId,
        costPrice: parseFloat(costPrice),
        retailPrice: parseFloat(retailPrice),
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
        stockQuantity: parseInt(stockQuantity) || 0,
        minStockLevel: parseInt(minStockLevel) || 5,
        maxStockLevel: parseInt(maxStockLevel) || 100,
        vatStatus: vatStatus || 'NONE',
        imageUrl
      },
      include: {
        category: true,
        supplier: true
      }
    })

    // Create initial stock entry if stock quantity > 0
    if (stockQuantity > 0) {
      await prisma.stockEntry.create({
        data: {
          productId: product.id,
          quantity: parseInt(stockQuantity),
          costPrice: parseFloat(costPrice),
          totalCost: parseFloat(costPrice) * parseInt(stockQuantity),
          userId: user.id,
          referenceNumber: 'INITIAL_STOCK',
          notes: 'Initial stock entry'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}