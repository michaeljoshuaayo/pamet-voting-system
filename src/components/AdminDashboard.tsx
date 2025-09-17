'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { 
  Users, 
  Settings, 
  BarChart3, 
  Plus, 
  UserCheck, 
  Edit, 
  Trash2, 
  TrendingUp,
  Award,
  Clock,
  Shield,
  Eye,
  LogOut,
  ChevronRight,
  Activity
} from 'lucide-react'
import { pametPositions, pametCandidates } from '@/lib/pametData'
import ConfirmModal from './ConfirmModal'
import CandidatePhoto from './CandidatePhoto'
import PerformanceMonitor from './PerformanceMonitor'
import toast from 'react-hot-toast'

type VoterProfile = Database['public']['Tables']['voter_profiles']['Row']
type Position = Database['public']['Tables']['positions']['Row']
type Candidate = Database['public']['Tables']['candidates']['Row']
type ElectionSettings = Database['public']['Tables']['election_settings']['Row']

interface AdminDashboardProps {
  onLogout: () => void
  onViewAsVoter?: () => void
  showViewAsVoter?: boolean
}

export default function AdminDashboard({ onLogout, onViewAsVoter, showViewAsVoter = false }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'candidates' | 'voters' | 'settings' | 'results'>('candidates')
  const [positions, setPositions] = useState<Position[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [voters, setVoters] = useState<VoterProfile[]>([])
  const [settings, setSettings] = useState<ElectionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const [clearVotesModal, setClearVotesModal] = useState(false)
  const [isClearingVotes, setIsClearingVotes] = useState(false)
  
  // Performance metrics state
  const [performanceMetrics, setPerformanceMetrics] = useState({
    loadTime: 0,
    concurrentUsers: 0,
    cacheHitRate: 0,
    lastUpdate: Date.now()
  })

  // Caching state
  const CACHE_DURATION = 15000 // 15 seconds
  const [cachedData, setCachedData] = useState<{
    positions: Position[]
    candidates: Candidate[]
    voters: VoterProfile[]
    settings: ElectionSettings | null
    stats: {
      total_voters: number
      voted_count: number
      admin_count: number
      concurrent_users: number
      cache_timestamp: number
      load_time: number
    }
  } | null>(null)
  const [cacheTimestamp, setCacheTimestamp] = useState(0)

  // Enhanced logout handler with loading state and better error handling
  const handleEnhancedLogout = async () => {
    if (isLoggingOut) return // Prevent double-clicks
    
    try {
      setIsLoggingOut(true)
      toast.loading('Logging out...', { id: 'logout-toast' })
      
      // Clear any ongoing operations
      setLoading(false)
      
      // Check if there's an active session before attempting to sign out
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Only try to sign out if there's an active session
        const { error } = await supabase.auth.signOut()
        
        if (error && !error.message.includes('session_not_found') && !error.message.includes('Auth session missing')) {
          console.error('Logout error:', error)
          toast.error(`Logout failed: ${error.message}`, { id: 'logout-toast' })
          return
        }
      }
      
      // Clear local state
      setPositions([])
      setCandidates([])
      setVoters([])
      setSettings(null)
      setCachedData(null)
      setCacheTimestamp(0)
      
      toast.success('Logged out successfully', { id: 'logout-toast' })
      
      // Small delay to show success message before calling parent logout
      setTimeout(() => {
        onLogout()
      }, 500)
      
    } catch (error) {
      console.error('Unexpected logout error:', error)
      toast.error('Logout failed. Please try refreshing the page.', { id: 'logout-toast' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Filter out admin accounts from voters - only count actual voters
  const registeredVoters = voters.filter(voter => !voter.is_admin)

  // Voter form state
  const [showVoterForm, setShowVoterForm] = useState(false)
  const [editingVoter, setEditingVoter] = useState<VoterProfile | null>(null)
  const [voterForm, setVoterForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    member_id: '',
    password: ''
  })

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'voter' | 'candidate' | null
    item: VoterProfile | Candidate | null
    title: string
    message: string
  }>({
    isOpen: false,
    type: null,
    item: null,
    title: '',
    message: ''
  })

  const fetchData = useCallback(async () => {
    const startTime = Date.now()
    try {
      setLoading(true)
      
      // �️ SAFE APPROACH: Try optimized function first, fallback to original queries
      let dashboardData = null
      let useOptimized = true
      
      try {
        // Try the new optimized function
        const { data, error } = await supabase
          .rpc('get_admin_dashboard_data')
        
        if (error) {
          console.warn('Optimized function not available, using fallback:', error.message)
          useOptimized = false
        } else if (data?.error) {
          console.warn('Optimized function returned error, using fallback:', data.message)
          useOptimized = false
        } else {
          dashboardData = data
        }
      } catch (optimizedError) {
        console.warn('Optimized function failed, using fallback:', optimizedError)
        useOptimized = false
      }

      // 🔄 FALLBACK: Use original queries if optimized function fails
      if (!useOptimized || !dashboardData) {
        console.log('Using fallback queries for safety')
        
        const [positionsRes, candidatesRes, votersRes, settingsRes] = await Promise.all([
          supabase
            .from('positions')
            .select('id, title, description, order_index, created_at')
            .order('order_index'),
          supabase
            .from('candidates')
            .select('id, position_id, first_name, last_name, platform, photo_url, vote_count, created_at')
            .order('first_name'),
          supabase
            .from('voter_profiles')
            .select('id, user_id, email, first_name, last_name, member_id, is_admin, has_voted, created_at')
            .order('first_name'),
          supabase
            .from('election_settings')
            .select('id, is_voting_open, voting_start_time, voting_end_time, election_title, updated_at, updated_by')
            .limit(1)
        ])

        // Check for errors in fallback queries
        const errors = [
          { res: positionsRes, name: 'Positions' },
          { res: candidatesRes, name: 'Candidates' },
          { res: votersRes, name: 'Voters' },
          { res: settingsRes, name: 'Settings' }
        ].filter(({ res }) => res.error)

        if (errors.length > 0) {
          const errorMessages = errors.map(({ res, name }) => `${name}: ${res.error!.message}`)
          throw new Error(errorMessages.join('; '))
        }

        // Structure data like optimized function
        const votersData = votersRes.data || []
        dashboardData = {
          positions: positionsRes.data || [],
          candidates: candidatesRes.data || [],
          voters: votersData,
          settings: settingsRes.data?.[0] || null,
          stats: {
            total_voters: votersData.filter(v => !v.is_admin).length,
            voted_count: votersData.filter(v => !v.is_admin && v.has_voted).length,
            admin_count: votersData.filter(v => v.is_admin).length,
            concurrent_users: 0,
            cache_timestamp: Date.now() / 1000,
            load_time: 0,
            version: 'fallback'
          }
        }
      }

      if (!dashboardData) {
        throw new Error('No data returned from any method')
      }

      // Extract data with type safety
      const { positions, candidates, voters, settings, stats } = dashboardData
      
      // Set data efficiently
      setPositions(positions || [])
      setCandidates(candidates || [])
      setVoters(voters || [])
      setSettings(settings || null)
      
      // Update performance metrics
      const loadTime = Date.now() - startTime
      setLastRefresh(Date.now())
      setPerformanceMetrics({
        loadTime,
        concurrentUsers: stats?.concurrent_users || 0,
        cacheHitRate: 0,
        lastUpdate: Date.now()
      })

      // Cache the results
      setCachedData({ positions, candidates, voters, settings, stats })
      setCacheTimestamp(Date.now())
      
      // Enhanced performance feedback with safety indicators
      const totalVoters = stats?.total_voters || 0
      const votedCount = stats?.voted_count || 0
      const concurrentUsers = stats?.concurrent_users || 0
      const version = stats?.version || 'unknown'
      
      if (loadTime < 200) {
        toast.success(`⚡ Excellent! Loaded in ${loadTime}ms • ${totalVoters} voters, ${votedCount} voted • ${concurrentUsers} users ${useOptimized ? '🚀' : '🛡️'}`)
      } else if (loadTime < 500) {
        toast.success(`✅ Good! Loaded in ${loadTime}ms • ${totalVoters} voters, ${votedCount} voted • ${version} mode`)
      } else {
        toast(`📊 Loaded in ${loadTime}ms • ${totalVoters} voters, ${votedCount} voted • ${version} mode`, {
          icon: useOptimized ? '🚀' : '🛡️',
          duration: 4000
        })
      }
      
    } catch (error) {
      console.error('Error loading election data:', error)
      
      // Final fallback to static data
      setPositions(pametPositions)
      setCandidates(pametCandidates)
      setVoters([])
      setSettings({
        id: 'fallback-settings-id',
        is_voting_open: false,
        voting_start_time: null,
        voting_end_time: null,
        election_title: 'PAMET Sorsogon Chapter Election 2025',
        updated_at: new Date().toISOString(),
        updated_by: null
      })
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`🛡️ Using static fallback data: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [])

  // 🚀 INTELLIGENT CACHING: Reduce database load for concurrent users
  const debouncedFetchData = useCallback(() => {
    const now = Date.now()
    
    // Check for rapid successive calls protection
    if (now - lastRefresh < 1000) {
      toast.error('Please wait before refreshing again (prevents server overload)')
      return
    }
    
    // Use cache for rapid successive calls within cache duration
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      // Set cached data
      setPositions(cachedData.positions || [])
      setCandidates(cachedData.candidates || [])
      setVoters(cachedData.voters || [])
      setSettings(cachedData.settings || null)
      
      const cacheAge = Math.round((now - cacheTimestamp) / 1000)
      const concurrentUsers = cachedData.stats?.concurrent_users || 0
      
      // Update cache hit rate
      setPerformanceMetrics(prev => ({
        ...prev,
        cacheHitRate: prev.cacheHitRate + 1,
        lastUpdate: now
      }))
      
      toast.success(`📱 Cached data (${cacheAge}s old) • Reduced server load • ${concurrentUsers} users online`)
      return
    }
    
    // Fresh fetch with caching
    fetchData()
  }, [lastRefresh, cachedData, cacheTimestamp, CACHE_DURATION, fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // TEMPORARILY DISABLED: Real-time subscriptions causing infinite loops
  // Will re-enable after testing manual refresh functionality
  /*
  useEffect(() => {
    const subscription = supabase
      .channel('admin_dashboard')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'voter_profiles' },
        (payload) => {
          console.log('Real-time update received:', payload)
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  */

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/create-voter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: voterForm.email,
          password: voterForm.password,
          first_name: voterForm.first_name,
          last_name: voterForm.last_name,
          member_id: voterForm.member_id || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create voter')
      }

      // Refresh data and reset form
      await fetchData()
      setShowVoterForm(false)
      setVoterForm({
        email: '',
        first_name: '',
        last_name: '',
        member_id: '',
        password: ''
      })
      toast.success('Voter account created successfully!')
    } catch (error) {
      console.error('Error adding voter:', error)
      toast.error(`Error creating voter account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const toggleVoting = async () => {
    try {
      const newStatus = !settings?.is_voting_open

      if (settings) {
        const { error } = await supabase
          .from('election_settings')
          .update({ 
            is_voting_open: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('election_settings')
          .insert({
            is_voting_open: newStatus,
            election_title: 'PAMET Sorsogon Chapter Election 2025',
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        if (data) setSettings(data)
      }

      // Refresh settings after successful update
      await fetchData()
      toast.success(`Voting ${newStatus ? 'opened' : 'closed'} successfully!`)
    } catch (error) {
      console.error('Error toggling voting:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Error updating voting status: ${errorMessage}`)
    }
  }

  const handleClearVotes = async () => {
    try {
      setIsClearingVotes(true)
      
      const response = await fetch('/api/clear-votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to clear votes')
      }

      const result = await response.json()
      
      // Refresh all data after clearing votes
      await fetchData()
      setClearVotesModal(false)
      
      toast.success(`Successfully cleared all votes! (${result.deletedVotes} votes removed)`)
    } catch (error) {
      console.error('Error clearing votes:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Error clearing votes: ${errorMessage}`)
    } finally {
      setIsClearingVotes(false)
    }
  }

  const handleEditVoter = (voter: VoterProfile) => {
    setEditingVoter(voter)
    setVoterForm({
      email: voter.email,
      first_name: voter.first_name,
      last_name: voter.last_name,
      member_id: voter.member_id || '',
      password: '' // Don't prefill password for security
    })
    setShowVoterForm(true)
  }

  const handleUpdateVoter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVoter) return

    try {
      const response = await fetch('/api/update-voter', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voter_id: editingVoter.id,
          email: voterForm.email,
          password: voterForm.password, // Will only update if not empty
          first_name: voterForm.first_name,
          last_name: voterForm.last_name,
          member_id: voterForm.member_id || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update voter')
      }

      // Refresh data and reset form
      await fetchData()
      setShowVoterForm(false)
      setEditingVoter(null)
      setVoterForm({
        email: '',
        first_name: '',
        last_name: '',
        member_id: '',
        password: ''
      })
      toast.success('Voter updated successfully!')
    } catch (error) {
      console.error('Error updating voter:', error)
      toast.error(`Error updating voter: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteVoter = (voter: VoterProfile) => {
    setDeleteModal({
      isOpen: true,
      type: 'voter',
      item: voter,
      title: 'Delete Voter',
      message: `Are you sure you want to delete ${voter.first_name} ${voter.last_name}? This action cannot be undone and will permanently remove their account and any votes they have cast.`
    })
  }

  const confirmDeleteVoter = async (voter: VoterProfile) => {
    try {
      const { data, error } = await supabase.rpc('delete_voter_account', {
        voter_email: voter.email
      })

      if (error) throw error

      if (data?.success) {
        await fetchData() // Refresh data
        toast.success('Voter deleted successfully!')
      } else {
        toast.error(data?.error || 'Error deleting voter')
      }
    } catch (error) {
      console.error('Error deleting voter:', error)
      toast.error('Error deleting voter: ' + (error as Error).message)
    }
  }

  const handleModalConfirm = () => {
    if (deleteModal.type === 'voter' && deleteModal.item) {
      confirmDeleteVoter(deleteModal.item as VoterProfile)
    }
    setDeleteModal({ isOpen: false, type: null, item: null, title: '', message: '' })
  }

  const handleModalCancel = () => {
    setDeleteModal({ isOpen: false, type: null, item: null, title: '', message: '' })
  }

  const resetVoterForm = () => {
    setShowVoterForm(false)
    setEditingVoter(null)
    setVoterForm({
      email: '',
      first_name: '',
      last_name: '',
      member_id: '',
      password: ''
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'voters', label: 'Voters', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'results', label: 'Results', icon: BarChart3 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Professional Header */}
      <div className="bg-white shadow-xl border-b border-slate-200 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-6 space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                </div>
              </div>
              <p className="text-slate-600 text-sm flex items-center justify-center sm:justify-start space-x-2">
                <Activity className="h-4 w-4" />
                <span>PAMET Sorsogon Chapter Election System</span>
              </p>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 mx-auto sm:mx-0 mt-3 rounded-full"></div>
            </div>
            
            {/* Enhanced Action Buttons with Performance Metrics */}
            <div className="flex flex-col sm:flex-row gap-3 self-center sm:self-auto">
              <button
                onClick={debouncedFetchData}
                disabled={loading}
                className="group bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Activity className={`h-5 w-5 group-hover:scale-110 transition-transform ${loading ? 'animate-spin' : ''}`} />
                <div className="flex flex-col items-start">
                  <span className="font-medium">{loading ? 'Refreshing...' : 'Refresh Data'}</span>
                  {!loading && (
                    <div className="flex items-center space-x-2 text-xs opacity-75">
                      {lastRefresh && (
                        <span>{Math.round((Date.now() - lastRefresh) / 1000)}s ago</span>
                      )}
                      {performanceMetrics.loadTime > 0 && (
                        <span>• {performanceMetrics.loadTime}ms</span>
                      )}
                      {performanceMetrics.concurrentUsers > 0 && (
                        <span>• {performanceMetrics.concurrentUsers} users</span>
                      )}
                      {performanceMetrics.cacheHitRate > 0 && (
                        <span>• 📱 {performanceMetrics.cacheHitRate} cached</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
              
              {showViewAsVoter && onViewAsVoter && (
                <button
                  onClick={onViewAsVoter}
                  className="group bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Eye className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">View as Voter</span>
                </button>
              )}
              <button
                onClick={handleEnhancedLogout}
                disabled={isLoggingOut}
                className={`group ${
                  isLoggingOut 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 transform hover:scale-105'
                } text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 min-w-[120px]`}
              >
                {isLoggingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                    <span className="font-medium">Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Logout</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Performance Monitor - Shows system health for 120+ users */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <PerformanceMonitor performanceMetrics={performanceMetrics} />
      </div>

      {/* Enhanced Mobile-Optimized Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Mobile Tab Navigation - Enhanced Grid Layout */}
        <div className="sm:hidden mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-3">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'candidates' | 'voters' | 'settings' | 'results')}
                    className={`py-4 px-4 rounded-xl font-semibold text-sm flex flex-col items-center space-y-2 transition-all duration-300 transform ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105' 
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:scale-102'
                    }`}
                  >
                    <Icon className={`h-6 w-6 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                    <span className="text-xs font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Desktop Tab Navigation - Enhanced Design */}
        <div className="hidden sm:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-2 mb-8">
          <nav className="flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'candidates' | 'voters' | 'settings' | 'results')}
                  className={`group flex-1 py-4 px-6 rounded-xl font-semibold text-sm flex items-center justify-center space-x-3 transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:scale-102'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'scale-110' : ''}`} />
                  <span className="hidden lg:block">{tab.label}</span>
                  <span className="lg:hidden">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Enhanced Professional Candidates Section */}
        {activeTab === 'candidates' && (
          <div className="space-y-8">
            {/* Enhanced Header with Statistics */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Candidates Management
                    </h2>
                  </div>
                  <p className="text-slate-600 flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span>Official PAMET Sorsogon Chapter election candidates</span>
                  </p>
                </div>
                
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{candidates.length}</div>
                      <div className="text-sm text-blue-500 font-medium">Total Candidates</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600">{positions.length}</div>
                      <div className="text-sm text-emerald-500 font-medium">Positions</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Mobile-First Candidates Display */}
            <div className="space-y-6">
              {/* Enhanced Mobile Cards */}
              <div className="grid grid-cols-1 gap-6 lg:hidden">
                {candidates.map((candidate) => {
                  const position = positions.find(p => p.id === candidate.position_id)
                  return (
                    <div key={candidate.id} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-102">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="relative">
                            <CandidatePhoto 
                              photoUrl={candidate.photo_url}
                              firstName={candidate.first_name}
                              lastName={candidate.last_name}
                              size="md"
                            />
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                              <Award className="h-3 w-3 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-xl mb-2">
                              {candidate.first_name} {candidate.last_name}
                            </h3>
                            <span className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-sm font-semibold px-4 py-2 rounded-full border border-blue-200">
                              <ChevronRight className="h-3 w-3 mr-1" />
                              {position?.title}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Platform:
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {candidate.platform || 'No platform provided'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                          <span className="text-sm font-semibold text-slate-700 flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Total Votes:
                          </span>
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg">
                            <span className="text-lg font-bold">{candidate.vote_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Enhanced Desktop Table */}
              <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Candidates Overview
                  </h3>
                </div>
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-8 py-5 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Candidate
                      </th>
                      <th className="px-8 py-5 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-8 py-5 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-8 py-5 text-center text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Votes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidates.map((candidate, index) => {
                      const position = positions.find(p => p.id === candidate.position_id)
                      return (
                        <tr key={candidate.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <CandidatePhoto 
                                  photoUrl={candidate.photo_url}
                                  firstName={candidate.first_name}
                                  lastName={candidate.last_name}
                                  size="sm"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{index + 1}</span>
                                </div>
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                  {candidate.first_name} {candidate.last_name}
                                </div>
                                <div className="text-sm text-slate-500">Candidate #{index + 1}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                              <Award className="h-3 w-3 mr-2" />
                              {position?.title}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm text-slate-700 max-w-xs">
                              <div className="truncate bg-slate-50 p-3 rounded-lg border border-slate-200">
                                {candidate.platform || 'No platform provided'}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center px-6 py-3 rounded-full text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg group-hover:shadow-xl transition-shadow">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {candidate.vote_count}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Professional Voters Section */}
        {activeTab === 'voters' && (
          <div className="space-y-8">
            {/* Enhanced Header with Add Button and Statistics */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-6 lg:space-y-0">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Voters Management
                    </h2>
                  </div>
                  <p className="text-slate-600 flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Manage registered voters and their accounts</span>
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 text-center">
                      <div className="text-xl font-bold text-blue-600">{registeredVoters.length}</div>
                      <div className="text-xs text-blue-500 font-medium">Active Voters</div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 text-center">
                      <div className="text-xl font-bold text-emerald-600">{registeredVoters.filter(v => v.has_voted).length}</div>
                      <div className="text-xs text-emerald-500 font-medium">Have Voted</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setShowVoterForm(true)}
                    className="group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Add Voter</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Mobile-First Voters Display */}
            <div className="space-y-6">
              {/* Enhanced Mobile Cards */}
              <div className="grid grid-cols-1 gap-6 lg:hidden">
                {registeredVoters.map((voter) => (
                  <div key={voter.id} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-102">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">
                              {voter.first_name.charAt(0)}{voter.last_name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-xl">
                              {voter.first_name} {voter.last_name}
                            </h3>
                            <p className="text-slate-600 text-sm flex items-center space-x-1">
                              <Activity className="h-3 w-3" />
                              <span>{voter.email}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditVoter(voter)}
                          className="group/btn p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
                          title="Edit voter"
                        >
                          <Edit className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleDeleteVoter(voter)}
                          className="group/btn p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                          title="Delete voter"
                        >
                          <Trash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                          <span className="text-sm font-semibold text-slate-700 block mb-1">Status:</span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            voter.is_admin 
                              ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300' 
                              : 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300'
                          }`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {voter.is_admin ? 'Admin' : 'Active'}
                          </span>
                        </div>
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                          <span className="text-sm font-semibold text-slate-700 block mb-1">Voted:</span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            voter.has_voted 
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300' 
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                          }`}>
                            <Clock className="h-3 w-3 mr-1" />
                            {voter.has_voted ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Desktop Table */}
              <div className="hidden lg:block bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-5 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Registered Voters Overview
                  </h3>
                </div>
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <tr>
                      <th className="px-8 py-5 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Voter
                      </th>
                      <th className="px-8 py-5 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-8 py-5 text-center text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-8 py-5 text-center text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Voted
                      </th>
                      <th className="px-8 py-5 text-center text-sm font-bold text-slate-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registeredVoters.map((voter, index) => (
                      <tr key={voter.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                        <td className="px-8 py-6">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-sm">
                                  {voter.first_name.charAt(0)}{voter.last_name.charAt(0)}
                                </span>
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{index + 1}</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {voter.first_name} {voter.last_name}
                              </div>
                              <div className="text-sm text-slate-500">Voter #{index + 1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm text-slate-700 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            {voter.email}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                            voter.is_admin 
                              ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300' 
                              : 'bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300'
                          }`}>
                            <Shield className="h-3 w-3 mr-2" />
                            {voter.is_admin ? 'Admin' : 'Active'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                            voter.has_voted 
                              ? 'bg-gradient-to-r from-blue-100 to-indigo-200 text-blue-800 border border-blue-300' 
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
                          }`}>
                            <Clock className="h-3 w-3 mr-2" />
                            {voter.has_voted ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => handleEditVoter(voter)}
                              className="group/btn text-blue-600 hover:text-blue-900 p-3 rounded-full hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                              title="Edit voter"
                            >
                              <Edit className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleDeleteVoter(voter)}
                              className="group/btn text-red-600 hover:text-red-900 p-3 rounded-full hover:bg-red-50 transition-all duration-200 hover:scale-110"
                              title="Delete voter"
                            >
                              <Trash2 className="h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}        {/* Enhanced Voter Form Modal */}
        {showVoterForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative bg-white/95 backdrop-blur-sm border border-slate-200 max-w-md w-full shadow-2xl rounded-2xl">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    {editingVoter ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  </div>
                  <h3 className="text-xl font-bold">
                    {editingVoter ? 'Edit Voter Account' : 'Create New Voter'}
                  </h3>
                </div>
                <p className="text-blue-100 text-sm mt-2">
                  {editingVoter ? 'Update voter information and credentials' : 'Add a new voter to the election system'}
                </p>
              </div>
              
              <form onSubmit={editingVoter ? handleUpdateVoter : handleAddVoter} className="p-6 space-y-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={voterForm.email}
                        onChange={(e) => setVoterForm({...voterForm, email: e.target.value})}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400 transition-all duration-200"
                        placeholder="voter@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Password {editingVoter && <span className="text-slate-500 font-normal">(leave blank to keep current)</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={voterForm.password}
                        onChange={(e) => setVoterForm({...voterForm, password: e.target.value})}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400 transition-all duration-200"
                        placeholder={editingVoter ? "Leave blank to keep current password" : "Create secure password"}
                        required={!editingVoter}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={voterForm.first_name}
                        onChange={(e) => setVoterForm({...voterForm, first_name: e.target.value})}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400 transition-all duration-200"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={voterForm.last_name}
                        onChange={(e) => setVoterForm({...voterForm, last_name: e.target.value})}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400 transition-all duration-200"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Member ID <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={voterForm.member_id}
                      onChange={(e) => setVoterForm({...voterForm, member_id: e.target.value})}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400 transition-all duration-200"
                      placeholder="PAMET-2024-001"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-4 pt-6 border-t border-slate-200">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    {editingVoter ? 'Update Voter' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={resetVoterForm}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Settings Section */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Enhanced Settings Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Election Settings
                  </h2>
                  <p className="text-slate-600">Configure election parameters and monitor system status</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Voting Control Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Voting Control</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Current Status</p>
                        <p className={`text-lg font-bold ${settings?.is_voting_open ? 'text-emerald-600' : 'text-red-600'}`}>
                          {settings?.is_voting_open ? '🟢 Voting Open' : '🔴 Voting Closed'}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full ${settings?.is_voting_open ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    </div>
                    
                    <button
                      onClick={toggleVoting}
                      className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl ${
                        settings?.is_voting_open 
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700' 
                          : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
                      }`}
                    >
                      {settings?.is_voting_open ? '🛑 Close Voting' : '▶️ Open Voting'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Statistics Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Election Statistics</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-blue-600">{candidates.length}</div>
                        <div className="text-sm text-blue-500 font-medium">Total Candidates</div>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-emerald-600">{registeredVoters.length}</div>
                        <div className="text-sm text-emerald-500 font-medium">Registered Voters</div>
                      </div>
                      <UserCheck className="h-8 w-8 text-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-50 to-purple-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-3xl font-bold text-purple-600">{registeredVoters.filter(v => v.has_voted).length}</div>
                        <div className="text-sm text-purple-500 font-medium">Votes Cast</div>
                      </div>
                      <Award className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700">Voting Progress</span>
                      <span className="text-sm font-bold text-slate-800">
                        {registeredVoters.length > 0 ? Math.round((registeredVoters.filter(v => v.has_voted).length / registeredVoters.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${registeredVoters.length > 0 ? (registeredVoters.filter(v => v.has_voted).length / registeredVoters.length) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Administrative Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Administrative Actions</h3>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-6 border border-red-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-red-600 mb-2">⚠️ Clear All Votes</h4>
                    <p className="text-sm text-red-500 mb-4">
                      This action will permanently delete all votes and reset candidate vote counts. 
                      Voter registration and candidate data will remain intact. This action cannot be undone.
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-red-600">
                      <span>• Deletes all election votes</span>
                      <span>• Resets candidate vote counts to 0</span>
                      <span>• Marks all voters as &ldquo;not voted&rdquo;</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setClearVotesModal(true)}
                    disabled={isClearingVotes}
                    className="ml-6 py-3 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 
                             text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 
                             shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                             flex items-center space-x-2"
                  >
                    {isClearingVotes ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Clearing...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Clear All Votes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Results Section */}
        {activeTab === 'results' && (
          <div className="space-y-8">
            {/* Enhanced Results Header */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Election Results
                  </h2>
                  <p className="text-slate-600">Real-time voting results and candidate standings</p>
                </div>
              </div>
              
              {/* Overall Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100 text-center">
                  <div className="text-2xl font-bold text-blue-600">{positions.length}</div>
                  <div className="text-sm text-blue-500 font-medium">Positions</div>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{candidates.length}</div>
                  <div className="text-sm text-emerald-500 font-medium">Candidates</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-50 rounded-xl p-4 border border-purple-100 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0)}
                  </div>
                  <div className="text-sm text-purple-500 font-medium">Total Votes</div>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {registeredVoters.filter(v => v.has_voted).length}
                  </div>
                  <div className="text-sm text-amber-500 font-medium">Voters Participated</div>
                </div>
              </div>
            </div>
            
            {/* Results by Position */}
            <div className="space-y-8">
              {positions.map((position, positionIndex) => {
                const positionCandidates = candidates.filter(c => c.position_id === position.id)
                const totalVotes = positionCandidates.reduce((sum, c) => sum + (c.vote_count || 0), 0)
                
                return (
                  <div key={position.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    {/* Position Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">{positionIndex + 1}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{position.title}</h3>
                            <p className="text-sm text-slate-600">{positionCandidates.length} candidates • {totalVotes} total votes</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-500">Turnout Rate</div>
                          <div className="text-lg font-bold text-slate-800">
                            {registeredVoters.length > 0 ? Math.round((totalVotes / registeredVoters.length) * 100) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Candidates Results */}
                    <div className="p-6">
                      <div className="space-y-4">
                        {positionCandidates.length > 0 ? (
                          positionCandidates
                            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                            .map((candidate, index) => {
                              const voteCount = candidate.vote_count || 0
                              const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
                              
                              const getRankColor = (rank: number) => {
                                switch (rank) {
                                  case 0: return 'from-yellow-400 to-amber-500' // Gold
                                  case 1: return 'from-gray-300 to-gray-400' // Silver
                                  case 2: return 'from-orange-400 to-orange-500' // Bronze
                                  default: return 'from-slate-300 to-slate-400'
                                }
                              }
                              
                              const getRankIcon = (rank: number) => {
                                switch (rank) {
                                  case 0: return '🥇'
                                  case 1: return '🥈'
                                  case 2: return '🥉'
                                  default: return '🏅'
                                }
                              }
                              
                              return (
                                <div key={candidate.id} className="group bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                      <div className={`w-12 h-12 bg-gradient-to-r ${getRankColor(index)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                        <span>{getRankIcon(index)}</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                          <span className="font-bold text-slate-800 text-lg">
                                            {candidate.first_name} {candidate.last_name}
                                          </span>
                                          {index === 0 && totalVotes > 0 && (
                                            <span className="bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                                              🏆 LEADING
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Vote Progress Bar */}
                                        <div className="space-y-2">
                                          <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-600">Vote Share</span>
                                            <span className="text-sm font-semibold text-slate-800">{percentage.toFixed(1)}%</span>
                                          </div>
                                          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                            <div 
                                              className={`bg-gradient-to-r ${getRankColor(index)} h-3 rounded-full transition-all duration-1000 ease-out`}
                                              style={{ width: `${percentage}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-right ml-6">
                                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg">
                                        <div className="text-2xl font-bold">{voteCount}</div>
                                        <div className="text-xs text-blue-100">votes</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                        ) : (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Users className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-lg font-medium">No candidates for this position</p>
                            <p className="text-slate-400 text-sm">Candidates will appear here once they are registered</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={handleModalCancel}
          onConfirm={handleModalConfirm}
          title={deleteModal.title}
          message={deleteModal.message}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Clear Votes Confirmation Modal */}
        <ConfirmModal
          isOpen={clearVotesModal}
          onClose={() => setClearVotesModal(false)}
          onConfirm={handleClearVotes}
          title="⚠️ Clear All Votes"
          message="This will permanently delete ALL votes and reset candidate vote counts to zero. Voter registrations will remain intact. This action cannot be undone. Are you sure you want to proceed?"
          confirmText="Clear All Votes"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  )
}
