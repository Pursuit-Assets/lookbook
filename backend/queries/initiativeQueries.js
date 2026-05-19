// Initiative queries for Lookbook
// CRUD operations for project initiatives/cohorts

const { pool } = require('../db/dbConfig');

// =====================================================
// GET ALL INITIATIVES
// =====================================================

const getAllInitiatives = async (includeInactive = false) => {
  // Optimized query: Get initiatives with project counts in a single query
  // This avoids N+1 query problem by using a LEFT JOIN and GROUP BY
  let query = `
    SELECT 
      i.id,
      i.slug,
      i.name,
      i.description,
      i.cohort_value,
      i.display_order,
      i.is_active,
      i.created_at,
      i.updated_at,
      COALESCE(COUNT(p.id), 0)::integer as project_count
    FROM lookbook_initiatives i
    LEFT JOIN lookbook_projects p ON p.cohort = i.cohort_value AND p.status = 'active'
  `;
  
  if (!includeInactive) {
    query += ` WHERE i.is_active = true`;
  }
  
  query += ` GROUP BY i.id, i.slug, i.name, i.description, i.cohort_value, i.display_order, i.is_active, i.created_at, i.updated_at
    ORDER BY
      CASE WHEN i.display_order > 0 THEN 0 ELSE 1 END,
      i.display_order ASC,
      i.created_at DESC`;
  
  const result = await pool.query(query);
  return result.rows;
};

// =====================================================
// GET INITIATIVE BY SLUG
// =====================================================

const getInitiativeBySlug = async (slug) => {
  const query = `
    SELECT 
      id,
      slug,
      name,
      description,
      cohort_value,
      display_order,
      is_active,
      created_at,
      updated_at
    FROM lookbook_initiatives
    WHERE slug = $1
  `;
  
  const result = await pool.query(query, [slug]);
  return result.rows[0] || null;
};

// =====================================================
// GET INITIATIVE BY ID
// =====================================================

const getInitiativeById = async (id) => {
  const query = `
    SELECT 
      id,
      slug,
      name,
      description,
      cohort_value,
      display_order,
      is_active,
      created_at,
      updated_at
    FROM lookbook_initiatives
    WHERE id = $1
  `;
  
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// =====================================================
// CREATE INITIATIVE
// =====================================================

const createInitiative = async (data) => {
  const {
    slug,
    name,
    description,
    cohortValue,
    displayOrder = 0,
    isActive = true
  } = data;
  
  const query = `
    INSERT INTO lookbook_initiatives (
      slug, name, description, cohort_value, display_order, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const params = [slug, name, description, cohortValue, displayOrder, isActive];
  const result = await pool.query(query, params);
  return result.rows[0];
};

// =====================================================
// UPDATE INITIATIVE
// =====================================================

const updateInitiative = async (id, updates) => {
  const allowedFields = ['slug', 'name', 'description', 'cohort_value', 'display_order', 'is_active'];
  
  const setClause = [];
  const params = [];
  let paramCount = 1;
  
  // Map camelCase to snake_case
  const fieldMapping = {
    cohortValue: 'cohort_value',
    displayOrder: 'display_order',
    isActive: 'is_active'
  };
  
  Object.keys(updates).forEach(key => {
    const dbKey = fieldMapping[key] || key;
    if (allowedFields.includes(dbKey)) {
      setClause.push(`${dbKey} = $${paramCount}`);
      params.push(updates[key]);
      paramCount++;
    }
  });
  
  if (setClause.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // Add updated_at
  setClause.push(`updated_at = CURRENT_TIMESTAMP`);
  
  params.push(id);
  const query = `
    UPDATE lookbook_initiatives 
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

// =====================================================
// DELETE INITIATIVE
// =====================================================

const deleteInitiative = async (id) => {
  const query = 'DELETE FROM lookbook_initiatives WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// =====================================================
// GET PROJECT COUNT BY INITIATIVE
// =====================================================

const getProjectCountByInitiative = async (cohortValue) => {
  const query = `
    SELECT COUNT(*) as count
    FROM lookbook_projects
    WHERE cohort = $1 AND status = 'active'
  `;
  
  const result = await pool.query(query, [cohortValue]);
  return parseInt(result.rows[0].count);
};

module.exports = {
  getAllInitiatives,
  getInitiativeBySlug,
  getInitiativeById,
  createInitiative,
  updateInitiative,
  deleteInitiative,
  getProjectCountByInitiative
};

