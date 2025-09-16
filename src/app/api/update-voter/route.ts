import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

export async function PUT(request: NextRequest) {
  try {
    const { voter_id, email, password, first_name, last_name, member_id } = await request.json()

    // Get the voter profile to find the auth user ID
    const { data: voterProfile, error: profileError } = await supabaseAdmin
      .from('voter_profiles')
      .select('user_id, email')
      .eq('id', voter_id)
      .single()

    if (profileError || !voterProfile) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 })
    }

    // Update voter profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('voter_profiles')
      .update({
        email,
        first_name,
        last_name,
        member_id: member_id || null
      })
      .eq('id', voter_id)

    if (updateProfileError) {
      return NextResponse.json({ error: updateProfileError.message }, { status: 400 })
    }

    // Update auth user if email changed or password provided
    const authUpdates: { email?: string; password?: string } = {}
    
    if (email !== voterProfile.email) {
      authUpdates.email = email
    }
    
    // Only update password if it's provided and not empty
    if (password && password.trim() !== '') {
      authUpdates.password = password
    }

    // Only make auth update if there are changes
    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        voterProfile.user_id,
        authUpdates
      )

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Voter updated successfully'
    })

  } catch (error) {
    console.error('Error in update-voter API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
