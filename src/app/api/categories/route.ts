import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {}
    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calculate total stock value for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const products = await prisma.product.findMany({
          where: {
            categoryId: category.id,
            isActive: true
          },
          select: {
            stockQuantity: true,
            costPrice: true,
            retailPrice: true
          }
        })

        const totalProducts = products.length
        const totalStockValue = products.reduce(
          (sum, product) => sum + (Number(product.costPrice) * product.stockQuantity),
          0
        )
        const totalRetailValue = products.reduce(
          (sum, product) => sum + (Number(product.retailPrice) * product.stockQuantity),
          0
        )

        return {
          ...category,
          stats: {
            totalProducts,
            totalStockValue,
            totalRetailValue,
            averageMargin: totalRetailValue > 0 ?
              ((totalRetailValue - totalStockValue) / totalRetailValue) * 100 : 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: categoriesWithStats
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create category (Admin/Manager only)
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
    const { name, description } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category name already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category name already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim()
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'create',
        entityType: 'Category',
        entityId: category.id,
        newValues: JSON.stringify(category)
      }
    })

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}