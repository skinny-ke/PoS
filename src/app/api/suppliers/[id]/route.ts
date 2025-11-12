import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/suppliers/[id] - Get supplier details
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        products: {
          where: { isActive: true },
          include: {
            category: true,
            wholesaleTiers: {
              where: { isActive: true },
              orderBy: { minQuantity: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        },
        stockEntries: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    })

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Calculate supplier statistics
    const totalProducts = supplier.products.length
    const totalStockValue = supplier.products.reduce(
      (sum, product) => sum + (Number(product.costPrice) * product.stockQuantity),
      0
    )
    const totalPurchases = supplier.stockEntries
      .filter(entry => entry.quantity > 0)
      .reduce((sum, entry) => sum + Number(entry.totalCost), 0)
    const totalStockEntries = supplier.stockEntries.length
    const lastPurchaseDate = supplier.stockEntries.length > 0 ? supplier.stockEntries[0].createdAt : null

    // Recent purchases (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPurchases = supplier.stockEntries.filter(
      entry => entry.createdAt >= thirtyDaysAgo && entry.quantity > 0
    )

    const recentPurchaseValue = recentPurchases.reduce(
      (sum, entry) => sum + Number(entry.totalCost), 0
    )

    return NextResponse.json({
      success: true,
      data: {
        ...supplier,
        stats: {
          totalProducts,
          totalStockValue,
          totalPurchases,
          totalStockEntries,
          lastPurchaseDate,
          averageOrderValue: supplier.stockEntries.filter(e => e.quantity > 0).length > 0 ?
            totalPurchases / supplier.stockEntries.filter(e => e.quantity > 0).length : 0,
          recentPurchaseValue,
          recentPurchaseCount: recentPurchases.length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching supplier details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/suppliers/[id] - Update supplier (Admin/Manager only)
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

    const supplierId = params.id
    const body = await request.json()
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      isActive
    } = body

    // Get current supplier for audit logging
    const currentSupplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!currentSupplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Check if name already exists (excluding current supplier)
    if (name && name.trim() !== currentSupplier.name) {
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          },
          id: { not: supplierId }
        }
      })

      if (existingSupplier) {
        return NextResponse.json(
          { success: false, error: 'Supplier name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: name ? name.trim() : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson?.trim() : undefined,
        email: email !== undefined ? email?.trim() : undefined,
        phone: phone !== undefined ? phone?.trim() : undefined,
        address: address !== undefined ? address?.trim() : undefined,
        isActive
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'update',
        entityType: 'Supplier',
        entityId: supplierId,
        oldValues: JSON.stringify(currentSupplier),
        newValues: JSON.stringify(updatedSupplier)
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedSupplier
    })

  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/suppliers/[id] - Delete supplier (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role (only admins can delete suppliers)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supplierId = params.id

    // Check if supplier has products
    const productsCount = await prisma.product.count({
      where: { supplierId }
    })

    if (productsCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete supplier with existing products. Remove supplier from products first.' },
        { status: 400 }
      )
    }

    // Get current supplier for audit logging
    const currentSupplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!currentSupplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Delete supplier
    await prisma.supplier.delete({
      where: { id: supplierId }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'delete',
        entityType: 'Supplier',
        entityId: supplierId,
        oldValues: JSON.stringify(currentSupplier)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Supplier deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}