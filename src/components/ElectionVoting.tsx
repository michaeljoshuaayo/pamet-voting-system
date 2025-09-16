'use client'

import { useState, useEffect } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { pametPositions, pametCandidates } from '@/lib/pametData'
import { 
  Clock, 
  CheckCircle, 
  Vote, 
  LogOut, 
  Award,
  Trophy,
  Users,
  Star,
  UserCheck,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  Zap
} from 'lucide-react'
import CandidatePhoto from './CandidatePhoto'
import toast from 'react-hot-toast'

type VoterProfile = Database['public']['Tables']['voter_profiles']['Row']
type Position = Database['public']['Tables']['positions']['Row']
type Candidate = Database['public']['Tables']['candidates']['Row']
type ElectionVote = Database['public']['Tables']['election_votes']['Row']
type ElectionSettings = Database['public']['Tables']['election_settings']['Row']

interface PositionWithCandidates extends Position {
  candidates: Candidate[]
  user_vote?: ElectionVote
  abstain_count?: number
  total_votes?: number
}

interface ElectionVotingProps {
  onLogout: () => void
  onBackToAdmin?: () => void
  isVoterView?: boolean
}

export default function ElectionVoting({ onLogout, onBackToAdmin }: ElectionVotingProps) {
  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null)
  const [positions, setPositions] = useState<PositionWithCandidates[]>([])
  const [electionSettings, setElectionSettings] = useState<ElectionSettings | null>(null)
  const [totalEligibleVoters, setTotalEligibleVoters] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<{positionId: string, candidateId: string | null} | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true)
        
        // First fetch user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile, error: profileError } = await supabase
          .from('voter_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profileError) throw profileError
        setVoterProfile(profile)

        // Then fetch election data
        const [settingsRes, positionsRes, candidatesRes, votesRes, votersCountRes] = await Promise.all([
          supabase.from('election_settings').select('*').limit(1),
          supabase.from('positions').select('*').order('order_index'),
          supabase.from('candidates').select('*').order('first_name'),
          profile ? supabase.from('election_votes').select('*').eq('voter_id', profile.id) : Promise.resolve({ data: [], error: null }),
          supabase.from('voter_profiles').select('id', { count: 'exact' }).eq('is_admin', false)
        ])

        // Handle any database errors
        if (settingsRes.error) {
          console.error('Error fetching settings:', settingsRes.error)
          throw new Error(`Settings: ${settingsRes.error.message}`)
        }
        if (positionsRes.error) {
          console.error('Error fetching positions:', positionsRes.error)
          throw new Error(`Positions: ${positionsRes.error.message}`)
        }
        if (candidatesRes.error) {
          console.error('Error fetching candidates:', candidatesRes.error)
          throw new Error(`Candidates: ${candidatesRes.error.message}`)
        }
        if (votesRes.error) {
          console.error('Error fetching votes:', votesRes.error)
          throw new Error(`Votes: ${votesRes.error.message}`)
        }
        if (votersCountRes.error) {
          console.error('Error fetching voter count:', votersCountRes.error)
        }

        // Set total eligible voters count
        const voterCount = votersCountRes.count || 0
        setTotalEligibleVoters(voterCount || 120) // fallback to 120 if count fails

        // Set election settings (use first record or fallback)
        const settings = settingsRes.data?.[0] || {
          id: 'fallback-id',
          is_voting_open: false,
          voting_start_time: null,
          voting_end_time: null,
          election_title: 'PAMET Sorsogon Chapter Election 2025',
          updated_at: new Date().toISOString(),
          updated_by: null
        }
        setElectionSettings(settings)

        // Transform data to include candidates and user votes for each position
        const positionsWithCandidates = await Promise.all(
          (positionsRes.data || []).map(async (position) => {
            // Get abstain vote count for this position
            const { data: abstainData, error: abstainError } = await supabase
              .rpc('get_abstain_votes_count', { position_id_param: position.id })
            
            // Get total votes count for this position  
            const { data: totalVotesData, error: totalVotesError } = await supabase
              .rpc('get_total_votes_count', { position_id_param: position.id })

            if (abstainError) {
              console.warn('Error fetching abstain count for position:', position.title, abstainError)
            }
            if (totalVotesError) {
              console.warn('Error fetching total votes count for position:', position.title, totalVotesError)
            }

            return {
              ...position,
              candidates: (candidatesRes.data || []).filter(candidate => candidate.position_id === position.id),
              user_vote: (votesRes.data || []).find(vote => vote.position_id === position.id),
              abstain_count: abstainData || 0,
              total_votes: totalVotesData || 0
            }
          })
        )
        
        setPositions(positionsWithCandidates)
        
        // Show success message with voting status
        const votingStatus = settings.is_voting_open ? '🟢 Open' : '🔴 Closed'
        toast.success(`Election data loaded! Voting status: ${votingStatus}`)
      } catch (error) {
        console.error('Error loading election data:', error)
        
        // Fallback to static data if database fails
        setElectionSettings({
          id: 'fallback-id',
          is_voting_open: false,
          voting_start_time: null,
          voting_end_time: null,
          election_title: 'PAMET Sorsogon Chapter Election 2025',
          updated_at: new Date().toISOString(),
          updated_by: null
        })
        
        const positionsWithCandidates = pametPositions.map(position => ({
          ...position,
          candidates: pametCandidates.filter(candidate => candidate.position_id === position.id),
          user_vote: undefined
        }))
        
        setPositions(positionsWithCandidates)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Database error: ${errorMessage}. Using fallback data.`)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, []) // Empty dependency array - only run once on mount

  const handleVote = async (positionId: string, candidateId: string | null) => {
    if (!voterProfile || voting) return

    setVoting({positionId, candidateId})
    try {
      // Check if voting is open
      if (!electionSettings?.is_voting_open) {
        toast.error('Voting is currently closed.')
        return
      }

      // Check if user already voted for this position
      const existingVote = positions.find(p => p.id === positionId)?.user_vote
      if (existingVote) {
        toast('You have already voted for this position.', {
          icon: '⚠️',
          style: {
            background: '#f59e0b',
            color: '#fff',
          },
        })
        return
      }

      // Use the secure voting function that handles both vote insertion and status update atomically
      const { data: voteResult, error: voteError } = await supabase
        .rpc('submit_vote', {
          p_voter_id: voterProfile.id,
          p_position_id: positionId,
          p_candidate_id: candidateId
        })

      if (voteError) {
        console.error('Voting function error:', voteError)
        throw voteError
      }

      console.log('Vote function result:', voteResult)

      if (!voteResult.success) {
        throw new Error(voteResult.error || 'Vote submission failed')
      }

      console.log('Vote submitted successfully with automatic status update')
      
      // Update local state to reflect the change immediately
      setVoterProfile(prev => prev ? { ...prev, has_voted: true } : null)

      // Check if user has voted for all positions
      const allPositions = positions.length
      const userVotes = positions.filter(p => p.user_vote).length + 1

      console.log('Vote progress:', { userVotes, allPositions, votedForAllPositions: userVotes === allPositions })

      if (userVotes === allPositions) {
        console.log('Voter has completed all positions!')
      }

      // Refresh data by refetching user votes
      if (voterProfile) {
        const { data: updatedVotes } = await supabase
          .from('election_votes')
          .select('*')
          .eq('voter_id', voterProfile.id)
        
        if (updatedVotes) {
          const updatedPositions = positions.map(position => ({
            ...position,
            user_vote: updatedVotes.find(vote => vote.position_id === position.id)
          }))
          setPositions(updatedPositions)
        }
      }
      
      toast.success('Vote submitted successfully!')
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Error submitting vote. Please try again.')
    } finally {
      setVoting(null)
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) return // Prevent double-clicks
    
    try {
      setIsLoggingOut(true)
      toast.loading('Logging out...', { id: 'voter-logout-toast' })
      
      // Clear any ongoing operations
      setLoading(false)
      setVoting(null)
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Voter logout error:', error)
        toast.error(`Logout failed: ${error.message}`, { id: 'voter-logout-toast' })
        return
      }
      
      // Clear local state
      setVoterProfile(null)
      setPositions([])
      setElectionSettings(null)
      
      toast.success('Logged out successfully', { id: 'voter-logout-toast' })
      
      // Small delay to show success message before calling parent logout
      setTimeout(() => {
        onLogout()
      }, 500)
      
    } catch (error) {
      console.error('Unexpected voter logout error:', error)
      toast.error('Logout failed. Please try refreshing the page.', { id: 'voter-logout-toast' })
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-400 animate-ping mx-auto"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Loading Election Data
            </h2>
            <p className="text-slate-600">Please wait while we prepare your voting experience...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!electionSettings?.is_voting_open) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-xl border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    PAMET Election 2025 - Results
                  </h1>
                  <p className="text-slate-600 flex items-center space-x-2 text-sm sm:text-base mt-1">
                    <UserCheck className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Welcome, {voterProfile?.first_name} {voterProfile?.last_name}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-3">
                {onBackToAdmin && (
                  <button
                    onClick={onBackToAdmin}
                    className="group flex items-center space-x-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg text-sm font-medium"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">← Admin</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`group flex items-center space-x-2 text-white ${
                    isLoggingOut 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-500 hover:bg-red-600 transform hover:scale-105'
                  } px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium min-w-[100px] justify-center`}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span>Logout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Voting Closed Notice */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="text-center">
                <p className="text-red-700 font-bold text-base sm:text-lg">
                  🔴 Voting Period Has Ended
                </p>
                <p className="text-red-600 text-xs sm:text-sm mt-1">
                  Thank you for participating! Here are the official results:
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Election Results */}
          <div className="space-y-6 sm:space-y-8">
            {positions.map((position, positionIndex) => {
              const candidateVotes = position.candidates.reduce((sum, candidate) => sum + (candidate.vote_count || 0), 0)
              const abstainVotes = position.abstain_count || 0
              const totalVotes = candidateVotes + abstainVotes
              
              // Calculate participation rate properly - using actual voter count from database
              const participationRate = totalEligibleVoters > 0 ? Math.round((totalVotes / totalEligibleVoters) * 100) : 0
              
              return (
                <div key={position.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-200">
                    <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                          <span className="text-white font-bold text-xs sm:text-sm">{positionIndex + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-800 truncate">{position.title}</h3>
                          <p className="text-slate-600 flex items-center space-x-2 text-xs sm:text-sm">
                            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{position.candidates.length} candidates • {totalVotes} votes ({abstainVotes} abstain)</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-xs sm:text-sm text-slate-500">Participation Rate</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-800">
                          {participationRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-8">
                    <div className="space-y-4 sm:space-y-6">
                      {position.candidates
                        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0)) // Sort by vote count descending
                        .map((candidate, index) => {
                          const voteCount = candidate.vote_count || 0
                          const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100) : 0
                          const isWinner = index === 0 && voteCount > 0
                          
                          const getRankGradient = (rank: number) => {
                            switch (rank) {
                              case 0: return 'from-yellow-400 to-amber-500' // Gold
                              case 1: return 'from-slate-300 to-slate-400' // Silver
                              case 2: return 'from-orange-400 to-orange-500' // Bronze
                              default: return 'from-slate-200 to-slate-300'
                            }
                          }
                          
                          const getRankEmoji = (rank: number) => {
                            switch (rank) {
                              case 0: return '🥇'
                              case 1: return '🥈'
                              case 2: return '🥉'
                              default: return '🏅'
                            }
                          }
                          
                          return (
                            <div 
                              key={candidate.id} 
                              className={`group relative rounded-2xl border-2 p-4 sm:p-6 transition-all duration-300 transform hover:scale-102 ${
                                isWinner 
                                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg' 
                                  : 'border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 hover:shadow-lg'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                                <div className="flex items-center space-x-4 sm:space-x-6 flex-1 min-w-0">
                                  <div className="relative flex-shrink-0">
                                    <CandidatePhoto 
                                      photoUrl={candidate.photo_url} 
                                      firstName={candidate.first_name}
                                      lastName={candidate.last_name}
                                      size="lg"
                                      className="w-12 h-12 sm:w-16 sm:h-16 shadow-lg border-4 border-white"
                                    />
                                    <div className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r ${getRankGradient(index)} rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
                                      <span className="text-xs sm:text-sm">{getRankEmoji(index)}</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                                      <h4 className={`font-bold text-base sm:text-xl ${isWinner ? 'text-emerald-900' : 'text-slate-900'} truncate`}>
                                        {candidate.first_name} {candidate.last_name}
                                      </h4>
                                      {isWinner && (
                                        <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-100 to-green-200 text-emerald-800 border border-emerald-300 self-start">
                                          <Trophy className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                          WINNER
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-xs sm:text-sm mb-3 sm:mb-4 ${isWinner ? 'text-emerald-700' : 'text-slate-600'} line-clamp-2`}>
                                      {candidate.platform || 'No platform provided'}
                                    </p>
                                    
                                    {/* Enhanced Vote Progress Bar */}
                                    <div className="space-y-1 sm:space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">Vote Share</span>
                                        <span className="text-xs sm:text-sm font-bold text-slate-800">{percentage.toFixed(1)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-3 sm:h-4 overflow-hidden">
                                        <div 
                                          className={`h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out ${
                                            isWinner 
                                              ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                                              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-center sm:text-right sm:ml-6">
                                  <div className={`bg-gradient-to-r ${isWinner ? 'from-emerald-500 to-green-600' : 'from-blue-500 to-indigo-600'} text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow`}>
                                    <div className="text-xl sm:text-3xl font-bold">{voteCount}</div>
                                    <div className="text-xs text-white/80 flex items-center justify-center">
                                      <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                      votes
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      
                      {/* Display Abstain Votes */}
                      {abstainVotes > 0 && (
                        <div className="group relative rounded-2xl border-2 border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 transition-all duration-300">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                            <div className="flex items-center space-x-4 sm:space-x-6 flex-1 min-w-0">
                              <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                                  <span className="text-gray-600 font-bold text-xs sm:text-sm">ABSTAIN</span>
                                </div>
                                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                  <span className="text-xs sm:text-sm">🤐</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3 mb-2">
                                  <h4 className="font-bold text-base sm:text-xl text-gray-700 truncate">
                                    Abstain Votes
                                  </h4>
                                </div>
                                <p className="text-xs sm:text-sm mb-3 sm:mb-4 text-gray-600">
                                  Voters who chose not to vote for any candidate in this position
                                </p>
                                
                                {/* Abstain Vote Progress Bar */}
                                <div className="space-y-1 sm:space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs sm:text-sm font-medium text-gray-700">Vote Share</span>
                                    <span className="text-xs sm:text-sm font-bold text-gray-800">
                                      {totalVotes > 0 ? ((abstainVotes / totalVotes) * 100).toFixed(1) : 0}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
                                    <div 
                                      className="h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-gray-400 to-gray-500"
                                      style={{ width: `${totalVotes > 0 ? ((abstainVotes / totalVotes) * 100) : 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center sm:text-right sm:ml-6">
                              <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                                <div className="text-xl sm:text-3xl font-bold">{abstainVotes}</div>
                                <div className="text-xs text-white/80 flex items-center justify-center">
                                  <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                  abstain
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Enhanced Summary Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-8 mt-6 sm:mt-8">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-800">Election Summary</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-3 sm:p-6 border border-blue-100 text-center group hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-blue-700">{positions.length}</div>
                <div className="text-xs sm:text-sm text-blue-600 font-medium">Positions</div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-3 sm:p-6 border border-emerald-100 text-center group hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-emerald-700">
                  {positions.reduce((sum, pos) => sum + pos.candidates.length, 0)}
                </div>
                <div className="text-xs sm:text-sm text-emerald-600 font-medium">Candidates</div>
              </div>
              <div className="bg-gradient-to-r from-purple-50 to-purple-50 rounded-2xl p-3 sm:p-6 border border-purple-100 text-center group hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Award className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-purple-700">
                  {positions.reduce((sum, pos) => 
                    sum + pos.candidates.reduce((subSum, candidate) => subSum + (candidate.vote_count || 0), 0), 0
                  )}
                </div>
                <div className="text-xs sm:text-sm text-purple-600 font-medium">Candidate Votes</div>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-gray-50 rounded-2xl p-3 sm:p-6 border border-gray-200 text-center group hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-gray-700">
                  {positions.reduce((sum, pos) => sum + (pos.abstain_count || 0), 0)}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 font-medium">Abstain Votes</div>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3 sm:p-6 border border-amber-100 text-center group hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="text-xl sm:text-3xl font-bold text-amber-700">
                  {positions.reduce((sum, pos) => 
                    sum + pos.candidates.reduce((subSum, candidate) => subSum + (candidate.vote_count || 0), 0) + (pos.abstain_count || 0), 0
                  )}
                </div>
                <div className="text-xs sm:text-sm text-amber-600 font-medium">Total Votes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const completedVotes = positions.filter(p => p.user_vote).length
  const totalPositions = positions.length
  const hasCompletedVoting = completedVotes === totalPositions

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                  <Trophy className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  PAMET Election 2025
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 ml-11 truncate">
                Welcome, {voterProfile?.first_name} {voterProfile?.last_name}
              </p>
            </div>
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <div className="text-sm text-gray-600 text-center sm:text-left bg-gray-50 px-3 py-2 rounded-lg">
                Progress: {completedVotes}/{totalPositions} positions
              </div>
              <div className="flex items-center justify-center space-x-3">
                {onBackToAdmin && (
                  <button
                    onClick={onBackToAdmin}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    <span>← Admin</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`flex items-center space-x-2 text-white ${
                    isLoggingOut 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-500 hover:bg-red-600'
                  } px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium shadow-md min-w-[100px] justify-center`}
                >
                  {isLoggingOut ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                      <span>Logging out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Progress */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Voting Progress</h2>
            <div className="text-xs sm:text-sm text-gray-600">
              {completedVotes} of {totalPositions} completed
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedVotes / totalPositions) * 100}%` }}
            />
          </div>
          {hasCompletedVoting && (
            <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start sm:items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                <p className="text-green-800 font-medium text-sm sm:text-base">
                  Congratulations! You have completed voting for all positions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Positions */}
        <div className="space-y-6 sm:space-y-8">
          {positions.map((position) => {
            const hasVoted = !!position.user_vote
            const userVote = position.user_vote

            return (
              <div key={position.id} className="bg-white rounded-lg shadow-sm">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                        {position.title}
                      </h3>
                    </div>
                    {hasVoted && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
                        <span className="text-sm font-medium">Voted</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {position.candidates.map((candidate) => {
                      const isSelected = userVote?.candidate_id === candidate.id

                      return (
                        <div 
                          key={candidate.id} 
                          className={`border rounded-lg p-3 sm:p-4 transition-all ${
                            isSelected 
                              ? 'border-green-500 bg-green-50' 
                              : hasVoted 
                                ? 'border-gray-200 bg-gray-50' 
                                : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                          }`}
                        >
                          <div className="flex items-start space-x-3 sm:space-x-4 mb-3">
                            <div className="flex-shrink-0">
                              <CandidatePhoto 
                                photoUrl={candidate.photo_url}
                                firstName={candidate.first_name}
                                lastName={candidate.last_name}
                                size="lg"
                                className="w-16 h-16 sm:w-20 sm:h-20"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                                  {candidate.first_name} {candidate.last_name}
                                </h4>
                                {isSelected && (
                                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 ml-2" />
                                )}
                              </div>
                              
                              {candidate.platform && (
                                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-3">
                                  {candidate.platform}
                                </p>
                              )}
                            </div>
                          </div>

                          {!hasVoted && (
                            <button
                              onClick={() => handleVote(position.id, candidate.id)}
                              disabled={voting !== null}
                              className={`w-full py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base ${
                                voting !== null
                                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {voting?.positionId === position.id && voting?.candidateId === candidate.id ? (
                                <div className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                                  Voting...
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <Vote className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                  Vote
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Abstain Option */}
                    {!hasVoted && (
                      <div 
                        key={`abstain-${position.id}`}
                        className={`border rounded-lg p-3 sm:p-4 transition-all ${
                          userVote?.candidate_id === null 
                            ? 'border-yellow-500 bg-yellow-50' 
                            : 'border-gray-200 hover:border-yellow-500 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3 sm:space-x-4 mb-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full flex items-center justify-center border-2 border-yellow-300 flex-shrink-0">
                            <span className="text-yellow-600 font-bold text-xs sm:text-sm">ABSTAIN</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                                Abstain from Voting
                              </h4>
                              {userVote?.candidate_id === null && (
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0 ml-2" />
                              )}
                            </div>
                            
                            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                              Choose this option if you do not wish to vote for any candidate in this position.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleVote(position.id, null)}
                          disabled={voting !== null}
                          className={`w-full py-2 px-3 sm:px-4 rounded-lg transition-colors text-sm sm:text-base ${
                            voting !== null
                              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                              : 'bg-yellow-600 text-white hover:bg-yellow-700'
                          }`}
                        >
                          {voting?.positionId === position.id && voting?.candidateId === null ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Vote className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Abstain
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
