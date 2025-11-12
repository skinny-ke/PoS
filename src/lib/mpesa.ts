// M-Pesa Daraja API utilities
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// M-Pesa configuration
const config = {
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY!,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
  passkey: process.env.MPESA_PASSKEY!,
  authTokenUrl: process.env.MPESA_AUTH_TOKEN_URL || 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  stkPushUrl: process.env.MPESA_STK_PUSH_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa/callback`
}

// Generate M-Pesa timestamp
export function generateMpesaTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  
  return `${year}${month}${day}${hour}${minute}${second}`
}

// Generate M-Pesa password
export function generateMpesaPassword(): string {
  const timestamp = generateMpesaTimestamp()
  const password = Buffer.from(`${config.businessShortCode}${config.passkey}${timestamp}`).toString('base64')
  return password
}

// Get M-Pesa access token
export async function getMpesaAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64')
  
  const response = await fetch(config.authTokenUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

// STK Push request
export async function initiateSTKPush(amount: number, phoneNumber: string, accountReference: string): Promise<any> {
  const accessToken = await getMpesaAccessToken()
  const timestamp = generateMpesaTimestamp()
  const password = generateMpesaPassword()

  const payload = {
    BusinessShortCode: config.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.floor(amount), // Ensure integer amount
    PartyA: phoneNumber,
    PartyB: config.businessShortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: 'Murimi POS Payment'
  }

  const response = await fetch(config.stkPushUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`STK push failed: ${response.statusText}`)
  }

  return await response.json()
}

// Process M-Pesa callback
export async function processMpesaCallback(callbackData: any): Promise<{ success: boolean, data?: any }> {
  try {
    const { stkCallback } = callbackData
    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    if (ResultCode === 0) {
      // Successful payment
      const items = CallbackMetadata.Item
      const amount = items.find((item: any) => item.Name === 'Amount')?.Value
      const mpesaReceipt = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const phoneNumber = items.find((item: any) => item.Name === 'PhoneNumber')?.Value

      // Find the payment record
      const payment = await prisma.payment.findFirst({
        where: { 
          mpesaCheckoutRequestId: CheckoutRequestID 
        },
        include: {
          sale: {
            include: {
              saleItems: {
                include: {
                  product: true
                }
              }
            }
          }
        }
      })

      if (payment) {
        // Update payment status
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            reference: mpesaReceipt,
            mpesaTimestamp: generateMpesaTimestamp()
          }
        })

        // Update sale payment status
        await prisma.sale.update({
          where: { id: payment.saleId },
          data: { paymentStatus: 'COMPLETED' }
        })

        // Update product stock quantities
        for (const saleItem of payment.sale.saleItems) {
          await prisma.product.update({
            where: { id: saleItem.productId },
            data: {
              stockQuantity: {
                decrement: saleItem.quantity
              }
            }
          })
        }

        return {
          success: true,
          data: {
            paymentId: payment.id,
            saleId: payment.saleId,
            mpesaReceipt,
            amount,
            phoneNumber
          }
        }
      } else {
        console.error('Payment record not found for CheckoutRequestID:', CheckoutRequestID)
        return { success: false, data: { error: 'Payment record not found' } }
      }
    } else {
      // Failed payment
      console.error('M-Pesa payment failed:', ResultDesc)
      
      const payment = await prisma.payment.findFirst({
        where: { mpesaCheckoutRequestId: CheckoutRequestID }
      })

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            mpesaTimestamp: generateMpesaTimestamp()
          }
        })
      }

      return { success: false, data: { error: ResultDesc } }
    }
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    return { success: false, data: { error: 'Callback processing failed' } }
  }
}

// Format phone number for M-Pesa
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // Handle Kenyan phone numbers
  if (digits.startsWith('254')) {
    return digits
  } else if (digits.startsWith('0')) {
    return '254' + digits.substring(1)
  } else if (digits.length === 9) {
    return '254' + digits
  } else {
    throw new Error('Invalid phone number format')
  }
}

// Validate M-Pesa phone number
export function isValidMpesaPhone(phone: string): boolean {
  try {
    const formatted = formatPhoneNumber(phone)
    return formatted.startsWith('254') && formatted.length === 12
  } catch {
    return false
  }
}