import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/suppliers - List suppliers
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
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            },
            stockEntries: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Calculate supplier statistics
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const products = await prisma.product.findMany({
          where: {
            supplierId: supplier.id,
            isActive: true
          },
          select: {
            stockQuantity: true,
            costPrice: true
          }
        })

        const stockEntries = await prisma.stockEntry.findMany({
          where: { supplierId: supplier.id },
          select: {
            quantity: true,
            totalCost: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })

        const totalProducts = products.length
        const totalStockValue = products.reduce(
          (sum, product) => sum + (Number(product.costPrice) * product.stockQuantity),
          0
        )
        const totalPurchases = stockEntries
          .filter(entry => entry.quantity > 0)
          .reduce((sum, entry) => sum + Number(entry.totalCost), 0)
        const lastPurchaseDate = stockEntries.length > 0 ? stockEntries[0].createdAt : null

        return {
          ...supplier,
          stats: {
            totalProducts,
            totalStockValue,
            totalPurchases,
            lastPurchaseDate,
            averageOrderValue: stockEntries.length > 0 ?
              totalPurchases / stockEntries.filter(e => e.quantity > 0).length : 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: suppliersWithStats
    })

  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/suppliers - Create supplier (Admin/Manager only)
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
      contactPerson,
      email,
      phone,
      address
    } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Check if supplier name already exists
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    })

    if (existingSupplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier name already exists' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim(),
        email: email?.trim(),
        phone: phone?.trim(),
        address: address?.trim()
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'create',
        entityType: 'Supplier',
        entityId: supplier.id,
        newValues: JSON.stringify(supplier)
      }
    })

    return NextResponse.json({
      success: true,
      data: supplier
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}