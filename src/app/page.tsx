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
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
          const { data: profile, error } = await supabase
            .from('voter_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (!error) {
            setUserProfile(profile)
          }
        }
      } catch (error) {
        console.error('Error checking user:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginSuccess = () => {
    checkUser()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setViewAsVoter(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
