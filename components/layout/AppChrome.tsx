'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useClientValue } from '@/lib/use-client-value'
import { readRaw, KEYS } from '@/lib/storage'
import DashboardSidebar from '@/components/layout/DashboardSidebar'
import Navbar from '@/components/public/Navbar'

/**
 * Chrome follows the navigation you used, and the choice is REMEMBERED so it
 * never flips mid-session:
 *   - Click a link in the landing top-nav  → remembers 'site'  → marketing navbar
 *   - Click a link in the profile sidebar  → remembers 'app'   → sidebar
 *   - Account-only routes always force 'app'.
 * Signed-out users always get the marketing navbar (they can't be "in" a profile).
 */
const ACCOUNT = ['/dashboard', '/pets', '/add-pet', '/settings', '/admin']

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAccount = ACCOUNT.some(r => pathname === r || pathname.startsWith(r + '/'))
  const [signedIn, setSignedIn] = useState(false)

  // Read the remembered chrome during render so a signed-in user doesn't see
  // the marketing navbar flash before the sidebar takes over.
  const remembered = useClientValue(() => readRaw(KEYS.chrome), null)
  const mode: 'app' | 'site' = isAccount ? 'app' : remembered === 'app' ? 'app' : 'site'

  useEffect(() => {
    let active = true
    if (isAccount) {
      try { localStorage.setItem(KEYS.chrome, 'app') } catch {}
    }
    // Resolve auth (sidebar only ever shows when signed in)
    ;(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (active) setSignedIn(!!data.user)
      } catch { if (active) setSignedIn(false) }
    })()
    return () => { active = false }
  }, [pathname, isAccount])

  if (signedIn && mode === 'app') {
    return (
      <div className="flex min-h-screen bg-[#0C0A0A] text-zinc-100">
        <DashboardSidebar />
        <main className="flex-1 min-h-screen lg:pl-60">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0C0A0A] text-zinc-100">
      <Navbar />
      <main className="min-h-screen pt-20">{children}</main>
    </div>
  )
}
