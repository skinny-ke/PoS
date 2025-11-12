import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsService } from '@/lib/analytics'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { SalesChart } from '@/components/admin/SalesChart'
import { InventoryAlerts } from '@/components/admin/InventoryAlerts'
import { RecentActivity } from '@/components/admin/RecentActivity'
import { TopProducts } from '@/components/admin/TopProducts'

export default async function AdminPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id }
  })

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'MANAGER')) {
    redirect('/pos')
  }

  // Get dashboard data
  const [
    dashboardSummary,
    salesAnalytics,
    inventoryAnalytics,
    customerAnalytics
  ] = await Promise.all([
    AnalyticsService.getDashboardSummary(),
    AnalyticsService.getSalesAnalytics(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      new Date()
    ),
    AnalyticsService.getInventoryAnalytics(),
    AnalyticsService.getCustomerAnalytics(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    )
  ])

  return (
    <AdminLayout user={dbUser}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {dbUser.firstName}! Here's your business overview.
          </p>
        </div>

        {/* Stats Overview */}
        <DashboardStats 
          summary={dashboardSummary}
          analytics={salesAnalytics}
          customerAnalytics={customerAnalytics}
        />

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart data={salesAnalytics.dailySales} />
          <TopProducts products={salesAnalytics.topProducts} />
        </div>

        {/* Inventory and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryAlerts inventory={inventoryAnalytics} />
          <RecentActivity />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/products"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Manage Products</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add, edit, or remove products</p>
            </a>
            <a
              href="/admin/users"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">User Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage staff and permissions</p>
            </a>
            <a
              href="/admin/reports"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">Generate Reports</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">View detailed analytics</p>
            </a>
            <a
              href="/admin/settings"
              className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <h3 className="font-medium text-gray-900 dark:text-white">System Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configure system preferences</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}