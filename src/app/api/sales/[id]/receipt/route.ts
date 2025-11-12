import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'
import { ReceiptData } from '@/lib/receiptPrinter'

// GET /api/sales/[id]/receipt - Get receipt data for printing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        saleItems: {
          include: {
            product: {
              select: {
                name: true,
                sku: true
              }
            }
          }
        },
        payments: true
      }
    })

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // Get user details and check permissions
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check permissions - users can only view their own receipts unless admin/manager
    if (currentUser.role === 'CASHIER' && sale.userId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find M-Pesa receipt if payment was made via M-Pesa
    const mpesaPayment = sale.payments.find(p => p.method === 'MPESA' && p.reference)
    
    const receiptData: ReceiptData = {
      saleNumber: sale.saleNumber,
      cashierName: `${sale.user.firstName} ${sale.user.lastName}`,
      customerName: sale.customerName || undefined,
      customerPhone: sale.customerPhone || undefined,
      items: sale.saleItems.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      })),
      subtotal: Number(sale.subtotalAmount),
      discount: Number(sale.discountAmount),
      tax: Number(sale.taxAmount),
      total: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
      date: sale.createdAt.toISOString(),
      businessName: 'Murimi POS',
      businessAddress: 'Nairobi, Kenya',
      businessPhone: '+254 700 000 000',
      businessEmail: 'info@murimipos.com',
      mpesaReceipt: mpesaPayment?.reference || undefined
    }

    // Mark receipt as printed
    await prisma.sale.update({
      where: { id: sale.id },
      data: { receiptPrinted: true }
    })

    return NextResponse.json({
      success: true,
      data: receiptData
    })

  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sales/[id]/receipt/print - Print receipt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { printOnServer = false } = await request.json()

    if (printOnServer) {
      // For server-side printing (if supported by the environment)
      // This would typically be used with thermal printers connected to the server
      return NextResponse.json({
        success: true,
        message: 'Receipt queued for server-side printing'
      })
    } else {
      // Client-side printing - just mark as printed
      const sale = await prisma.sale.update({
        where: { id: params.id },
        data: { receiptPrinted: true }
      })

      return NextResponse.json({
        success: true,
        message: 'Receipt marked for printing',
        data: { receiptPrinted: true }
      })
    }

  } catch (error) {
    console.error('Error printing receipt:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}