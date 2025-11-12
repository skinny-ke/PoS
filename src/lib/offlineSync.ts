import { prisma } from './prisma'

export interface SyncQueueItem {
  id: string
  type: 'sale' | 'stock_entry' | 'refund' | 'product_update'
  data: any
  retryCount: number
  maxRetries: number
  createdAt: Date
}

export interface SyncResult {
  success: boolean
  error?: string
  syncedItems?: number
}

export class OfflineSyncService {
  // Add item to sync queue
  static async addToSyncQueue(
    type: SyncQueueItem['type'],
    data: any,
    maxRetries = 3
  ): Promise<string> {
    const queueItem = await prisma.offlineSyncQueue.create({
      data: {
        type,
        data: JSON.stringify(data),
        retryCount: 0,
        maxRetries,
        status: 'pending'
      }
    })

    return queueItem.id
  }

  // Process sync queue
  static async processSyncQueue(): Promise<SyncResult> {
    try {
      // Get pending items
      const pendingItems = await prisma.offlineSyncQueue.findMany({
        where: {
          status: 'pending',
          retryCount: { lt: 3 }
        },
        orderBy: { createdAt: 'asc' }
      })

      let syncedCount = 0
      const errors: string[] = []

      for (const item of pendingItems) {
        try {
          // Mark as processing
          await prisma.offlineSyncQueue.update({
            where: { id: item.id },
            data: { status: 'processing' }
          })

          const data = JSON.parse(item.data)
          
          // Process based on type
          switch (item.type) {
            case 'sale':
              await this.syncSale(data)
              break
            case 'stock_entry':
              await this.syncStockEntry(data)
              break
            case 'refund':
              await this.syncRefund(data)
              break
            case 'product_update':
              await this.syncProductUpdate(data)
              break
          }

          // Mark as completed
          await prisma.offlineSyncQueue.update({
            where: { id: item.id },
            data: { status: 'completed' }
          })

          syncedCount++

        } catch (error) {
          console.error(`Error processing sync item ${item.id}:`, error)
          
          // Increment retry count and mark as failed if max retries reached
          const newRetryCount = item.retryCount + 1
          const newStatus = newRetryCount >= item.maxRetries ? 'failed' : 'pending'
          
          await prisma.offlineSyncQueue.update({
            where: { id: item.id },
            data: {
              retryCount: newRetryCount,
              status: newStatus,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          })

          if (newRetryCount >= item.maxRetries) {
            errors.push(`Failed to sync ${item.type}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }

      return {
        success: errors.length === 0,
        syncedItems: syncedCount,
        error: errors.length > 0 ? errors.join('; ') : undefined
      }

    } catch (error) {
      console.error('Error processing sync queue:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Sync offline sale
  private static async syncSale(saleData: any): Promise<void> {
    const { items, totalAmount, customerName, customerPhone, paymentMethod, offlineId } = saleData

    if (!items || items.length === 0) {
      throw new Error('Invalid sale data: missing items')
    }

    // Check if sale already exists (prevent duplicates)
    const existingSale = await prisma.sale.findFirst({
      where: { offlineId }
    })

    if (existingSale) {
      console.log('Sale already synced, skipping:', offlineId)
      return
    }

    // Validate products and calculate totals
    let calculatedTotal = 0
    const validatedItems = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`)
      }

      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }

      validatedItems.push({
        ...item,
        product
      })

      calculatedTotal += item.totalPrice
    }

    // Create the sale
    await prisma.sale.create({
      data: {
        saleNumber: `OFFLINE-${Date.now()}`,
        userId: await this.getSystemUserId(),
        totalAmount: calculatedTotal,
        subtotalAmount: calculatedTotal,
        discountAmount: 0,
        taxAmount: 0,
        paidAmount: totalAmount,
        changeAmount: 0,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: 'COMPLETED',
        status: 'COMPLETED',
        customerName,
        customerPhone,
        offlineId,
        saleItems: {
          create: validatedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discountAmount: 0,
            taxAmount: 0
          }))
        }
      }
    })

    // Update stock quantities
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
  }

  // Sync offline stock entry
  private static async syncStockEntry(stockData: any): Promise<void> {
    const { productId, quantity, costPrice, notes } = stockData

    // Create stock entry
    await prisma.stockEntry.create({
      data: {
        productId,
        quantity,
        costPrice,
        totalCost: quantity * costPrice,
        userId: await this.getSystemUserId(),
        referenceNumber: 'OFFLINE_SYNC',
        notes: notes || 'Offline sync stock entry'
      }
    })

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: quantity
        }
      }
    })
  }

  // Sync offline refund
  private static async syncRefund(refundData: any): Promise<void> {
    const { saleId, totalRefundAmount, reason } = refundData

    await prisma.refund.create({
      data: {
        saleId,
        userId: await this.getSystemUserId(),
        totalRefundAmount,
        reason,
        status: 'COMPLETED'
      }
    })

    // Update sale status
    await prisma.sale.update({
      where: { id: saleId },
      data: { status: 'REFUNDED' }
    })
  }

  // Sync offline product update
  private static async syncProductUpdate(productData: any): Promise<void> {
    const { productId, updates } = productData

    await prisma.product.update({
      where: { id: productId },
      data: updates
    })
  }

  // Get or create system user for offline operations
  private static async getSystemUserId(): Promise<string> {
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@murimipos.com' }
    })

    if (!systemUser) {
      systemUser = await prisma.user.create({
        data: {
          clerkId: 'system-offline',
          email: 'system@murimipos.com',
          firstName: 'System',
          lastName: 'Offline',
          role: 'ADMIN',
          isActive: true
        }
      })
    }

    return systemUser.id
  }

  // Clean up old sync items
  static async cleanupSyncQueue(retentionDays = 7): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    await prisma.offlineSyncQueue.deleteMany({
      where: {
        OR: [
          { status: 'completed' },
          { AND: [
            { status: 'failed' },
            { createdAt: { lt: cutoffDate } }
          ]}
        ]
      }
    })
  }

  // Get sync queue status
  static async getSyncQueueStatus(): Promise<{
    pending: number
    processing: number
    failed: number
    completed: number
  }> {
    const [pending, processing, failed, completed] = await Promise.all([
      prisma.offlineSyncQueue.count({ where: { status: 'pending' } }),
      prisma.offlineSyncQueue.count({ where: { status: 'processing' } }),
      prisma.offlineSyncQueue.count({ where: { status: 'failed' } }),
      prisma.offlineSyncQueue.count({ where: { status: 'completed' } })
    ])

    return { pending, processing, failed, completed }
  }

  // Check if system is online
  static async isOnline(): Promise<boolean> {
    try {
      // Simple connectivity check
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache' 
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}