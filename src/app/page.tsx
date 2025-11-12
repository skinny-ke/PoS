import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

export default async function HomePage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  // For now, redirect to POS until database is set up
  redirect('/pos')
}