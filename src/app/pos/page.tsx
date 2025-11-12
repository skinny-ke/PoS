import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { POSRegister } from '@/components/pos/POSRegister'
import { OnlineStatus } from '@/components/pos/OnlineStatus'
import { prisma } from '@/lib/prisma'

export default async function POSPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id }
  })

  if (!dbUser) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <OnlineStatus />
      
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Murimi POS
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Wholesale Point of Sale System
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cashier: {dbUser.firstName} {dbUser.lastName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Role: {dbUser.role}
              </p>
            </div>
          </div>
        </header>

        <POSRegister user={{
          ...dbUser,
          firstName: dbUser.firstName || undefined,
          lastName: dbUser.lastName || undefined
        }} />
      </div>
    </div>
  )
}