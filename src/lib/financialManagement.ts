// Enhanced Financial Management System for Murimi POS
import { prisma } from './prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

export interface FinancialMetrics {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: number
  netProfit: number
  netMargin: number
  cashFlow: number
  roi: number
  breakEvenAnalysis: {
    units: number
    revenue: number
  }
}

export interface ProfitLossReport {
  period: string
  revenue: {
    productSales: number
    serviceRevenue: number
    otherIncome: number
    total: number
  }
  costOfGoods: {
    directMaterials: number
    directLabor: number
    manufacturingOverhead: number
    total: number
  }
  operatingExpenses: {
    salaries: number
    rent: number
    utilities: number
    marketing: number
    insurance: number
    depreciation: number
    otherExpenses: number
    total: number
  }
  summary: {
    grossProfit: number
    operatingIncome: number
    netIncome: number
    grossMargin: number
    operatingMargin: number
    netMargin: number
  }
}

export interface CostAnalysis {
  productId: string
  productName: string
  costPrice: number
  sellingPrice: number
  grossMargin: number
  grossMarginPercentage: number
  totalCost: number
  totalRevenue: number
  totalProfit: number
  profitMargin: number
  breakEvenQuantity: number
  roi: number
}

export interface CashFlowAnalysis {
  operatingCashFlow: number
  investingCashFlow: number
  financingCashFlow: number
  netCashFlow: number
  cashFlowForecast: Array<{
    period: string
    inflow: number
    outflow: number
    netCashFlow: number
    runningBalance: number
  }>
}

export class FinancialManagementService {
  // Comprehensive Financial Dashboard
  static async getFinancialMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<FinancialMetrics> {
    const whereCondition: any = {
      createdAt: { gte: startDate, lte: endDate },
      status: 'COMPLETED'
    }

    if (userId) {
      whereCondition.userId = userId
    }

    // Get sales data with product costs
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
        }
      }
    })

    // Calculate basic metrics
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const totalCost = sales.reduce((sum, sale) => {
      return sum + sale.saleItems.reduce((itemSum, item) => 
        itemSum + (Number(item.product.costPrice) * item.quantity), 0
      )
    }, 0)

    const grossProfit = totalRevenue - totalCost
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    // Operating expenses (simplified - would include real expense tracking)
    const operatingExpenses = totalRevenue * 0.25 // 25% of revenue as operating expenses
    const netProfit = grossProfit - operatingExpenses
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Cash flow calculation
    const cashFlow = netProfit // Simplified - would include all cash movements

    // ROI calculation
    const initialInvestment = 1000000 // KSh - would be configurable
    const roi = initialInvestment > 0 ? (netProfit / initialInvestment) * 100 : 0

    // Break-even analysis
    const averageSellingPrice = sales.length > 0 
      ? totalRevenue / sales.reduce((sum, sale) => sum + sale.saleItems.length, 0)
      : 0
    const averageCost = sales.length > 0
      ? totalCost / sales.reduce((sum, sale) => sum + sale.saleItems.length, 0)
      : 0
    const contributionMargin = averageSellingPrice - averageCost
    const breakEvenUnits = contributionMargin > 0 ? Math.ceil(operatingExpenses / contributionMargin) : 0
    const breakEvenRevenue = breakEvenUnits * averageSellingPrice

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      operatingExpenses,
      netProfit,
      netMargin,
      cashFlow,
      roi,
      breakEvenAnalysis: {
        units: breakEvenUnits,
        revenue: breakEvenRevenue
      }
    }
  }

  // Comprehensive Profit & Loss Report
  static async generateProfitLossReport(
    startDate: Date,
    endDate: Date
  ): Promise<ProfitLossReport> {
    const whereCondition = {
      createdAt: { gte: startDate, lte: endDate },
      status: 'COMPLETED'
    }

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
        }
      }
    })

    // Revenue breakdown
    const productSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const serviceRevenue = 0 // Would be calculated from service sales
    const otherIncome = 0 // Interest, dividends, etc.
    const revenueTotal = productSales + serviceRevenue + otherIncome

    // Cost of Goods Sold
    const directMaterials = sales.reduce((sum, sale) => {
      return sum + sale.saleItems.reduce((itemSum, item) => 
        itemSum + (Number(item.product.costPrice) * item.quantity), 0
      )
    }, 0)
    const directLabor = revenueTotal * 0.1 // 10% of revenue
    const manufacturingOverhead = directMaterials * 0.05 // 5% of materials
    const costOfGoodsTotal = directMaterials + directLabor + manufacturingOverhead

    // Operating Expenses
    const salaries = revenueTotal * 0.15 // 15% of revenue
    const rent = 50000 // Fixed monthly rent
    const utilities = revenueTotal * 0.03 // 3% of revenue
    const marketing = revenueTotal * 0.05 // 5% of revenue
    const insurance = revenueTotal * 0.01 // 1% of revenue
    const depreciation = 20000 // Fixed depreciation
    const otherExpenses = revenueTotal * 0.03 // 3% of revenue
    const operatingExpensesTotal = salaries + rent + utilities + marketing + insurance + depreciation + otherExpenses

    // Summary calculations
    const grossProfit = revenueTotal - costOfGoodsTotal
    const operatingIncome = grossProfit - operatingExpensesTotal
    const netIncome = operatingIncome // Simplified - would include taxes and interest

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      revenue: {
        productSales,
        serviceRevenue,
        otherIncome,
        total: revenueTotal
      },
      costOfGoods: {
        directMaterials,
        directLabor,
        manufacturingOverhead,
        total: costOfGoodsTotal
      },
      operatingExpenses: {
        salaries,
        rent,
        utilities,
        marketing,
        insurance,
        depreciation,
        otherExpenses,
        total: operatingExpensesTotal
      },
      summary: {
        grossProfit,
        operatingIncome,
        netIncome,
        grossMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
        operatingMargin: revenueTotal > 0 ? (operatingIncome / revenueTotal) * 100 : 0,
        netMargin: revenueTotal > 0 ? (netIncome / revenueTotal) * 100 : 0
      }
    }
  }

  // Product-wise Cost and Margin Analysis
  static async getProductCostAnalysis(): Promise<CostAnalysis[]> {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        saleItems: {
          where: {
            sale: {
              status: 'COMPLETED',
              createdAt: {
                gte: subDays(new Date(), 365) // Last year
              }
            }
          }
        }
      }
    })

    return products.map(product => {
      const costPrice = Number(product.costPrice)
      const sellingPrice = Number(product.retailPrice)
      const grossMargin = sellingPrice - costPrice
      const grossMarginPercentage = sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : 0

      const totalUnitsSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0)
      const totalCost = costPrice * totalUnitsSold
      const totalRevenue = sellingPrice * totalUnitsSold
      const totalProfit = grossMargin * totalUnitsSold
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

      // Break-even quantity calculation
      const fixedCosts = 50000 // Monthly fixed costs
      const contributionMargin = grossMargin
      const breakEvenQuantity = contributionMargin > 0 ? Math.ceil(fixedCosts / contributionMargin) : 0

      // ROI calculation
      const totalInvestment = totalCost + fixedCosts
      const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0

      return {
        productId: product.id,
        productName: product.name,
        costPrice,
        sellingPrice,
        grossMargin,
        grossMarginPercentage,
        totalCost,
        totalRevenue,
        totalProfit,
        profitMargin,
        breakEvenQuantity,
        roi
      }
    }).sort((a, b) => b.profitMargin - a.profitMargin)
  }

  // Cash Flow Analysis
  static async getCashFlowAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<CashFlowAnalysis> {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      },
      include: {
        payments: true
      }
    })

    // Operating Cash Flow (from business operations)
    const operatingCashFlow = sales.reduce((sum, sale) => {
      const payment = sale.payments.find(p => p.status === 'COMPLETED')
      return sum + (payment ? Number(payment.amount) : 0)
    }, 0)

    // Investing Cash Flow (equipment, inventory investment)
    const inventoryInvestment = await prisma.stockEntry.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalCost: true }
    })
    const investingCashFlow = -Number(inventoryInvestment._sum.totalCost || 0)

    // Financing Cash Flow (loans, investments)
    const financingCashFlow = 0 // Would include loan payments, investor contributions

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

    // Cash Flow Forecast (next 6 months)
    const currentBalance = 100000 // Current cash balance
    const cashFlowForecast = []
    let runningBalance = currentBalance

    for (let i = 1; i <= 6; i++) {
      const monthStart = startOfMonth(new Date(new Date().setMonth(new Date().getMonth() + i)))
      const monthEnd = endOfMonth(monthStart)
      
      const monthSales = await this.getFinancialMetrics(monthStart, monthEnd)
      const monthInflow = monthSales.totalRevenue
      const monthOutflow = monthSales.totalCost + monthSales.operatingExpenses
      const monthNetCashFlow = monthInflow - monthOutflow
      
      runningBalance += monthNetCashFlow

      cashFlowForecast.push({
        period: monthStart.toISOString().slice(0, 7),
        inflow: monthInflow,
        outflow: monthOutflow,
        netCashFlow: monthNetCashFlow,
        runningBalance
      })
    }

    return {
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      netCashFlow,
      cashFlowForecast
    }
  }

  // Expense Tracking and Management
  static async trackExpenses(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalExpenses: number
    expenseBreakdown: {
      category: string
      amount: number
      percentage: number
    }[]
    monthlyExpenses: Array<{
      month: string
      amount: number
    }>
  }> {
    // Simulated expense data - in real implementation, would have expense tracking
    const expenses = [
      { category: 'Salaries', amount: 150000 },
      { category: 'Rent', amount: 50000 },
      { category: 'Utilities', amount: 15000 },
      { category: 'Marketing', amount: 25000 },
      { category: 'Insurance', amount: 8000 },
      { category: 'Maintenance', amount: 12000 },
      { category: 'Other', amount: 20000 }
    ]

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    const expenseBreakdown = expenses.map(exp => ({
      ...exp,
      percentage: totalExpenses > 0 ? (exp.amount / totalExpenses) * 100 : 0
    }))

    // Monthly expenses for the last 6 months
    const monthlyExpenses = []
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i)
      const monthExpenses = totalExpenses / 6 // Simplified
      monthlyExpenses.push({
        month: month.toISOString().slice(0, 7),
        amount: monthExpenses
      })
    }

    return {
      totalExpenses,
      expenseBreakdown,
      monthlyExpenses
    }
  }

  // Financial Alerts and Warnings
  static async getFinancialAlerts(): Promise<{
    alerts: Array<{
      type: 'warning' | 'critical' | 'info'
      message: string
      value: number
      threshold: number
    }>
  }> {
    const alerts = []
    const today = new Date()
    const lastMonth = subMonths(today, 1)

    // Profit margin alert
    const lastMonthMetrics = await this.getFinancialMetrics(lastMonth, today)
    if (lastMonthMetrics.grossMargin < 20) {
      alerts.push({
        type: 'warning',
        message: 'Gross profit margin is below 20%',
        value: lastMonthMetrics.grossMargin,
        threshold: 20
      })
    }

    // Cash flow alert
    if (lastMonthMetrics.cashFlow < 0) {
      alerts.push({
        type: 'critical',
        message: 'Negative cash flow detected',
        value: lastMonthMetrics.cashFlow,
        threshold: 0
      })
    }

    // ROI alert
    if (lastMonthMetrics.roi < 5) {
      alerts.push({
        type: 'warning',
        message: 'Return on investment is below 5%',
        value: lastMonthMetrics.roi,
        threshold: 5
      })
    }

    return { alerts }
  }
}