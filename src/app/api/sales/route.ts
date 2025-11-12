import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'
import { initiateSTKPush, formatPhoneNumber } from '@/lib/mpesa'
import { printReceipt } from '@/lib/receiptPrinter'

// POST /api/sales - Process new sales transactions
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      cartItems,
      paymentMethod,
      customerName,
      customerPhone,
      discountAmount = 0,
      paidAmount,
      offlineId,
      phoneNumber // For M-Pesa payments
    } = body

    // Validate required fields
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart items are required' },
        { status: 400 }
      )
    }

    if (!paymentMethod || !['CASH', 'MPESA', 'CARD', 'SPLIT'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Valid payment method is required' },
        { status: 400 }
      )
    }

    if (!paidAmount || paidAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid paid amount is required' },
        { status: 400 }
      )
    }

    // Validate M-Pesa phone number if payment method is MPESA
    if (paymentMethod === 'MPESA' && !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required for M-Pesa payments' },
        { status: 400 }
      )
    }

    // Calculate totals and validate products
    let subtotal = 0
    let totalTax = 0
    const validatedItems = []

    for (const item of cartItems) {
      const { productId, quantity, wholesaleTierId } = item

      if (!productId || !quantity || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid cart item data' },
          { status: 400 }
        )
      }

      // Get product with wholesale tiers
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { wholesaleTiers: true }
      })

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product not found: ${productId}` },
          { status: 404 }
        )
      }

      if (product.stockQuantity < quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        )
      }

      // Determine price based on wholesale tier or retail price
      let unitPrice = product.retailPrice
      let selectedTier = null

      if (wholesaleTierId) {
        selectedTier = product.wholesaleTiers.find(tier => tier.id === wholesaleTierId)
        if (selectedTier && quantity >= selectedTier.minQuantity) {
          unitPrice = selectedTier.price
        }
      } else {
        // Auto-apply best wholesale tier
        const applicableTiers = product.wholesaleTiers
          .filter(tier => quantity >= tier.minQuantity)
          .sort((a, b) => b.minQuantity - a.minQuantity)

        if (applicableTiers.length > 0) {
          selectedTier = applicableTiers[0]
          unitPrice = selectedTier.price
        }
      }

      const itemTotal = Number(unitPrice) * quantity
      const itemTax = product.vatStatus === 'INCLUSIVE' ? 0 : (itemTotal * 0.16) // 16% VAT

      subtotal += itemTotal
      totalTax += itemTax

      validatedItems.push({
        productId,
        quantity,
        unitPrice,
        totalPrice: itemTotal,
        discountAmount: 0,
        taxAmount: itemTax,
        wholesaleTierId: selectedTier?.id
      })
    }

    const totalAmount = subtotal + totalTax - discountAmount
    const changeAmount = Math.max(0, paidAmount - totalAmount)

    // Generate unique sale number
    const saleNumber = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create sale transaction
    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        userId: user.id,
        totalAmount,
        subtotalAmount: subtotal,
        discountAmount,
        taxAmount: totalTax,
        paidAmount,
        changeAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'MPESA' ? 'PENDING' : 'COMPLETED',
        customerName,
        customerPhone,
        offlineId,
        saleItems: {
          create: validatedItems
        }
      },
      include: {
        saleItems: {
          include: {
            product: true,
            wholesaleTier: true
          }
        }
      }
    })

    // Handle payment processing
    if (paymentMethod === 'MPESA') {
      try {
        const formattedPhone = formatPhoneNumber(phoneNumber)
        const stkResponse = await initiateSTKPush(totalAmount, formattedPhone, saleNumber)

        // Create payment record
        await prisma.payment.create({
          data: {
            saleId: sale.id,
            amount: totalAmount,
            method: 'MPESA',
            status: 'PENDING',
            mpesaMerchantId: stkResponse.MerchantRequestID,
            mpesaCheckoutRequestId: stkResponse.CheckoutRequestID
          }
        })

        // Add to offline sync queue if offline
        if (offlineId) {
          await prisma.offlineSyncQueue.create({
            data: {
              type: 'sale',
              data: JSON.stringify({
                saleId: sale.id,
                offlineId,
                action: 'create_sale'
              })
            }
          })
        }

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'sale',
            entityType: 'Sale',
            entityId: sale.id,
            newValues: JSON.stringify({
              saleNumber,
              totalAmount,
              paymentMethod: 'MPESA',
              status: 'PENDING'
            })
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            sale,
            paymentStatus: 'PENDING',
            message: 'M-Pesa payment initiated. Please complete payment on your phone.'
          }
        })

      } catch (mpesaError) {
        console.error('M-Pesa payment error:', mpesaError)

        // Update sale status to failed
        await prisma.sale.update({
          where: { id: sale.id },
          data: { paymentStatus: 'FAILED' }
        })

        return NextResponse.json(
          { success: false, error: 'Failed to initiate M-Pesa payment' },
          { status: 500 }
        )
      }
    } else {
      // For cash/card payments, update inventory immediately
      for (const item of validatedItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }

      // Create payment record for non-MPesa payments
      await prisma.payment.create({
        data: {
          saleId: sale.id,
          amount: totalAmount,
          method: paymentMethod,
          status: 'COMPLETED'
        }
      })

      // Add to offline sync queue if offline
      if (offlineId) {
        await prisma.offlineSyncQueue.create({
          data: {
            type: 'sale',
            data: JSON.stringify({
              saleId: sale.id,
              offlineId,
              action: 'create_sale'
            })
          }
        })
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'sale',
          entityType: 'Sale',
          entityId: sale.id,
          newValues: JSON.stringify({
            saleNumber,
            totalAmount,
            paymentMethod,
            status: 'COMPLETED'
          })
        }
      })

      // Auto-print receipt if requested
      try {
        const receiptData = {
          saleNumber: sale.saleNumber,
          cashierName: `${user.firstName} ${user.lastName}`,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          items: sale.saleItems.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          subtotal: sale.subtotalAmount,
          discount: sale.discountAmount,
          tax: sale.taxAmount,
          total: sale.totalAmount,
          paymentMethod: sale.paymentMethod,
          date: sale.createdAt.toISOString()
        }

        // Print receipt (this will be handled on the client side)
        // await printReceipt(receiptData)

        // Mark receipt as printed
        await prisma.sale.update({
          where: { id: sale.id },
          data: { receiptPrinted: true }
        })
      } catch (printError) {
        console.error('Receipt printing error:', printError)
        // Don't fail the sale if printing fails
      }

      return NextResponse.json({
        success: true,
        data: {
          sale,
          paymentStatus: 'COMPLETED',
          changeAmount
        }
      })
    }

  } catch (error) {
    console.error('Error processing sale:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/sales - Retrieve sales history with filtering
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const cashierId = searchParams.get('cashierId')
    const paymentMethod = searchParams.get('paymentMethod')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Role-based filtering
    if (user.role === 'CASHIER') {
      where.userId = user.id
    } else if (cashierId) {
      where.userId = cashierId
    }

    // Date filtering
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Payment method filtering
    if (paymentMethod) {
      where.paymentMethod = paymentMethod
    }

    // Status filtering
    if (status) {
      where.status = status
    }

    // Search filtering
    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
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
                  sku: true
                }
              }
            }
          },
          payments: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.sale.count({ where })
    ])

    // Calculate summary statistics
    const summary = await prisma.sale.aggregate({
      where,
      _sum: {
        totalAmount: true,
        discountAmount: true,
        taxAmount: true
      },
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        totalSales: summary._count.id,
        totalRevenue: summary._sum.totalAmount || 0,
        totalDiscounts: summary._sum.discountAmount || 0,
        totalTax: summary._sum.taxAmount || 0
      }
    })

  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}