import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

// GET /api/sales/[id] - Get specific sale details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details and check role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const saleId = params.id

    // Find sale with role-based access
    const where: any = { id: saleId }
    if (user.role === 'CASHIER') {
      where.userId = user.id
    }

    const sale = await prisma.sale.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                imageUrl: true,
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            wholesaleTier: true
          }
        },
        payments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        refunds: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      )
    }

    // Calculate additional metrics
    const totalItems = sale.saleItems.reduce((sum, item) => sum + item.quantity, 0)
    const totalRefunds = sale.refunds.reduce((sum, refund) => sum + Number(refund.totalRefundAmount), 0)
    const netAmount = Number(sale.totalAmount) - totalRefunds

    return NextResponse.json({
      success: true,
      data: {
        ...sale,
        totalItems,
        totalRefunds,
        netAmount
      }
    })

  } catch (error) {
    console.error('Error fetching sale details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}