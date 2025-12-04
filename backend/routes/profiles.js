// Profile routes for Lookbook API
// Following test-pilot-server pattern

const express = require('express');
const router = express.Router();
const profileQueries = require('../queries/profileQueries');
const { pool } = require('../db/dbConfig');

// Simple in-memory cache for profiles (5 minute TTL)
const cache = {
  profiles: null,
  profilesTimestamp: 0,
  filters: null,
  filtersTimestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// Helper to check if cache is valid
function isCacheValid(timestamp) {
  return Date.now() - timestamp < cache.TTL;
}

// =====================================================
// GET /api/profiles
// Get all profiles with optional filtering
// =====================================================

router.get('/', async (req, res) => {
  try {
    const { search, skills, openToWork, industries, limit, offset, page } = req.query;
    
    // If no filters, no pagination, and cache is valid, return cached data
    // BUT: ignore cache if _t (timestamp) parameter is present (cache-busting)
    const hasFilters = search || skills || openToWork || industries || limit || offset || page;
    const hasCacheBuster = req.query._t; // Cache-busting parameter
    if (!hasFilters && !hasCacheBuster && cache.profiles && isCacheValid(cache.profilesTimestamp)) {
      // Add cache headers for browser caching
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      return res.json(cache.profiles);
    }
    
    // Parse filters
    const filters = {
      search,
      skills: skills ? (Array.isArray(skills) ? skills : skills.split(',')) : undefined,
      industries: industries ? (Array.isArray(industries) ? industries : industries.split(',')) : undefined,
      openToWork: openToWork === 'true' ? true : openToWork === 'false' ? false : undefined,
      limit: parseInt(limit) || 50,
      offset: page ? (parseInt(page) - 1) * (parseInt(limit) || 50) : parseInt(offset) || 0
    };
    
    const result = await profileQueries.getAllProfiles(filters);
    
    const response = {
      success: true,
      data: result.profiles,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        page: Math.floor(result.offset / result.limit) + 1,
        totalPages: Math.ceil(result.total / result.limit)
      }
    };
    
    // Cache the response if no filters
    if (!hasFilters) {
      cache.profiles = response;
      cache.profilesTimestamp = Date.now();
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else {
      // Shorter cache for filtered results
      res.set('Cache-Control', 'public, max-age=60'); // 1 minute
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profiles',
      message: error.message 
    });
  }
});

// =====================================================
// GET /api/profiles/filters
// Get available filter options (skills, industries)
// =====================================================

router.get('/filters', async (req, res) => {
  try {
    // Check cache first
    if (cache.filters && isCacheValid(cache.filtersTimestamp)) {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      return res.json(cache.filters);
    }
    
    const [skills, industries] = await Promise.all([
      profileQueries.getAllSkills(),
      profileQueries.getAllIndustries()
    ]);
    
    const response = {
      success: true,
      data: {
        skills,
        industries
      }
    };
    
    // Cache the filters
    cache.filters = response;
    cache.filtersTimestamp = Date.now();
    
    // Set cache headers
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch filter options',
      message: error.message 
    });
  }
});

// =====================================================
// GET /api/profiles/:slug
// Get single profile by slug
// =====================================================

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const profile = await profileQueries.getProfileBySlug(slug);
    
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found' 
      });
    }
    
    // Set cache headers for individual profiles (longer cache)
    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch profile',
      message: error.message 
    });
  }
});

// =====================================================
// POST /api/profiles
// Create new profile
// TODO: Add authentication middleware
// =====================================================

router.post('/', async (req, res) => {
  try {
    const profileData = req.body;
    
    // Basic validation
    if (!profileData.slug) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: slug'
      });
    }

    // Check if slug already exists before proceeding
    const normalizedSlug = profileData.slug.trim().toLowerCase();
    const existingProfileCheck = await pool.query(
      'SELECT id, slug FROM lookbook_profiles WHERE slug = $1 LIMIT 1',
      [normalizedSlug]
    );
    if (existingProfileCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `A profile with the slug "${normalizedSlug}" already exists. Please use a different slug.`
      });
    }
    
    // If no userId provided, try to find or create a user
    let userId = profileData.userId;
    let nameUpdateFailed = false; // Track if name update failed
    if (!userId) {
      // Extract name from profile data or use slug as fallback
      const nameParts = profileData.name ? profileData.name.split(' ') : [profileData.slug, ''];
      const firstName = nameParts[0] || profileData.slug;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Generate email
      const email = profileData.email || `${profileData.slug}@pursuit.org`;
      
      // First, try to find existing user by email
      const findUserQuery = 'SELECT user_id FROM users WHERE email = $1 LIMIT 1';
      const existingUser = await pool.query(findUserQuery, [email]);
      
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].user_id;
        console.log('Found existing user with ID:', userId);
        
        // Check if this user already has a profile
        const existingProfileCheck = await pool.query(
          'SELECT id FROM lookbook_profiles WHERE user_id = $1 LIMIT 1',
          [userId]
        );
        if (existingProfileCheck.rows.length > 0) {
          console.warn('User already has a profile, will need to create new user or use different user');
          userId = null; // Reset to trigger user creation or fallback
        }
      }
      
      if (!userId) {
        // Also try to find by name (first_name + last_name) as fallback
        const findByNameQuery = `
          SELECT u.user_id 
          FROM users u 
          LEFT JOIN lookbook_profiles p ON u.user_id = p.user_id 
          WHERE u.first_name = $1 AND u.last_name = $2 AND p.id IS NULL 
          LIMIT 1
        `;
        const userByName = await pool.query(findByNameQuery, [firstName, lastName]);
        
        if (userByName.rows.length > 0) {
          userId = userByName.rows[0].user_id;
          console.log('Found existing user by name with ID:', userId, '(without existing profile)');
        } else {
          // Try to create a new user, but handle permission errors gracefully
          try {
            const userQuery = `
              INSERT INTO users (first_name, last_name, email, password_hash, role, cohort)
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING user_id
            `;
            const userResult = await pool.query(userQuery, [
              firstName,
              lastName,
              email,
              'placeholder_hash', // Placeholder password hash
              'builder',
              '2024'
            ]);
            userId = userResult.rows[0].user_id;
            console.log('Created new user with ID:', userId);
          } catch (userError) {
            console.error('Error creating user:', userError);
            console.error('Error code:', userError.code);
            console.error('Error message:', userError.message);
            
            // If it's a permission error, use an existing user as fallback
            if (userError.code === '42501' || userError.message.includes('permission denied')) {
              console.warn('Cannot create user due to permissions, using fallback user');
              
              // Try to find any user with matching first name that doesn't have a profile
              const findSimilarQuery = `
                SELECT u.user_id 
                FROM users u 
                LEFT JOIN lookbook_profiles p ON u.user_id = p.user_id 
                WHERE u.first_name = $1 AND p.id IS NULL 
                LIMIT 1
              `;
              const similarUser = await pool.query(findSimilarQuery, [firstName]);
              
              if (similarUser.rows.length > 0) {
                userId = similarUser.rows[0].user_id;
                console.log('Using similar user with ID:', userId, '(without existing profile)');
                
                // Try to update the user's name to match the profile
                try {
                  const updateResult = await pool.query(
                    'UPDATE users SET first_name = $1, last_name = $2 WHERE user_id = $3 RETURNING first_name, last_name',
                    [firstName, lastName, userId]
                  );
                  console.log('✅ Updated similar user name to:', updateResult.rows[0].first_name, updateResult.rows[0].last_name);
                } catch (updateError) {
                  console.error('❌ Could not update similar user name:', updateError.code, updateError.message);
                  console.error('❌ Profile will be created but name may not match');
                  nameUpdateFailed = true; // Flag that name update failed
                }
              } else {
                // As a last resort, find a user that doesn't already have a profile
                // This allows profile creation to proceed even without user creation permissions
                const fallbackUserQuery = `
                  SELECT u.user_id 
                  FROM users u 
                  LEFT JOIN lookbook_profiles p ON u.user_id = p.user_id 
                  WHERE p.id IS NULL 
                  ORDER BY u.user_id 
                  LIMIT 1
                `;
                const fallbackUser = await pool.query(fallbackUserQuery);
                
                if (fallbackUser.rows.length > 0) {
                  userId = fallbackUser.rows[0].user_id;
                  console.log('Using fallback user with ID:', userId, '(user without existing profile)');
                  
                  // Update the fallback user's name to match the profile name
                  try {
                    const updateResult = await pool.query(
                      'UPDATE users SET first_name = $1, last_name = $2 WHERE user_id = $3 RETURNING first_name, last_name',
                      [firstName, lastName, userId]
                    );
                    console.log('✅ Updated fallback user name to:', updateResult.rows[0].first_name, updateResult.rows[0].last_name);
                  } catch (updateError) {
                    console.error('❌ CRITICAL: Could not update user name:', updateError.code, updateError.message);
                    console.error('❌ Profile will be created with user ID', userId, 'but name will remain as original user name');
                    console.error('❌ This is due to missing UPDATE permission on users table');
                    nameUpdateFailed = true; // Flag that name update failed
                    // Continue anyway - profile will be created with existing user name
                  }
                } else {
                  return res.status(500).json({
                    success: false,
                    error: 'No users available',
                    message: 'Cannot create profile: No users exist in the database and user creation is not permitted. Please contact your database administrator.'
                  });
                }
              }
            } else if (userError.code === '23505') {
              // For duplicate email errors, try to find the user
              const findUserQuery = 'SELECT user_id FROM users WHERE email = $1 LIMIT 1';
              const foundUser = await pool.query(findUserQuery, [email]);
              if (foundUser.rows.length > 0) {
                userId = foundUser.rows[0].user_id;
                console.log('User already exists, using existing user ID:', userId);
              } else {
                throw new Error(`Failed to create user: ${userError.message}`);
              }
            } else {
              throw new Error(`Failed to create user: ${userError.message}`);
            }
          }
        }
      }
    }
    
    // Normalize field names: convert snake_case to camelCase
    // Handle both formats for compatibility
    // Ensure arrays are always arrays (not null/undefined)
    const normalizedData = {
      userId,
      slug: profileData.slug.trim().toLowerCase(), // Ensure slug is trimmed and lowercase
      title: profileData.title || null,
      bio: profileData.bio || null,
      skills: Array.isArray(profileData.skills) ? profileData.skills : [],
      industryExpertise: Array.isArray(profileData.industryExpertise) ? profileData.industryExpertise : (Array.isArray(profileData.industry_expertise) ? profileData.industry_expertise : []),
      openToWork: profileData.openToWork !== undefined ? profileData.openToWork : (profileData.open_to_work !== undefined ? profileData.open_to_work : false),
      highlights: Array.isArray(profileData.highlights) ? profileData.highlights : [],
      photoUrl: profileData.photoUrl || profileData.photo_url || null,
      photoLqip: profileData.photoLqip || profileData.photo_lqip || null,
      linkedinUrl: profileData.linkedinUrl || profileData.linkedin_url || null,
      githubUrl: profileData.githubUrl || profileData.github_url || null,
      websiteUrl: profileData.websiteUrl || profileData.website_url || null,
      xUrl: profileData.xUrl || profileData.x_url || null,
      featured: profileData.featured !== undefined ? profileData.featured : false
    };
    
    // Log the data being inserted for debugging
    console.log('Creating profile with data:', {
      userId: normalizedData.userId,
      slug: normalizedData.slug,
      skills: normalizedData.skills,
      industryExpertise: normalizedData.industryExpertise,
      highlights: normalizedData.highlights
    });
    
    const newProfile = await profileQueries.createProfile(normalizedData);
    
    // Invalidate cache
    cache.profiles = null;
    cache.filters = null;
    
    const response = {
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    };
    
    // Add warning if name update failed
    if (nameUpdateFailed) {
      response.warning = 'Profile created, but the name could not be updated due to database permissions. The profile may show a different name than entered. Please contact your database administrator to grant UPDATE permission on the users table.';
    }
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating profile:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    // Handle duplicate constraint errors
    if (error.code === '23505') {
      // Check if it's a duplicate email or slug
      const errorMessage = error.message || '';
      if (errorMessage.includes('email') || errorMessage.includes('users_email_key')) {
        return res.status(409).json({
          success: false,
          error: 'A user with this email already exists. Please use a different slug or provide a unique email.'
        });
      } else if (errorMessage.includes('slug') || errorMessage.includes('lookbook_profiles_slug_key')) {
        // Try to get the slug from the request to make the error more specific
        const slug = req.body?.slug || 'this slug';
        return res.status(409).json({
          success: false,
          error: `A profile with the slug "${slug}" already exists. Please use a different slug.`
        });
      } else if (errorMessage.includes('unique_user_lookbook_profile') || errorMessage.includes('unique_user_profile')) {
        return res.status(409).json({
          success: false,
          error: 'This user already has a profile'
        });
      }
      // Generic duplicate error
      return res.status(409).json({
        success: false,
        error: 'A record with this information already exists'
      });
    }
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user reference. Please ensure the user exists.'
      });
    }
    
    // Handle not null constraint errors
    if (error.code === '23502') {
      const column = error.column || 'unknown field';
      return res.status(400).json({
        success: false,
        error: `Missing required field: ${column}`
      });
    }
    
    // Include more details in development
    const errorResponse = {
      success: false,
      error: 'Failed to create profile',
      message: error.message
    };
    
    // Add detailed error info in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        column: error.column,
        stack: error.stack
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// =====================================================
// PUT /api/profiles/:slug
// Update profile
// TODO: Add authentication middleware
// =====================================================

router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;
    
    console.log('📝 Profile update request for slug:', slug);
    console.log('📝 Update data received:', Object.keys(updates));
    console.log('📝 Name in updates:', updates.name);
    
    // Separate experience from other updates
    const { experience, ...profileUpdates } = updates;
    
    // Normalize field names: convert snake_case to camelCase for updateProfile
    // The updateProfile function expects camelCase, but frontend sends snake_case
    const normalizedUpdates = {};
    const fieldMapping = {
      'industry_expertise': 'industryExpertise',
      'open_to_work': 'openToWork',
      'photo_url': 'photoUrl',
      'photo_lqip': 'photoLqip',
      'linkedin_url': 'linkedinUrl',
      'github_url': 'githubUrl',
      'website_url': 'websiteUrl',
      'x_url': 'xUrl'
    };
    
    Object.keys(profileUpdates).forEach(key => {
      // If it's a snake_case field that needs conversion, convert it
      if (fieldMapping[key]) {
        normalizedUpdates[fieldMapping[key]] = profileUpdates[key];
      } else {
        // Keep camelCase fields as-is, or convert to camelCase if needed
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        normalizedUpdates[camelKey] = profileUpdates[key];
      }
    });
    
    // Update the profile
    const updatedProfile = await profileQueries.updateProfile(slug, normalizedUpdates);
    
    if (!updatedProfile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found' 
      });
    }
    
    // If name is provided in updates, also update the user's name in the users table
    console.log('🔍 Checking if name update is needed. updates.name:', updates.name);
    if (updates.name) {
      console.log('📝 Name update requested:', updates.name);
      try {
        const nameParts = updates.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        console.log('📝 Parsed name - First:', firstName, 'Last:', lastName);
        
        // Get user_id from the updated profile (it should have user_id from RETURNING *)
        // If not available, fetch it separately
        let userId = updatedProfile.user_id;
        console.log('🔍 user_id from updatedProfile:', userId);
        console.log('🔍 updatedProfile keys:', Object.keys(updatedProfile || {}));
        
        if (!userId) {
          console.log('⚠️ user_id not in updatedProfile, fetching...');
          const profileWithUser = await profileQueries.getProfileBySlug(slug);
          userId = profileWithUser?.user_id;
          console.log('🔍 user_id from getProfileBySlug:', userId);
        }
        
        // If still no userId, try to get it directly from the database
        if (!userId) {
          console.log('⚠️ Still no user_id, querying database directly...');
          const directQuery = await pool.query(
            'SELECT user_id FROM lookbook_profiles WHERE slug = $1',
            [slug]
          );
          if (directQuery.rows.length > 0) {
            userId = directQuery.rows[0].user_id;
            console.log('🔍 user_id from direct query:', userId);
          }
        }
        
        if (userId) {
          console.log('🔄 Attempting to update user', userId, 'with name:', firstName, lastName);
          try {
            const updateResult = await pool.query(
              'UPDATE users SET first_name = $1, last_name = $2 WHERE user_id = $3 RETURNING first_name, last_name',
              [firstName, lastName, userId]
            );
            console.log('✅ SUCCESS: Updated user name to:', updates.name, 'for user_id:', userId);
            console.log('✅ Updated user record:', updateResult.rows[0]);
          } catch (updateError) {
            // Re-throw to be caught by outer catch block
            throw updateError;
          }
        } else {
          console.warn('⚠️ Could not find user_id for profile:', slug);
          console.warn('⚠️ Name update will be skipped');
        }
      } catch (nameUpdateError) {
        console.error('❌❌❌ ERROR updating user name ❌❌❌');
        console.error('Error code:', nameUpdateError.code);
        console.error('Error message:', nameUpdateError.message);
        console.error('Error detail:', nameUpdateError.detail);
        console.error('Error stack:', nameUpdateError.stack);
        
        // If it's a permission error, log it clearly and include in response
        if (nameUpdateError.code === '42501' || nameUpdateError.message.includes('permission denied')) {
          console.error('⚠️⚠️⚠️ UPDATE permission not available on users table ⚠️⚠️⚠️');
          console.error('⚠️ The profile was updated, but the user name could not be changed.');
          console.error('⚠️ Please contact your database administrator to grant UPDATE permission on the users table.');
          
          // Include a warning in the response so the user knows
          return res.json({
            success: true,
            data: updatedProfile,
            message: 'Profile updated successfully',
            warning: 'Profile updated, but name could not be changed due to database permissions. Please contact your database administrator.'
          });
        }
        
        // For other errors, just log but don't fail the request
        console.error('⚠️ Name update failed, but profile update succeeded');
      }
    } else {
      console.log('ℹ️ No name in updates, skipping user name update');
    }
    
    // If experience data is provided, update it
    if (experience && Array.isArray(experience)) {
      // First, delete all existing experience for this profile
      await pool.query('DELETE FROM lookbook_experience WHERE profile_id = $1', [updatedProfile.id]);
      
      // Then insert all experience entries
      for (let i = 0; i < experience.length; i++) {
        const exp = experience[i];
        await pool.query(`
          INSERT INTO lookbook_experience (profile_id, org, role, date_from, date_to, display_order)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          updatedProfile.id,
          exp.org || '',
          exp.role || '',
          exp.dateFrom || exp.date_from || '',
          exp.dateTo || exp.date_to || '',
          i
        ]);
      }
    }
    
    // Invalidate cache
    cache.profiles = null;
    
    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update profile',
      message: error.message 
    });
  }
});

// =====================================================
// DELETE /api/profiles/:slug
// Delete profile
// TODO: Add authentication middleware
// =====================================================

router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const deletedProfile = await profileQueries.deleteProfile(slug);
    
    if (!deletedProfile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found' 
      });
    }
    
    // Invalidate cache
    cache.profiles = null;
    cache.filters = null;
    
    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete profile',
      message: error.message 
    });
  }
});

// =====================================================
// POST /api/profiles/:slug/experience
// Add experience to profile
// TODO: Add authentication middleware
// =====================================================

router.post('/:slug/experience', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // First get the profile to get the ID
    const profile = await profileQueries.getProfileBySlug(slug);
    if (!profile) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found' 
      });
    }
    
    const experienceData = req.body;
    const newExperience = await profileQueries.addExperience(profile.id, experienceData);
    
    res.status(201).json({
      success: true,
      data: newExperience,
      message: 'Experience added successfully'
    });
  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to add experience',
      message: error.message 
    });
  }
});

module.exports = router;


