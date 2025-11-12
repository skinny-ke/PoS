import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/categories/[id] - Get category details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categoryId = params.id

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          where: { isActive: true },
          include: {
            supplier: true,
            wholesaleTiers: {
              where: { isActive: true },
              orderBy: { minQuantity: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Calculate category statistics
    const totalProducts = category.products.length
    const totalStockValue = category.products.reduce(
      (sum, product) => sum + (Number(product.costPrice) * product.stockQuantity),
      0
    )
    const totalRetailValue = category.products.reduce(
      (sum, product) => sum + (Number(product.retailPrice) * product.stockQuantity),
      0
    )
    const totalStockQuantity = category.products.reduce(
      (sum, product) => sum + product.stockQuantity,
      0
    )
    const lowStockProducts = category.products.filter(
      product => product.stockQuantity <= product.minStockLevel
    ).length

    return NextResponse.json({
      success: true,
      data: {
        ...category,
        stats: {
          totalProducts,
          totalStockQuantity,
          totalStockValue,
          totalRetailValue,
          averageMargin: totalRetailValue > 0 ?
            ((totalRetailValue - totalStockValue) / totalRetailValue) * 100 : 0,
          lowStockProducts
        }
      }
    })

  } catch (error) {
    console.error('Error fetching category details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Update category (Admin/Manager only)
export async function PUT(
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

    const categoryId = params.id
    const body = await request.json()
    const { name, description, isActive } = body

    // Get current category for audit logging
    const currentCategory = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!currentCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if name already exists (excluding current category)
    if (name && name.trim() !== currentCategory.name) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          },
          id: { not: categoryId }
        }
      })

      if (existingCategory) {
        return NextResponse.json(
          { success: false, error: 'Category name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description?.trim() : undefined,
        isActive
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'update',
        entityType: 'Category',
        entityId: categoryId,
        oldValues: JSON.stringify(currentCategory),
        newValues: JSON.stringify(updatedCategory)
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedCategory
    })

  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete category (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only admins can delete categories)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categoryId = params.id

    // Check if category has products
    const productsCount = await prisma.product.count({
      where: { categoryId }
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete category with existing products' },
        { status: 400 }
      )
    }

    // Get current category for audit logging
    const currentCategory = await prisma.category.findUnique({
      where: { id: categoryId }
    })

    if (!currentCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'delete',
        entityType: 'Category',
        entityId: categoryId,
        oldValues: JSON.stringify(currentCategory)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}