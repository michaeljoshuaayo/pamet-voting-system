-- Create a secure function to handle voting and status update atomically
-- This ensures voter status is ALWAYS updated when a vote is cast

-- First, create the vote submission function
CREATE OR REPLACE FUNCTION submit_vote(
  p_voter_id uuid,
  p_position_id uuid,
  p_candidate_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_result json;
  existing_vote_count integer;
BEGIN
  -- Check if voter already voted for this position
  SELECT COUNT(*) INTO existing_vote_count
  FROM election_votes
  WHERE voter_id = p_voter_id AND position_id = p_position_id;

  IF existing_vote_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Already voted for this position'
    );
  END IF;

  -- Insert the vote
  INSERT INTO election_votes (voter_id, position_id, candidate_id)
  VALUES (p_voter_id, p_position_id, p_candidate_id);

  -- ALWAYS update voter status to has_voted = true after ANY vote
  UPDATE voter_profiles 
  SET has_voted = true 
  WHERE id = p_voter_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Vote submitted and voter status updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION submit_vote(uuid, uuid, uuid) TO authenticated;

-- Also create a function to check voting status
CREATE OR REPLACE FUNCTION get_voter_status(p_voter_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voter_info json;
BEGIN
  SELECT json_build_object(
    'voter_id', vp.id,
    'has_voted', vp.has_voted,
    'votes_cast', COUNT(ev.id),
    'is_consistent', (COUNT(ev.id) > 0) = vp.has_voted
  ) INTO voter_info
  FROM voter_profiles vp
  LEFT JOIN election_votes ev ON vp.id = ev.voter_id
  WHERE vp.id = p_voter_id
  GROUP BY vp.id, vp.has_voted;

  RETURN voter_info;
END;
$$;

GRANT EXECUTE ON FUNCTION get_voter_status(uuid) TO authenticated;