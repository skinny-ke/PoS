// Enhanced User Management System for Murimi POS
import { prisma } from './prisma'
import { UserRole } from '@/types'
import { currentUser } from '@clerk/nextjs/server'
import { z } from 'zod'

export interface UserProfile {
  id: string
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  fullName: string
  role: UserRole
  isActive: boolean
  phoneNumber?: string
  department?: string
  position?: string
  hireDate: Date
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  permissions: Permission[]
  performance: UserPerformance
}

export interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description: string
}

export interface UserPerformance {
  totalSales: number
  totalTransactions: number
  averageTransactionValue: number
  performanceScore: number
  rank: number
  periodStart: Date
  periodEnd: Date
}

export interface UserSchedule {
  id: string
  userId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  createdAt: Date
}

export interface UserActivity {
  id: string
  userId: string
  action: string
  details: any
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface PayrollRecord {
  id: string
  userId: string
  period: string
  baseSalary: number
  commission: number
  bonuses: number
  deductions: number
  netPay: number
  hoursWorked: number
  overtimeHours: number
  status: 'draft' | 'pending' | 'paid'
  paidAt?: Date
  createdAt: Date
}

export class UserManagementService {
  // Define all available permissions
  static getAllPermissions(): Permission[] {
    return [
      // Sales permissions
      { id: '1', name: 'Create Sale', resource: 'sales', action: 'create', description: 'Can create new sales' },
      { id: '2', name: 'View Sales', resource: 'sales', action: 'read', description: 'Can view sales records' },
      { id: '3', name: 'Edit Sale', resource: 'sales', action: 'update', description: 'Can edit sales' },
      { id: '4', name: 'Delete Sale', resource: 'sales', action: 'delete', description: 'Can delete sales' },
      
      // Product permissions
      { id: '5', name: 'Create Product', resource: 'products', action: 'create', description: 'Can create new products' },
      { id: '6', name: 'View Products', resource: 'products', action: 'read', description: 'Can view products' },
      { id: '7', name: 'Edit Product', resource: 'products', action: 'update', description: 'Can edit products' },
      { id: '8', name: 'Delete Product', resource: 'products', action: 'delete', description: 'Can delete products' },
      
      // User management permissions
      { id: '9', name: 'Create User', resource: 'users', action: 'create', description: 'Can create new users' },
      { id: '10', name: 'View Users', resource: 'users', action: 'read', description: 'Can view user list' },
      { id: '11', name: 'Edit User', resource: 'users', action: 'update', description: 'Can edit user details' },
      { id: '12', name: 'Delete User', resource: 'users', action: 'delete', description: 'Can delete users' },
      { id: '13', name: 'Manage Roles', resource: 'roles', action: 'manage', description: 'Can manage user roles' },
      
      // Financial permissions
      { id: '14', name: 'View Reports', resource: 'reports', action: 'read', description: 'Can view financial reports' },
      { id: '15', name: 'Manage Expenses', resource: 'expenses', action: 'manage', description: 'Can manage expenses' },
      { id: '16', name: 'Process Refunds', resource: 'refunds', action: 'process', description: 'Can process refunds' },
      
      // System permissions
      { id: '17', name: 'View Analytics', resource: 'analytics', action: 'read', description: 'Can view business analytics' },
      { id: '18', name: 'System Settings', resource: 'settings', action: 'manage', description: 'Can manage system settings' },
      { id: '19', name: 'View Audit Logs', resource: 'audit', action: 'read', description: 'Can view audit logs' },
    ]
  }

  // Get default permissions by role
  static getDefaultPermissionsByRole(role: UserRole): string[] {
    switch (role) {
      case 'ADMIN':
        return this.getAllPermissions().map(p => p.id)
      case 'MANAGER':
        return [
          '1', '2', '3', // Sales
          '5', '6', '7', // Products
          '10', '11', '12', '13', '14', '15', '16', '17' // Most management and reporting
        ]
      case 'CASHIER':
        return [
          '1', '2', // Basic sales
          '6', // View products
          '14', '17' // Basic reporting
        ]
      default:
        return []
    }
  }

  // Create new user
  static async createUser(userData: {
    clerkId: string
    email: string
    firstName?: string
    lastName?: string
    role: UserRole
    phoneNumber?: string
    department?: string
    position?: string
    hireDate?: Date
  }): Promise<UserProfile> {
    const defaultPermissions = this.getDefaultPermissionsByRole(userData.role)
    
    const user = await prisma.user.create({
      data: {
        clerkId: userData.clerkId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true,
        phoneNumber: userData.phoneNumber,
        department: userData.department,
        position: userData.position,
        hireDate: userData.hireDate || new Date()
      }
    })

    // Log user creation
    await this.logUserActivity(user.id, 'USER_CREATED', { role: userData.role })

    return {
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      permissions: this.getAllPermissions().filter(p => defaultPermissions.includes(p.id)),
      performance: await this.getUserPerformance(user.id)
    }
  }

  // Get all users with comprehensive details
  static async getAllUsers(): Promise<UserProfile[]> {
    const users = await prisma.user.findMany({
      include: {
        sales: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          select: {
            id: true,
            totalAmount: true
          }
        }
      }
    })

    return Promise.all(users.map(async user => ({
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      permissions: this.getAllPermissions().filter(p => 
        this.getDefaultPermissionsByRole(user.role).includes(p.id)
      ),
      performance: await this.getUserPerformance(user.id)
    })))
  }

  // Get user by ID with full details
  static async getUserById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        sales: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }
      }
    })

    if (!user) return null

    return {
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      permissions: this.getAllPermissions().filter(p => 
        this.getDefaultPermissionsByRole(user.role).includes(p.id)
      ),
      performance: await this.getUserPerformance(user.id)
    }
  }

  // Update user
  static async updateUser(
    id: string, 
    updates: {
      firstName?: string
      lastName?: string
      role?: UserRole
      isActive?: boolean
      phoneNumber?: string
      department?: string
      position?: string
    }
  ): Promise<UserProfile> {
    const oldUser = await prisma.user.findUnique({ where: { id } })
    
    const user = await prisma.user.update({
      where: { id },
      data: updates
    })

    // Log the update
    await this.logUserActivity(id, 'USER_UPDATED', { 
      oldData: oldUser, 
      newData: updates 
    })

    return {
      ...user,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      permissions: this.getAllPermissions().filter(p => 
        this.getDefaultPermissionsByRole(user.role).includes(p.id)
      ),
      performance: await this.getUserPerformance(user.id)
    }
  }

  // Get user performance metrics
  static async getUserPerformance(userId: string): Promise<UserPerformance> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const sales = await prisma.sale.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED'
      }
    })

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const totalTransactions = sales.length
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0

    // Calculate performance score (0-100)
    const expectedMonthlySales = 100000 // KSh - target monthly sales
    const salesScore = Math.min((totalSales / expectedMonthlySales) * 40, 40) // Max 40 points
    const transactionScore = Math.min((totalTransactions / 200) * 30, 30) // Max 30 points
    const avgValueScore = Math.min((averageTransactionValue / 1000) * 30, 30) // Max 30 points
    
    const performanceScore = Math.round(salesScore + transactionScore + avgValueScore)

    // Get user rank among all cashiers
    const allUsers = await prisma.user.findMany({
      where: {
        role: 'CASHIER',
        isActive: true
      },
      include: {
        sales: {
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'COMPLETED'
          }
        }
      }
    })

    const userRankings = allUsers.map(user => ({
      userId: user.id,
      totalSales: user.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    })).sort((a, b) => b.totalSales - a.totalSales)

    const rank = userRankings.findIndex(u => u.userId === userId) + 1

    return {
      totalSales,
      totalTransactions,
      averageTransactionValue,
      performanceScore,
      rank,
      periodStart: thirtyDaysAgo,
      periodEnd: new Date()
    }
  }

  // Schedule Management
  static async getUserSchedule(userId: string): Promise<UserSchedule[]> {
    // This would be implemented with a separate UserSchedule model
    return []
  }

  static async updateUserSchedule(userId: string, schedules: Omit<UserSchedule, 'id' | 'userId' | 'createdAt'>[]): Promise<void> {
    // Implementation for schedule management
    // Would involve creating/updating UserSchedule records
  }

  // Activity Logging
  static async logUserActivity(
    userId: string, 
    action: string, 
    details: any, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType: 'User',
          entityId: userId,
          newValues: JSON.stringify(details),
          ipAddress,
          userAgent
        }
      })
    } catch (error) {
      console.error('Failed to log user activity:', error)
    }
  }

  // Get user activities
  static async getUserActivities(
    userId?: string, 
    limit: number = 50
  ): Promise<UserActivity[]> {
    const whereCondition = userId ? { userId } : {}
    
    const activities = await prisma.auditLog.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return activities.map(activity => ({
      id: activity.id,
      userId: activity.userId!,
      action: activity.action,
      details: activity.newValues ? JSON.parse(activity.newValues) : null,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.createdAt
    }))
  }

  // Payroll Management
  static async generatePayroll(
    userId: string,
    period: string, // YYYY-MM format
    baseSalary: number,
    commissionRate: number = 0.02,
    bonuses: number = 0,
    deductions: number = 0
  ): Promise<PayrollRecord> {
    // Calculate period dates
    const [year, month] = period.split('-').map(Number)
    const periodStart = new Date(year, month - 1, 1)
    const periodEnd = new Date(year, month, 0, 23, 59, 59)

    // Calculate sales-based commission
    const sales = await prisma.sale.findMany({
      where: {
        userId,
        createdAt: { gte: periodStart, lte: periodEnd },
        status: 'COMPLETED'
      }
    })

    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
    const commission = totalSales * commissionRate

    // Calculate overtime (simplified)
    const expectedHours = 160 // 40 hours/week * 4 weeks
    const actualHours = 160 // Would be calculated from schedule
    const overtimeHours = Math.max(0, actualHours - expectedHours)
    const overtimePay = overtimeHours * (baseSalary / expectedHours) * 1.5

    const netPay = baseSalary + commission + bonuses + overtimePay - deductions

    const payrollRecord = await prisma.auditLog.create({
      data: {
        userId,
        action: 'PAYROLL_GENERATED',
        entityType: 'Payroll',
        entityId: `payroll-${period}`,
        newValues: JSON.stringify({
          period,
          baseSalary,
          commission,
          bonuses,
          overtimePay,
          deductions,
          netPay,
          totalSales
        })
      }
    })

    return {
      id: payrollRecord.id,
      userId,
      period,
      baseSalary,
      commission,
      bonuses: bonuses + overtimePay,
      deductions,
      netPay,
      hoursWorked: actualHours,
      overtimeHours,
      status: 'draft',
      createdAt: new Date()
    }
  }

  // User Performance Leaderboard
  static async getPerformanceLeaderboard(period: 'week' | 'month' | 'quarter' = 'month'): Promise<Array<{
    userId: string
    fullName: string
    role: UserRole
    totalSales: number
    totalTransactions: number
    performanceScore: number
    rank: number
  }>> {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['CASHIER', 'MANAGER'] },
        isActive: true
      },
      include: {
        sales: {
          where: {
            createdAt: { gte: startDate },
            status: 'COMPLETED'
          }
        }
      }
    })

    const leaderboard = users.map(user => {
      const totalSales = user.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0)
      const totalTransactions = user.sales.length
      const performanceScore = totalTransactions > 0 ? (totalSales / totalTransactions) : 0

      return {
        userId: user.id,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.role,
        totalSales,
        totalTransactions,
        performanceScore,
        rank: 0 // Will be calculated after sorting
      }
    }).sort((a, b) => b.totalSales - a.totalSales)

    // Assign ranks
    leaderboard.forEach((user, index) => {
      user.rank = index + 1
    })

    return leaderboard
  }

  // User onboarding
  static async onboardUser(clerkUser: any): Promise<UserProfile> {
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id }
    })

    if (existingUser) {
      // Update last login
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { updatedAt: new Date() }
      })

      return this.getUserById(existingUser.id) as Promise<UserProfile>
    }

    // Create new user
    return this.createUser({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: 'CASHIER' // Default role
    })
  }

  // Get dashboard stats for admin
  static async getAdminDashboardStats() {
    const [totalUsers, activeUsers, recentActivities, performanceData] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      this.getUserActivities(undefined, 10),
      this.getPerformanceLeaderboard('month')
    ])

    return {
      totalUsers,
      activeUsers,
      recentActivities,
      topPerformers: performanceData.slice(0, 5)
    }
  }
}