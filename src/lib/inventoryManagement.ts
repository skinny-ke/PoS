import { prisma } from './prisma'

export interface LowStockAlert {
  id: string
  name: string
  currentStock: number
  minStockLevel: number
  urgency: 'high' | 'medium' | 'low'
  daysUntilStockout: number
  recommendedAction: string
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  previousStock: number
  newStock: number
  reason: string
  userId: string
  userName: string
  createdAt: Date
}

export interface InventoryReport {
  totalProducts: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  categoryBreakdown: Array<{
    categoryName: string
    productCount: number
    totalValue: number
    lowStockCount: number
  }>
  recentMovements: StockMovement[]
}

export class InventoryManagementService {
  // Get low stock alerts
  static async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lte: 10 } // Consider low stock if <= 10
      },
      include: {
        category: true
      },
      orderBy: [
        { stockQuantity: 'asc' },
        { name: 'asc' }
      ]
    })

    return products.map(product => {
      const stockRatio = product.stockQuantity / product.minStockLevel
      let urgency: 'high' | 'medium' | 'low' = 'low'
      
      if (stockRatio <= 0.5) urgency = 'high'
      else if (stockRatio <= 1) urgency = 'medium'
      
      // Estimate days until stockout based on recent sales velocity
      // This would need to be calculated from actual sales data
      const estimatedDailySales = 5 // Placeholder
      const daysUntilStockout = Math.max(0, Math.floor(product.stockQuantity / estimatedDailySales))
      
      let recommendedAction = ''
      if (product.stockQuantity === 0) {
        recommendedAction = 'Out of stock - Immediate restock required'
      } else if (urgency === 'high') {
        recommendedAction = 'Critical - Restock within 24 hours'
      } else if (urgency === 'medium') {
        recommendedAction = 'Moderate - Restock within 3-5 days'
      } else {
        recommendedAction = 'Monitor - Consider restocking soon'
      }

      return {
        id: product.id,
        name: product.name,
        currentStock: product.stockQuantity,
        minStockLevel: product.minStockLevel,
        urgency,
        daysUntilStockout,
        recommendedAction
      }
    })
  }

  // Get inventory report
  static async getInventoryReport(): Promise<InventoryReport> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true
      }
    })

    const totalProducts = products.length
    const totalValue = products.reduce((sum, product) => 
      sum + (Number(product.retailPrice) * product.stockQuantity), 0
    )
    const lowStockCount = products.filter(p => 
      p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0
    ).length
    const outOfStockCount = products.filter(p => p.stockQuantity === 0).length

    // Category breakdown
    const categoryMap = new Map<string, {
      name: string
      count: number
      value: number
      lowStock: number
    }>()

    products.forEach(product => {
      const existing = categoryMap.get(product.categoryId) || {
        name: product.category.name,
        count: 0,
        value: 0,
        lowStock: 0
      }
      
      existing.count++
      existing.value += Number(product.retailPrice) * product.stockQuantity
      if (product.stockQuantity <= product.minStockLevel) {
        existing.lowStock++
      }
      
      categoryMap.set(product.categoryId, existing)
    })

    const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
      categoryName: cat.name,
      productCount: cat.count,
      totalValue: cat.value,
      lowStockCount: cat.lowStock
    }))

    // Recent stock movements
    const recentMovements = await this.getRecentStockMovements()

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
      recentMovements
    }
  }

  // Get recent stock movements
  static async getRecentStockMovements(limit = 20): Promise<StockMovement[]> {
    const stockEntries = await prisma.stockEntry.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: true,
        supplier: true
      }
    })

    return stockEntries.map(entry => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.product.name,
      type: 'in' as const,
      quantity: entry.quantity,
      previousStock: 0, // Would need previous state calculation
      newStock: entry.product.stockQuantity,
      reason: entry.notes || 'Stock adjustment',
      userId: entry.userId,
      userName: `${entry.user.firstName} ${entry.user.lastName}`,
      createdAt: entry.createdAt
    }))
  }

  // Add stock to product
  static async addStock(
    productId: string,
    quantity: number,
    costPrice: number,
    userId: string,
    supplierId?: string,
    notes?: string
  ): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    // Create stock entry
    await prisma.stockEntry.create({
      data: {
        productId,
        quantity,
        costPrice,
        totalCost: quantity * costPrice,
        supplierId,
        userId,
        notes
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        productId,
        action: 'stock_adjustment',
        entityType: 'Product',
        entityId: productId,
        newValues: JSON.stringify({
          previousStock: product.stockQuantity,
          newStock: product.stockQuantity + quantity,
          quantityAdded: quantity
        })
      }
    })
  }

  // Adjust stock (for corrections)
  static async adjustStock(
    productId: string,
    newStockQuantity: number,
    userId: string,
    reason: string
  ): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const difference = newStockQuantity - product.stockQuantity

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: newStockQuantity
      }
    })

    // Create stock entry for audit
    await prisma.stockEntry.create({
      data: {
        productId,
        quantity: Math.abs(difference),
        costPrice: Number(product.costPrice),
        totalCost: Math.abs(difference) * Number(product.costPrice),
        userId,
        referenceNumber: 'STOCK_ADJUSTMENT',
        notes: `Stock adjustment: ${reason}. Changed from ${product.stockQuantity} to ${newStockQuantity}`
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        productId,
        action: 'stock_adjustment',
        entityType: 'Product',
        entityId: productId,
        oldValues: JSON.stringify({ previousStock: product.stockQuantity }),
        newValues: JSON.stringify({ 
          newStock: newStockQuantity, 
          adjustment: difference,
          reason 
        })
      }
    })
  }

  // Get product stock history
  static async getStockHistory(
    productId: string,
    limit = 50
  ): Promise<StockMovement[]> {
    const stockEntries = await prisma.stockEntry.findMany({
      where: { productId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: true,
        supplier: true
      }
    })

    return stockEntries.map(entry => ({
      id: entry.id,
      productId: entry.productId,
      productName: entry.product.name,
      type: 'in' as const,
      quantity: entry.quantity,
      previousStock: 0, // Would need complex calculation
      newStock: entry.product.stockQuantity,
      reason: entry.notes || 'Stock entry',
      userId: entry.userId,
      userName: `${entry.user.firstName} ${entry.user.lastName}`,
      createdAt: entry.createdAt
    }))
  }

  // Bulk stock update
  static async bulkStockUpdate(
    updates: Array<{
      productId: string
      newStockQuantity: number
      reason: string
    }>,
    userId: string
  ): Promise<void> {
    for (const update of updates) {
      await this.adjustStock(
        update.productId,
        update.newStockQuantity,
        userId,
        update.reason
      )
    }
  }
}