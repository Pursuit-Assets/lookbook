// Project queries for Lookbook
// Follows test-pilot-server query pattern

const { pool } = require('../db/dbConfig');

// =====================================================
// GET ALL PROJECTS
// =====================================================

const getAllProjects = async (filters = {}) => {
  const {
    search,
    skills,
    sectors,
    cohort,
    hasDemoVideo,
    status = 'active',
    limit = 50,
    offset = 0,
    includeParticipants = false // New flag to optionally include participants
  } = filters;
  
  // Build participants subquery only if requested
  const participantsQuery = includeParticipants ? `
    (
      SELECT json_agg(
        json_build_object(
          'slug', prof.slug,
          'name', u.first_name || ' ' || u.last_name,
          'photoUrl', prof.photo_url,
          'role', pp.role
        ) ORDER BY pp.display_order
      )
      FROM lookbook_project_participants pp
      JOIN lookbook_profiles prof ON pp.profile_id = prof.id
      JOIN users u ON prof.user_id = u.user_id
      WHERE pp.project_id = p.id
    ) as participants,
  ` : `NULL as participants,`;
  
  let query = `
    SELECT 
      p.id as project_id,
      p.slug,
      p.title,
      p.summary,
      p.short_description,
      p.skills,
      p.sectors,
      p.main_image_url,
      p.card_background_url,
      p.card_background_video_url,
      p.icon_url,
      p.demo_video_url,
      p.github_url,
      p.live_url,
      p.cohort,
      p.status,
      p.has_partner,
      p.partner_name,
      p.partner_logo_url,
      p.created_at,
      ${participantsQuery}
      COUNT(*) OVER() as total_count
    FROM lookbook_projects p
    WHERE p.status = $1
  `;
  
  const params = [status];
  let paramCount = 2;
  
  // Text search (title, summary)
  if (search) {
    query += ` AND (
      p.title ILIKE $${paramCount} OR 
      p.summary ILIKE $${paramCount}
    )`;
    params.push(`%${search}%`);
    paramCount++;
  }
  
  // Skills filter (must have ALL specified skills)
  if (skills && skills.length > 0) {
    query += ` AND p.skills @> $${paramCount}::text[]`;
    params.push(skills);
    paramCount++;
  }
  
  // Sectors filter (must have ALL specified sectors)
  if (sectors && sectors.length > 0) {
    query += ` AND p.sectors @> $${paramCount}::text[]`;
    params.push(sectors);
    paramCount++;
  }
  
  // Cohort filter
  if (cohort) {
    if (cohort === 'earlier') {
      query += ` AND (p.cohort < '2021' OR p.cohort IS NULL)`;
    } else {
      query += ` AND p.cohort = $${paramCount}`;
      params.push(cohort);
      paramCount++;
    }
  }
  
  // Has demo video filter
  if (hasDemoVideo !== undefined) {
    query += ` AND (p.demo_video_url IS ${hasDemoVideo ? 'NOT NULL' : 'NULL'})`;
  }
  
  query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  return {
    projects: result.rows,
    total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
    limit,
    offset
  };
};

// =====================================================
// GET PROJECT BY SLUG
// =====================================================

const getProjectBySlug = async (slug) => {
  const query = `
    SELECT 
      p.*,
      (
        SELECT json_agg(
          json_build_object(
            'profile_id', prof.id,
            'slug', prof.slug,
            'name', u.first_name || ' ' || u.last_name,
            'title', prof.title,
            'photoUrl', prof.photo_url,
            'photoLqip', prof.photo_lqip,
            'role', pp.role
          ) ORDER BY pp.display_order
        )
        FROM lookbook_project_participants pp
        JOIN lookbook_profiles prof ON pp.profile_id = prof.id
        JOIN users u ON prof.user_id = u.user_id
        WHERE pp.project_id = p.id
      ) as participants
    FROM lookbook_projects p
    WHERE p.slug = $1
  `;
  
  const result = await pool.query(query, [slug]);
  return result.rows[0] || null;
};

// =====================================================
// CREATE PROJECT
// =====================================================

const createProject = async (projectData) => {
  const {
    slug,
    title,
    summary,
    description,
    mainImageUrl,
    mainImageLqip,
    cardBackgroundUrl,
    cardBackgroundVideoUrl,
    iconUrl,
    demoVideoUrl,
    skills = [],
    sectors = [],
    githubUrl,
    liveUrl,
    cohort,
    status = 'active',
    hasPartner = false,
    partnerName,
    partnerLogoUrl
  } = projectData;
  
  const query = `
    INSERT INTO lookbook_projects (
      slug, title, summary, description, main_image_url, main_image_lqip, card_background_url,
      card_background_video_url, icon_url, demo_video_url, skills, sectors, github_url, live_url, cohort, status,
      has_partner, partner_name, partner_logo_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `;
  
  const params = [
    slug, title, summary, description, mainImageUrl, mainImageLqip, cardBackgroundUrl,
    cardBackgroundVideoUrl, iconUrl, demoVideoUrl, skills, sectors, githubUrl, liveUrl, cohort, status,
    hasPartner, partnerName, partnerLogoUrl
  ];
  
  const result = await pool.query(query, params);
  return result.rows[0];
};

// =====================================================
// UPDATE PROJECT
// =====================================================

const updateProject = async (slug, updates) => {
  const allowedFields = [
    'slug', 'title', 'summary', 'short_description', 'description', 'main_image_url', 'main_image_lqip',
    'card_background_url', 'card_background_video_url', 'icon_url', 'demo_video_url', 'skills', 'sectors', 'github_url', 'live_url',
    'cohort', 'status', 'has_partner', 'partner_name', 'partner_logo_url'
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
    UPDATE lookbook_projects 
    SET ${setClause.join(', ')}
    WHERE slug = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

// =====================================================
// DELETE PROJECT
// =====================================================

const deleteProject = async (slug) => {
  const query = 'DELETE FROM lookbook_projects WHERE slug = $1 RETURNING *';
  const result = await pool.query(query, [slug]);
  return result.rows[0] || null;
};

// =====================================================
// ADD PARTICIPANT TO PROJECT
// =====================================================

const addParticipant = async (projectId, profileId, role = null, displayOrder = 0) => {
  const query = `
    INSERT INTO lookbook_project_participants (
      project_id, profile_id, role, display_order
    ) VALUES ($1, $2, $3, $4)
    ON CONFLICT (project_id, profile_id) DO UPDATE
    SET role = $3, display_order = $4
    RETURNING *
  `;
  
  const result = await pool.query(query, [projectId, profileId, role, displayOrder]);
  return result.rows[0];
};

// =====================================================
// REMOVE PARTICIPANT FROM PROJECT
// =====================================================

const removeParticipant = async (projectId, profileId) => {
  const query = `
    DELETE FROM lookbook_project_participants
    WHERE project_id = $1 AND profile_id = $2
    RETURNING *
  `;
  
  const result = await pool.query(query, [projectId, profileId]);
  return result.rows[0] || null;
};

// =====================================================
// GET PROJECTS BY PROFILE
// =====================================================

const getProjectsByProfile = async (profileId) => {
  const query = `
    SELECT 
      p.*,
      pp.role
    FROM lookbook_projects p
    JOIN lookbook_project_participants pp ON p.id = pp.project_id
    WHERE pp.profile_id = $1 AND p.status = 'active'
    ORDER BY p.created_at DESC
  `;
  
  const result = await pool.query(query, [profileId]);
  return result.rows;
};

// =====================================================
// GET ALL UNIQUE SKILLS (for filtering)
// =====================================================

const getAllSkills = async () => {
  const query = `
    SELECT DISTINCT unnest(skills) as name
    FROM lookbook_projects
    WHERE status = 'active'
      AND skills IS NOT NULL
      AND array_length(skills, 1) > 0
    ORDER BY name ASC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.name);
};

// =====================================================
// GET ALL UNIQUE SECTORS (for filtering)
// =====================================================

const getAllSectors = async () => {
  const query = `
    SELECT DISTINCT unnest(sectors) as name
    FROM lookbook_projects
    WHERE status = 'active'
      AND sectors IS NOT NULL
      AND array_length(sectors, 1) > 0
    ORDER BY name ASC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.name);
};

// =====================================================
// GET COHORTS (for filtering)
// =====================================================

const getAllCohorts = async () => {
  const query = `
    SELECT DISTINCT cohort
    FROM lookbook_projects
    WHERE cohort IS NOT NULL AND status = 'active'
    ORDER BY cohort DESC
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.cohort);
};

module.exports = {
  getAllProjects,
  getProjectBySlug,
  createProject,
  updateProject,
  deleteProject,
  addParticipant,
  removeParticipant,
  getProjectsByProfile,
  getAllSkills,
  getAllSectors,
  getAllCohorts
};

