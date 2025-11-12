import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/products/search?q=query - Search products for POS interface
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const searchTerm = query.trim()

    // Search across name, barcode, and SKU
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { gt: 0 },
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { barcode: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        wholesaleTiers: {
          where: { isActive: true },
          orderBy: { minQuantity: 'asc' }
        }
      },
      take: limit,
      orderBy: [
        { name: 'asc' }
      ]
    })

    // If no results from exact search, try partial matching
    if (products.length === 0) {
      const partialProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          stockQuantity: { gt: 0 },
          OR: [
            { name: { startsWith: searchTerm, mode: 'insensitive' } },
            { barcode: { startsWith: searchTerm, mode: 'insensitive' } },
            { sku: { startsWith: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          wholesaleTiers: {
            where: { isActive: true },
            orderBy: { minQuantity: 'asc' }
          }
        },
        take: limit,
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({
        success: true,
        data: partialProducts
      })
    }

    return NextResponse.json({
      success: true,
      data: products
    })

  } catch (error) {
    console.error('Error searching products:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/products/search/barcode - Search product by barcode
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { barcode } = body

    if (!barcode) {
      return NextResponse.json(
        { success: false, error: 'Barcode is required' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { 
        barcode: barcode.trim(),
        isActive: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        },
        wholesaleTiers: {
          where: { isActive: true },
          orderBy: { minQuantity: 'asc' }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.stockQuantity === 0) {
      return NextResponse.json(
        { success: false, error: 'Product is out of stock' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: product
    })

  } catch (error) {
    console.error('Error searching product by barcode:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}