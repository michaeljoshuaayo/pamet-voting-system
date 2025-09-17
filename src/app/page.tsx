'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import LoginForm from '@/components/LoginForm'
import ElectionVoting from '@/components/ElectionVoting'
import AdminDashboard from '@/components/AdminDashboard'

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  is_admin: boolean
  has_voted: boolean
}

export default function Home() {
  const [user, setUser] = useState<object | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewAsVoter, setViewAsVoter] = useState(false)

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await fetchUserProfile(user)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (authUser: object) => {
    try {
      const { data: profile, error } = await supabase
        .from('voter_profiles')
        .select('*')
        .eq('user_id', (authUser as { id: string }).id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        // Check session first (faster than getUser)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && mounted) {
          setUser(session.user)
          
          // Fetch profile with better error handling
          const { data: profile, error } = await supabase
            .from('voter_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          if (!error && profile && mounted) {
            setUserProfile(profile)
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
          await fetchUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const handleLoginSuccess = () => {
    checkUser()
  }

  const handleLogout = async () => {
    try {
      // Clear local state first
      setUser(null)
      setUserProfile(null)
      setViewAsVoter(false)
      
      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Only try to sign out if there's an active session
        const { error } = await supabase.auth.signOut()
        
        if (error) {
          console.error('Logout error:', error)
          // Even if logout fails, continue with cleanup
        }
      }
      
      // Clear any cached data in localStorage
      try {
        localStorage.removeItem('supabase.auth.token')
        // Clear all Supabase auth related items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      } catch (storageError) {
        console.warn('Could not clear localStorage:', storageError)
      }
      
      // Force a clean reload to ensure complete logout
      window.location.href = window.location.origin
      
    } catch (error) {
      console.error('Unexpected logout error:', error)
      // Force page reload as fallback
      window.location.href = window.location.origin
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-blue-300 animate-spin mx-auto" style={{animationDuration: '1.5s'}}></div>
          </div>
          <div className="space-y-2">
            <p className="text-white font-medium text-lg">PAMET Election System</p>
            <p className="text-blue-200 text-sm">Initializing secure connection...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user || !userProfile) {
    return (
      <div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  // Show admin dashboard if user is admin (and not viewing as voter)
  if (userProfile?.is_admin && !viewAsVoter) {
    return (
      <AdminDashboard 
        onLogout={handleLogout} 
        onViewAsVoter={() => setViewAsVoter(true)}
        showViewAsVoter={false}
      />
    )
  }

  // Show voting interface for regular users or when viewing as voter
  return (
    <ElectionVoting 
      onLogout={handleLogout}
      onBackToAdmin={viewAsVoter ? () => setViewAsVoter(false) : undefined}
      isVoterView={viewAsVoter}
    />
  )
}
