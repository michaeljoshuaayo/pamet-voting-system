// PAMET Sorsogon Chapter Election Data
export const pametPositions = [
  { id: '1', title: 'President', description: '', order_index: 1, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Vice President', description: '', order_index: 2, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '3', title: 'Secretary', description: '', order_index: 3, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '4', title: 'Auditor', description: '', order_index: 4, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '5', title: 'Treasurer', description: '', order_index: 5, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '6', title: 'Public Information Officer - JUCASOM', description: '', order_index: 6, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '7', title: 'Public Information Officer - BIMS', description: '', order_index: 7, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '8', title: 'Public Information Officer - GUIPRIBAR', description: '', order_index: 8, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '9', title: 'Public Information Officer - CSOLAR', description: '', order_index: 9, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const pametCandidates = [
  // President
  { id: '1', position_id: '1', first_name: 'Aileen', last_name: 'Lopez', platform: 'Metro Health Specialists Hospital', photo_url: '/candidates/Aileen.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Vice President
  { id: '2', position_id: '2', first_name: 'Claire', last_name: 'Carrascal', platform: 'Sorsogon Provincial Hospital-FHS', photo_url: '/candidates/Claire.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', position_id: '2', first_name: 'Joseph', last_name: 'Gillego', platform: 'Metro Health Specialists Hospital Inc.', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Secretary
  { id: '4', position_id: '3', first_name: 'Maria Theresa', last_name: 'Baylon', platform: 'RHU Barcelona', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '5', position_id: '3', first_name: 'Arnold Kenneth', last_name: 'Borromeo', platform: 'Sorsogon Provincial Hospital', photo_url: '/candidates/Arnold.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Auditor
  { id: '6', position_id: '4', first_name: 'Evelyn', last_name: 'Lee', platform: 'Irosin District Hospital', photo_url: '/candidates/Evelyn.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Treasurer
  { id: '7', position_id: '5', first_name: 'Mairie Gelyne', last_name: 'Garalde', platform: 'Gubat Distict Hospital/SPH', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - JUCASOM
  { id: '8', position_id: '6', first_name: 'Rean', last_name: 'Gracilla', platform: 'RHU Juban', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '9', position_id: '6', first_name: 'Norlane Jane', last_name: 'Hao', platform: 'Donsol District Hospital/SPH', photo_url: '/candidates/Norlane.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - BIMS
  { id: '10', position_id: '7', first_name: 'Mernadith', last_name: 'Garcera', platform: 'Matnog Medicare Hospital', photo_url: '/candidates/Meredith.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '11', position_id: '7', first_name: 'Jan Albert', last_name: 'Apuhin', platform: 'Irosin District Hospital', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - GUIPRIBAR
  { id: '12', position_id: '8', first_name: 'Patrick Lorenz', last_name: 'Garcera', platform: 'Gubat Distict Hospital', photo_url: '/candidates/Patrick.jpg', vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - CSOLAR
  { id: '13', position_id: '9', first_name: 'Ivy Gail', last_name: 'Bajamundi', platform: 'Castilla District Hospital', photo_url: null, vote_count: 0, is_active: true, created_at: '2024-01-01T00:00:00Z' },
]

// Mock data removed - using real Supabase database now
// Real voter data will come from the 115 PAMET members in pamet-members-complete.sql
// Real election settings will be managed through the database

// Fallback exports for components that still reference them
export const pametVoters: {
  id: string
  email: string
  first_name: string
  last_name: string
  member_id: string
  has_voted: boolean
  created_at: string
}[] = []

export const pametElectionSettings = {
  id: '1',
  election_name: 'PAMET Sorsogon Chapter Election 2025',
  election_description: 'Annual election for PAMET Sorsogon Chapter officers',
  start_date: '2025-01-01T00:00:00Z',
  end_date: '2025-12-31T23:59:59Z',
  is_active: true,
  allow_abstain: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
}
