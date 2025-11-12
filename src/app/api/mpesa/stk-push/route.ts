import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { 
  initiateSTKPush, 
  formatPhoneNumber, 
  isValidMpesaPhone, 
  generateMpesaTimestamp 
} from '@/lib/mpesa'

// POST /api/mpesa/stk-push - Initiate STK Push payment
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, phoneNumber, saleId } = body

    // Validate input
    if (!amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Amount and phone number are required' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than zero' },
        { status: 400 }
      )
    }

    // Validate and format phone number
    if (!isValidMpesaPhone(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid M-Pesa phone number format' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Get or create user record
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate unique account reference
    const accountReference = `MURIMI${Date.now()}`
    const timestamp = generateMpesaTimestamp()

    // Create sale record if not provided
    let sale = null
    if (saleId) {
      sale = await prisma.sale.findUnique({
        where: { id: saleId }
      })
    }

    if (!sale && !saleId) {
      // Create a temporary sale for M-Pesa payment
      sale = await prisma.sale.create({
        data: {
          saleNumber: `SAL${timestamp}`,
          userId: user.id,
          totalAmount: amount,
          subtotalAmount: amount,
          paidAmount: 0,
          paymentMethod: 'MPESA',
          paymentStatus: 'PENDING',
          status: 'COMPLETED',
          customerPhone: formattedPhone
        }
      })
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        saleId: sale!.id,
        amount: amount,
        method: 'MPESA',
        status: 'PENDING',
        reference: accountReference
      }
    })

    try {
      // Initiate STK Push
      const stkResponse = await initiateSTKPush(amount, formattedPhone, accountReference)

      if (stkResponse.ResponseCode === '0') {
        // STK push initiated successfully
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
            mpesaMerchantId: stkResponse.MerchantRequestID,
            mpesaTimestamp: timestamp
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            paymentId: payment.id,
            saleId: sale!.id,
            checkoutRequestId: stkResponse.CheckoutRequestID,
            merchantRequestId: stkResponse.MerchantRequestID,
            customerMessage: stkResponse.CustomerMessage
          }
        })
      } else {
        // STK push failed
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            mpesaTimestamp: timestamp
          }
        })

        return NextResponse.json({
          success: false,
          error: stkResponse.ResponseDescription || 'STK push failed'
        }, { status: 400 })
      }
    } catch (stkError: any) {
      console.error('STK Push error:', stkError)
      
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          mpesaTimestamp: timestamp
        }
      })

      return NextResponse.json({
        success: false,
        error: stkError.message || 'STK push service unavailable'
      }, { status: 503 })
    }

  } catch (error) {
    console.error('M-Pesa STK push error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}