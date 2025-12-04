// Profile queries for Lookbook - Compatible with segundo-db schema
// Follows test-pilot-server query pattern

const { pool } = require('../db/dbConfig');

// =====================================================
// GET ALL PROFILES
// =====================================================

const getAllProfiles = async (filters = {}) => {
  const { search, skills, openToWork, industries, limit = 50, offset = 0 } = filters;
  
  // Build WHERE clause conditions
  const conditions = [];
  const params = [];
  let paramCount = 1;
  
  // Text search (name, title, skills)
  if (search) {
    conditions.push(`(
      (u.first_name || ' ' || u.last_name) ILIKE $${paramCount} OR 
      p.title ILIKE $${paramCount} OR 
      EXISTS (
        SELECT 1 FROM unnest(p.skills) AS skill 
        WHERE skill ILIKE $${paramCount}
      )
    )`);
    params.push(`%${search}%`);
    paramCount++;
  }
  
  // Skills filter (must have ALL specified skills)
  if (skills && skills.length > 0) {
    conditions.push(`p.skills @> $${paramCount}::text[]`);
    params.push(skills);
    paramCount++;
  }
  
  // Industry filter (must have ALL specified industries)
  if (industries && industries.length > 0) {
    conditions.push(`p.industry_expertise @> $${paramCount}::text[]`);
    params.push(industries);
    paramCount++;
  }
  
  // Open to work filter
  if (openToWork !== undefined) {
    conditions.push(`p.open_to_work = $${paramCount}`);
    params.push(openToWork);
    paramCount++;
  }
  
  const whereClause = conditions.length > 0 
    ? 'WHERE ' + conditions.join(' AND ')
    : '';
  
  // Use a CTE (Common Table Expression) for better performance
  // This avoids the expensive COUNT(*) OVER() window function
  const query = `
    WITH filtered_profiles AS (
      SELECT 
        p.id as profile_id,
        p.slug,
        p.title,
        p.bio,
        p.skills,
        p.industry_expertise,
        p.open_to_work,
        p.highlights,
        p.photo_url,
        p.photo_lqip,
        p.linkedin_url,
        p.github_url,
        p.website_url,
        p.x_url,
        p.featured,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        u.first_name as sort_name,
        (
          SELECT COUNT(*)::int
          FROM lookbook_project_participants pp
          WHERE pp.profile_id = p.id
        ) as project_count
      FROM lookbook_profiles p
      JOIN users u ON p.user_id = u.user_id
      ${whereClause}
    ),
    profile_count AS (
      SELECT COUNT(*) as total FROM filtered_profiles
    )
    SELECT 
      fp.*,
      pc.total as total_count
    FROM filtered_profiles fp
    CROSS JOIN profile_count pc
    ORDER BY fp.sort_name ASC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  return {
    profiles: result.rows,
    total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
    limit,
    offset
  };
};

// =====================================================
// GET PROFILE BY SLUG
// =====================================================

const getProfileBySlug = async (slug) => {
  const query = `
    SELECT 
      p.*,
      u.first_name || ' ' || u.last_name as name,
      u.email,
      (
        SELECT json_agg(
          json_build_object(
            'experience_id', e.id,
            'org', e.org,
            'role', e.role,
            'dateFrom', e.date_from,
            'dateTo', e.date_to,
            'summary', e.summary
          ) ORDER BY e.display_order
        )
        FROM lookbook_experience e
        WHERE e.profile_id = p.id
      ) as experience,
      (
        SELECT json_agg(
          json_build_object(
            'project_id', proj.id,
            'slug', proj.slug,
            'title', proj.title,
            'summary', proj.summary,
            'short_description', proj.short_description,
            'skills', proj.skills,
            'sectors', proj.sectors,
            'mainImageUrl', proj.main_image_url
          )
        )
        FROM lookbook_projects proj
        JOIN lookbook_project_participants pp ON proj.id = pp.project_id
        WHERE pp.profile_id = p.id
      ) as projects
    FROM lookbook_profiles p
    JOIN users u ON p.user_id = u.user_id
    WHERE p.slug = $1
  `;
  
  const result = await pool.query(query, [slug]);
  return result.rows[0] || null;
};

// =====================================================
// CREATE PROFILE
// =====================================================

const createProfile = async (profileData) => {
  const {
    userId,
    slug,
    title,
    bio,
    skills = [],
    industryExpertise = [],
    openToWork = false,
    highlights = [],
    photoUrl,
    photoLqip,
    linkedinUrl,
    githubUrl,
    websiteUrl,
    xUrl,
    featured = false
  } = profileData;
  
  const query = `
    INSERT INTO lookbook_profiles (
      user_id, slug, title, bio, skills, industry_expertise,
      open_to_work, highlights, photo_url, photo_lqip,
      linkedin_url, github_url, website_url, x_url, featured
    ) VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7, $8::text[], $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `;
  
  // Ensure arrays are properly formatted
  const params = [
    userId, 
    slug, 
    title, 
    bio, 
    Array.isArray(skills) ? skills : [], 
    Array.isArray(industryExpertise) ? industryExpertise : [],
    openToWork, 
    Array.isArray(highlights) ? highlights : [], 
    photoUrl, 
    photoLqip,
    linkedinUrl, 
    githubUrl, 
    websiteUrl, 
    xUrl, 
    featured
  ];
  
  const result = await pool.query(query, params);
  return result.rows[0];
};

// =====================================================
// UPDATE PROFILE
// =====================================================

const updateProfile = async (slug, updates) => {
  const allowedFields = [
    'slug', 'title', 'bio', 'skills', 'industry_expertise', 'open_to_work',
    'highlights', 'photo_url', 'photo_lqip', 'linkedin_url',
    'github_url', 'website_url', 'x_url', 'featured'
  ];
  
  const setClause = [];
  const params = [];
  let paramCount = 1;
  
  Object.keys(updates).forEach(key => {
    const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(dbKey)) {
      setClause.push(`${dbKey} = $${paramCount}`);
      params.push(updates[key]);
      paramCount++;
    }
  });
  
  if (setClause.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  params.push(slug);
  const query = `
    UPDATE lookbook_profiles 
    SET ${setClause.join(', ')}
    WHERE slug = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

// =====================================================
// DELETE PROFILE
// =====================================================

const deleteProfile = async (slug) => {
  const query = 'DELETE FROM lookbook_profiles WHERE slug = $1 RETURNING *';
  const result = await pool.query(query, [slug]);
  return result.rows[0] || null;
};

// =====================================================
// ADD EXPERIENCE
// =====================================================

const addExperience = async (profileId, experienceData) => {
  const { org, role, dateFrom, dateTo, summary, displayOrder = 0 } = experienceData;
  
  const query = `
    INSERT INTO lookbook_experience (
      profile_id, org, role, date_from, date_to, summary, display_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const result = await pool.query(query, [
    profileId, org, role, dateFrom, dateTo, summary, displayOrder
  ]);
  
  return result.rows[0];
};

// =====================================================
// GET ALL SKILLS (for filtering)
// =====================================================

const getAllSkills = async () => {
  const query = `
    SELECT DISTINCT unnest(skills) as skill
    FROM lookbook_profiles
    ORDER BY skill ASC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.skill);
};

// =====================================================
// GET ALL INDUSTRIES (for filtering)
// =====================================================

const getAllIndustries = async () => {
  const query = `
    SELECT DISTINCT unnest(industry_expertise) as industry
    FROM lookbook_profiles
    ORDER BY industry ASC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.industry);
};

module.exports = {
  getAllProfiles,
  getProfileBySlug,
  createProfile,
  updateProfile,
  deleteProfile,
  addExperience,
  getAllSkills,
  getAllIndustries
};


