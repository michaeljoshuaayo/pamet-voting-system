// PAMET Sorsogon Chapter Election Data
export const pametPositions = [
  { id: '1', title: 'President', description: 'Chief Executive Officer of the chapter', order_index: 1, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Vice President', description: 'Second in command and support to the President', order_index: 2, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '3', title: 'Secretary', description: 'Records keeper and correspondence manager', order_index: 3, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '4', title: 'Auditor', description: 'Financial auditor and compliance officer', order_index: 4, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '5', title: 'Treasurer', description: 'Financial manager and budget oversight', order_index: 5, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '6', title: 'Public Information Officer - JUCASOM', description: 'Communications and public relations for Junior Chamber of Sonographers', order_index: 6, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '7', title: 'Public Information Officer - BIMS', description: 'Communications and public relations for Biomedical Imaging and Medical Sonography', order_index: 7, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '8', title: 'Public Information Officer - GUIPRIBAR', description: 'Communications and public relations for Guild of Professional Radiologic Technologists', order_index: 8, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '9', title: 'Public Information Officer - CSOLAR', description: 'Communications and public relations for Council of Licensed Radiologic Technologists', order_index: 9, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const pametCandidates = [
  // President
  { id: '1', position_id: '1', first_name: 'Aileen', last_name: 'Lopez', platform: 'Leadership and innovation for PAMET Sorsogon Chapter', photo_url: null, vote_count: 15, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Vice President
  { id: '2', position_id: '2', first_name: 'Claire', last_name: 'Fiestado', platform: 'Supporting excellence in medical technology', photo_url: null, vote_count: 12, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', position_id: '2', first_name: 'Joseph', last_name: 'Gillego', platform: 'Advancing professional development', photo_url: null, vote_count: 8, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Secretary
  { id: '4', position_id: '3', first_name: 'Maria Theresa', last_name: 'Baylon', platform: 'Efficient record keeping and communication', photo_url: null, vote_count: 10, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '5', position_id: '3', first_name: 'Arnold Kenneth', last_name: 'Borromeo', platform: 'Organized documentation and correspondence', photo_url: null, vote_count: 14, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Auditor
  { id: '6', position_id: '4', first_name: 'Evelyn', last_name: 'Lee', platform: 'Financial transparency and accountability', photo_url: null, vote_count: 18, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Treasurer
  { id: '7', position_id: '5', first_name: 'Marie Gelyne', last_name: 'Garalde', platform: 'Sound financial management and planning', photo_url: null, vote_count: 16, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - JUCASOM
  { id: '8', position_id: '6', first_name: 'Rean', last_name: 'Gracilla', platform: 'Junior Chamber representative and communications', photo_url: null, vote_count: 7, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '9', position_id: '6', first_name: 'Norlane Jane', last_name: 'Hao', platform: 'Advancing junior professionals communications', photo_url: null, vote_count: 11, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - BIMS
  { id: '10', position_id: '7', first_name: 'Mernadith', last_name: 'Garcera', platform: 'Biomedical imaging communications and outreach', photo_url: null, vote_count: 9, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '11', position_id: '7', first_name: 'Jan Albert', last_name: 'Apuhin', platform: 'Medical sonography communications advancement', photo_url: null, vote_count: 13, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - GUIPRIBAR
  { id: '12', position_id: '8', first_name: 'Patrick Lorenz', last_name: 'Garcera', platform: 'Guild communications and advocacy', photo_url: null, vote_count: 6, is_active: true, created_at: '2024-01-01T00:00:00Z' },
  
  // Public Information Officer - CSOLAR
  { id: '13', position_id: '9', first_name: 'Ivy Gail', last_name: 'Bajamundi', platform: 'Council communications and professional standards', photo_url: null, vote_count: 20, is_active: true, created_at: '2024-01-01T00:00:00Z' },
]

export const pametVoters = [
  { id: '1', user_id: 'user1', email: 'admin@pamet.com', first_name: 'Admin', last_name: 'User', member_id: 'ADMIN001', is_admin: true, has_voted: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', user_id: 'user2', email: 'john.doe@pamet.com', first_name: 'John', last_name: 'Doe', member_id: 'PMT001', is_admin: false, has_voted: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '3', user_id: 'user3', email: 'jane.smith@pamet.com', first_name: 'Jane', last_name: 'Smith', member_id: 'PMT002', is_admin: false, has_voted: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '4', user_id: 'user4', email: 'maria.garcia@pamet.com', first_name: 'Maria', last_name: 'Garcia', member_id: 'PMT003', is_admin: false, has_voted: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '5', user_id: 'user5', email: 'robert.lee@pamet.com', first_name: 'Robert', last_name: 'Lee', member_id: 'PMT004', is_admin: false, has_voted: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
]

export const pametElectionSettings = {
  id: '1',
  is_voting_open: true,
  voting_start_time: '2024-01-01T00:00:00Z',
  voting_end_time: '2024-12-31T23:59:59Z',
  election_title: 'PAMET Sorsogon Chapter Election 2024',
  updated_at: '2024-01-01T00:00:00Z',
  updated_by: 'admin@pamet.com'
}
