import { NextRequest, NextResponse } from 'next/server'
import { processMpesaCallback } from '@/lib/mpesa'

// POST /api/mpesa/callback - Handle M-Pesa callback
export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json()
    
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2))

    // Process the callback
    const result = await processMpesaCallback(callbackData)

    if (result.success) {
      // Log successful payment
      console.log('M-Pesa payment completed:', {
        paymentId: result.data?.paymentId,
        saleId: result.data?.saleId,
        mpesaReceipt: result.data?.mpesaReceipt,
        amount: result.data?.amount
      })

      return NextResponse.json({
        ResultCode: 0,
        ResultDesc: 'Success'
      })
    } else {
      // Log failed payment
      console.error('M-Pesa payment failed:', result.data?.error)

      return NextResponse.json({
        ResultCode: 1,
        ResultDesc: result.data?.error || 'Payment processing failed'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('M-Pesa callback error:', error)

    return NextResponse.json({
      ResultCode: 1,
      ResultDesc: 'Callback processing error'
    }, { status: 500 })
  }
}

// GET /api/mpesa/callback - Health check for M-Pesa callback URL
export async function GET() {
  return NextResponse.json({
    status: 'M-Pesa callback endpoint is active',
    timestamp: new Date().toISOString()
  })
}