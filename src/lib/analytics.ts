// Business Intelligence and Analytics for Murimi POS
import { prisma } from './prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

export interface SalesAnalytics {
  totalSales: number
  totalTransactions: number
  averageTransactionValue: number
  salesGrowth: number
  paymentMethodBreakdown: {
    cash: { count: number; amount: number }
    mpesa: { count: number; amount: number }
    card: { count: number; amount: number }
  }
  hourlySales: Array<{ hour: number; amount: number; count: number }>
  dailySales: Array<{ date: string; amount: number; count: number }>
  topProducts: Array<{
    id: string
    name: string
    quantitySold: number
    revenue: number
    profitMargin: number
  }>
}

export interface InventoryAnalytics {
  totalProducts: number
  totalValue: number
  lowStockProducts: number
  outOfStockProducts: number
  categoryBreakdown: Array<{
    categoryName: string
    productCount: number
    totalValue: number
    lowStockCount: number
  }>
  fastMovingProducts: Array<{
    id: string
    name: string
    quantitySold: number
    velocity: number
  }>
  slowMovingProducts: Array<{
    id: string
    name: string
    quantitySold: number
    lastSaleDate: string
  }>
}

export interface CustomerAnalytics {
  totalCustomers: number
  returningCustomers: number
  averageCustomerValue: number
  customerLifetimeValue: number
  topCustomers: Array<{
    id: string
    name: string
    totalSpent: number
    visitCount: number
    lastVisit: string
  }>
  customerSegmentation: {
    vip: { count: number; totalSpent: number }
    regular: { count: number; totalSpent: number }
    occasional: { count: number; totalSpent: number }
  }
}

export interface FinancialAnalytics {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  netProfit: number
  taxCollected: number
  profitByProduct: Array<{
    id: string
    name: string
    revenue: number
    cost: number
    profit: number
    margin: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    cost: number
    profit: number
  }>
}

export class AnalyticsService {
  // Sales Analytics
  static async getSalesAnalytics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<SalesAnalytics> {
    const whereCondition: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'COMPLETED'
    }

    if (userId) {
      whereCondition.userId = userId
    }

    // Get basic sales data
    const sales = await prisma.sale.findMany({
      where: whereCondition,
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                costPrice: true,
                retailPrice: true
              }
            }
          }
        },
        payments: true
      }
    })

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const totalTransactions = sales.length
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

    // Payment method breakdown
    const paymentBreakdown = {
      cash: { count: 0, amount: 0 },
      mpesa: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 }
    }

    sales.forEach(sale => {
      const method = sale.paymentMethod
      if (method in paymentBreakdown) {
        paymentBreakdown[method as keyof typeof paymentBreakdown].count++
        paymentBreakdown[method as keyof typeof paymentBreakdown].amount += Number(sale.totalAmount)
      }
    })

    // Hourly sales distribution
    const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      amount: 0,
      count: 0
    }))

    sales.forEach(sale => {
      const hour = new Date(sale.createdAt).getHours()
      hourlySales[hour].amount += Number(sale.totalAmount)
      hourlySales[hour].count += 1
    })

    // Daily sales for the period
    const dailySales: Array<{ date: string; amount: number; count: number }> = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dayStart = startOfDay(current)
      const dayEnd = endOfDay(current)
      const daySales = sales.filter(sale => 
        sale.createdAt >= dayStart && sale.createdAt <= dayEnd
      )
      
      dailySales.push({
        date: current.toISOString().split('T')[0],
        amount: daySales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
        count: daySales.length
      })
      
      current.setDate(current.getDate() + 1)
    }

    // Top products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number; cost: number }>()
    
    sales.forEach(sale => {
      sale.saleItems.forEach(item => {
        const productId = item.productId
        const existing = productSales.get(productId) || {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
          cost: 0
        }
        
        existing.quantity += item.quantity
        existing.revenue += Number(item.totalPrice)
        existing.cost += Number(item.product.costPrice) * item.quantity
        
        productSales.set(productId, existing)
      })
    })

    const topProducts = Array.from(productSales.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue,
        profitMargin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Sales growth calculation (compared to previous period)
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const previousStart = subDays(startDate, periodDays)
    const previousEnd = subDays(endDate, periodDays)
    
    const previousSales = await prisma.sale.aggregate({
      where: {
        ...whereCondition,
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      },
      _sum: { totalAmount: true }
    })

    const previousTotal = Number(previousSales._sum.totalAmount || 0)
    const salesGrowth = previousTotal > 0 
      ? ((totalSales - previousTotal) / previousTotal) * 100 
      : 0

    return {
      totalSales,
      totalTransactions,
      averageTransactionValue,
      salesGrowth,
      paymentMethodBreakdown: paymentBreakdown,
      hourlySales,
      dailySales,
      topProducts
    }
  }

  // Inventory Analytics
  static async getInventoryAnalytics(): Promise<InventoryAnalytics> {
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
    
    const lowStockProducts = products.filter(p => 
      p.stockQuantity <= p.minStockLevel && p.stockQuantity > 0
    ).length
    
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length

    // Category breakdown
    const categoryMap = new Map<string, {
      name: string
      count: number
      value: number
      lowStock: number
    }>()

    products.forEach(product => {
      const categoryId = product.categoryId
      const existing = categoryMap.get(categoryId) || {
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
      
      categoryMap.set(categoryId, existing)
    })

    const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
      categoryName: cat.name,
      productCount: cat.count,
      totalValue: cat.value,
      lowStockCount: cat.lowStock
    }))

    // Fast moving products (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30)
    const recentSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED'
        }
      },
      _sum: { quantity: true }
    })

    const fastMoving = recentSales
      .filter(item => Number(item._sum.quantity) > 0)
      .map(item => {
        const product = products.find(p => p.id === item.productId)
        return {
          id: item.productId,
          name: product?.name || 'Unknown',
          quantitySold: Number(item._sum.quantity) || 0,
          velocity: Number(item._sum.quantity) || 0
        }
      })
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 10)

    // Slow moving products (no sales in last 60 days)
    const sixtyDaysAgo = subDays(new Date(), 60)
    const productSalesMap = new Map<string, Date>()
    
    const salesWithDates = await prisma.sale.findMany({
      where: {
        createdAt: { gte: sixtyDaysAgo },
        status: 'COMPLETED'
      },
      include: {
        saleItems: {
          select: { productId: true }
        }
      }
    })

    salesWithDates.forEach(sale => {
      sale.saleItems.forEach(item => {
        const existing = productSalesMap.get(item.productId)
        if (!existing || sale.createdAt > existing) {
          productSalesMap.set(item.productId, sale.createdAt)
        }
      })
    })

    const slowMoving = products
      .filter(product => {
        const lastSale = productSalesMap.get(product.id)
        return !lastSale || (new Date() - lastSale) > (60 * 24 * 60 * 60 * 1000) // 60 days
      })
      .map(product => ({
        id: product.id,
        name: product.name,
        quantitySold: 0,
        lastSaleDate: productSalesMap.get(product.id)?.toISOString() || 'Never'
      }))
      .slice(0, 10)

    return {
      totalProducts,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      categoryBreakdown,
      fastMovingProducts: fastMoving,
      slowMovingProducts: slowMoving
    }
  }

  // Customer Analytics
  static async getCustomerAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<CustomerAnalytics> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
        customerName: { not: null }
      },
      include: {
        user: true
      }
    })

    const customerMap = new Map<string, {
      name: string
      totalSpent: number
      visitCount: number
      lastVisit: Date
    }>()

    sales.forEach(sale => {
      if (sale.customerName) {
        const existing = customerMap.get(sale.customerName) || {
          name: sale.customerName,
          totalSpent: 0,
          visitCount: 0,
          lastVisit: sale.createdAt
        }
        
        existing.totalSpent += Number(sale.totalAmount)
        existing.visitCount++
        if (sale.createdAt > existing.lastVisit) {
          existing.lastVisit = sale.createdAt
        }
        
        customerMap.set(sale.customerName, existing)
      }
    })

    const customers = Array.from(customerMap.values())
    const totalCustomers = customers.length
    const returningCustomers = customers.filter(c => c.visitCount > 1).length
    const averageCustomerValue = totalCustomers > 0 
      ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers 
      : 0

    // Customer segmentation
    const vip = customers.filter(c => c.totalSpent >= 50000)
    const regular = customers.filter(c => c.totalSpent >= 10000 && c.totalSpent < 50000)
    const occasional = customers.filter(c => c.totalSpent < 10000)

    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(customer => ({
        id: customer.name, // In real implementation, use actual customer ID
        name: customer.name,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        lastVisit: customer.lastVisit.toISOString()
      }))

    return {
      totalCustomers,
      returningCustomers,
      averageCustomerValue,
      customerLifetimeValue: averageCustomerValue * 12, // Estimated
      topCustomers,
      customerSegmentation: {
        vip: { count: vip.length, totalSpent: vip.reduce((sum, c) => sum + c.totalSpent, 0) },
        regular: { count: regular.length, totalSpent: regular.reduce((sum, c) => sum + c.totalSpent, 0) },
        occasional: { count: occasional.length, totalSpent: occasional.reduce((sum, c) => sum + c.totalSpent, 0) }
      }
    }
  }

  // Financial Analytics
  static async getFinancialAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<FinancialAnalytics> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                costPrice: true,
                retailPrice: true
              }
            }
          }
        }
      }
    })

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    let totalCost = 0
    let totalTax = 0

    sales.forEach(sale => {
      sale.saleItems.forEach(item => {
        totalCost += Number(item.product.costPrice) * item.quantity
        totalTax += Number(item.taxAmount)
      })
    })

    const grossProfit = totalRevenue - totalCost
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const netProfit = grossProfit // Simplified - add expenses in real implementation

    // Profit by product
    const productProfit = new Map<string, { name: string; revenue: number; cost: number; profit: number }>()
    
    sales.forEach(sale => {
      sale.saleItems.forEach(item => {
        const productId = item.productId
        const existing = productProfit.get(productId) || {
          name: item.product.name,
          revenue: 0,
          cost: 0,
          profit: 0
        }
        
        const itemRevenue = Number(item.totalPrice)
        const itemCost = Number(item.product.costPrice) * item.quantity
        
        existing.revenue += itemRevenue
        existing.cost += itemCost
        existing.profit += itemRevenue - itemCost
        
        productProfit.set(productId, existing)
      })
    })

    const profitByProduct = Array.from(productProfit.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20)

    // Monthly trend for last 12 months
    const monthlyTrend: Array<{ month: string; revenue: number; cost: number; profit: number }> = []
    const current = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(current, i))
      const monthEnd = endOfMonth(subMonths(current, i))
      
      const monthSales = await prisma.sale.findMany({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'COMPLETED'
        },
        include: {
          saleItems: {
            include: {
              product: {
                select: { costPrice: true }
              }
            }
          }
        }
      })
      
      const monthRevenue = monthSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
      const monthCost = monthSales.reduce((sum, sale) => 
        sum + sale.saleItems.reduce((itemSum, item) => 
          itemSum + (Number(item.product.costPrice) * item.quantity), 0
        ), 0
      )
      
      monthlyTrend.push({
        month: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        revenue: monthRevenue,
        cost: monthCost,
        profit: monthRevenue - monthCost
      })
    }

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      netProfit,
      taxCollected: totalTax,
      profitByProduct,
      monthlyTrend
    }
  }

  // Dashboard Summary
  static async getDashboardSummary() {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    
    const thisWeekStart = startOfWeek(today)
    const thisWeekEnd = endOfWeek(today)
    
    const thisMonthStart = startOfMonth(today)
    const thisMonthEnd = endOfMonth(today)

    const [todaySales, weekSales, monthSales, lowStockCount, outOfStockCount] = await Promise.all([
      this.getSalesAnalytics(todayStart, todayEnd),
      this.getSalesAnalytics(thisWeekStart, thisWeekEnd),
      this.getSalesAnalytics(thisMonthStart, thisMonthEnd),
      prisma.product.count({
        where: {
          stockQuantity: { lte: 5 },
          isActive: true
        }
      }),
      prisma.product.count({
        where: {
          stockQuantity: 0,
          isActive: true
        }
      })
    ])

    return {
      today: {
        sales: todaySales.totalSales,
        transactions: todaySales.totalTransactions,
        avgTransaction: todaySales.averageTransactionValue
      },
      week: {
        sales: weekSales.totalSales,
        transactions: weekSales.totalTransactions,
        growth: weekSales.salesGrowth
      },
      month: {
        sales: monthSales.totalSales,
        transactions: monthSales.totalTransactions,
        growth: monthSales.salesGrowth
      },
      inventory: {
        lowStock: lowStockCount,
        outOfStock: outOfStockCount
      }
    }
  }
}