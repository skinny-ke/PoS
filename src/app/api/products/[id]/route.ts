import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/products/[id] - Get product details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const productId = params.id

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        supplier: true,
        wholesaleTiers: {
          where: { isActive: true },
          orderBy: { minQuantity: 'asc' }
        },
        stockEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
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
      }
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Calculate stock status
    const stockStatus = product.stockQuantity <= product.minStockLevel ? 'LOW_STOCK' :
                       product.stockQuantity >= product.maxStockLevel ? 'OVERSTOCK' : 'NORMAL'

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        stockStatus,
        totalStockValue: Number(product.costPrice) * product.stockQuantity
      }
    })

  } catch (error) {
    console.error('Error fetching product details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product (Admin/Manager only)
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

    const productId = params.id
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
      imageUrl,
      isActive
    } = body

    // Get current product for audit logging
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if barcode or SKU already exists (excluding current product)
    if (barcode && barcode !== currentProduct.barcode) {
      const existingBarcode = await prisma.product.findFirst({
        where: {
          barcode,
          id: { not: productId }
        }
      })
      if (existingBarcode) {
        return NextResponse.json(
          { success: false, error: 'Barcode already exists' },
          { status: 400 }
        )
      }
    }

    if (sku && sku !== currentProduct.sku) {
      const existingSKU = await prisma.product.findFirst({
        where: {
          sku,
          id: { not: productId }
        }
      })
      if (existingSKU) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 400 }
        )
      }
    }

    // Calculate stock change for audit logging
    const stockChange = stockQuantity !== undefined ? stockQuantity - currentProduct.stockQuantity : 0

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        barcode,
        sku,
        categoryId,
        supplierId,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
        retailPrice: retailPrice !== undefined ? parseFloat(retailPrice) : undefined,
        wholesalePrice: wholesalePrice !== undefined ? parseFloat(wholesalePrice) : null,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : undefined,
        minStockLevel: minStockLevel !== undefined ? parseInt(minStockLevel) : undefined,
        maxStockLevel: maxStockLevel !== undefined ? parseInt(maxStockLevel) : undefined,
        vatStatus,
        imageUrl,
        isActive
      },
      include: {
        category: true,
        supplier: true,
        wholesaleTiers: {
          where: { isActive: true },
          orderBy: { minQuantity: 'asc' }
        }
      }
    })

    // Create stock entry if stock quantity changed
    if (stockChange !== 0) {
      await prisma.stockEntry.create({
        data: {
          productId,
          quantity: stockChange,
          costPrice: updatedProduct.costPrice,
          totalCost: Number(updatedProduct.costPrice) * Math.abs(stockChange),
          userId: user.id,
          referenceNumber: 'MANUAL_ADJUSTMENT',
          notes: `Stock adjusted from ${currentProduct.stockQuantity} to ${updatedProduct.stockQuantity}`
        }
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        productId,
        action: 'update',
        entityType: 'Product',
        entityId: productId,
        oldValues: JSON.stringify(currentProduct),
        newValues: JSON.stringify(updatedProduct)
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedProduct
    })

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Soft delete product (Admin/Manager only)
export async function DELETE(
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

    // Get current product for audit logging
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!currentProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
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
        action: 'delete',
        entityType: 'Product',
        entityId: productId,
        oldValues: JSON.stringify(currentProduct),
        newValues: JSON.stringify(updatedProduct)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}