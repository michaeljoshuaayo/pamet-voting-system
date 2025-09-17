import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST() {
  try {
    // Clear all votes in a transaction
    const { error: clearVotesError } = await supabaseAdmin
      .from('election_votes')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

    if (clearVotesError) {
      console.error('Error clearing votes:', clearVotesError)
      throw clearVotesError
    }

    // Reset candidate vote counts
    const { error: resetCandidatesError } = await supabaseAdmin
      .from('candidates')
      .update({ vote_count: 0 })
      .gte('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (resetCandidatesError) {
      console.error('Error resetting candidate counts:', resetCandidatesError)
      throw resetCandidatesError
    }

    // Reset voter has_voted status
    const { error: resetVotersError } = await supabaseAdmin
      .from('voter_profiles')
      .update({ has_voted: false })
      .eq('is_admin', false)

    if (resetVotersError) {
      console.error('Error resetting voter status:', resetVotersError)
      throw resetVotersError
    }

    // Get verification counts
    const [votesCount, votersVotedCount, candidateVotesSum] = await Promise.all([
      supabaseAdmin.from('election_votes').select('id', { count: 'exact' }),
      supabaseAdmin.from('voter_profiles').select('id', { count: 'exact' }).eq('has_voted', true),
      supabaseAdmin.from('candidates').select('vote_count').then(res => 
        res.data?.reduce((sum, candidate) => sum + (candidate.vote_count || 0), 0) || 0
      )
    ])

    console.log('Votes cleared successfully:', {
      remaining_votes: votesCount.count || 0,
      voters_who_voted: votersVotedCount.count || 0,
      total_candidate_votes: candidateVotesSum
    })

    return NextResponse.json({ 
      success: true, 
      message: 'All votes cleared successfully',
      verification: {
        remaining_votes: votesCount.count || 0,
        voters_who_voted: votersVotedCount.count || 0,
        total_candidate_votes: candidateVotesSum
      }
    })

  } catch (error) {
    console.error('Error in clear-votes API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}