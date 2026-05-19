// External contributor queries for non-profile project participants.

const { pool } = require('../db/dbConfig');

const getAllExternalContributors = async () => {
  const query = `
    SELECT
      id,
      name,
      title,
      organization,
      photo_url,
      bio,
      links,
      created_at,
      updated_at
    FROM lookbook_external_contributors
    ORDER BY name ASC
  `;

  const result = await pool.query(query);
  return result.rows;
};

const createExternalContributor = async (data) => {
  const {
    name,
    title,
    organization,
    photo_url: photoUrl,
    photoUrl: camelPhotoUrl,
    bio,
    links = {}
  } = data;

  const query = `
    INSERT INTO lookbook_external_contributors (
      name, title, organization, photo_url, bio, links
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const params = [name, title || null, organization || null, photoUrl || camelPhotoUrl || null, bio || null, links];
  const result = await pool.query(query, params);
  return result.rows[0];
};

const updateExternalContributor = async (id, updates) => {
  const allowedFields = ['name', 'title', 'organization', 'photo_url', 'bio', 'links'];
  const fieldMapping = {
    photoUrl: 'photo_url'
  };

  const setClause = [];
  const params = [];
  let paramCount = 1;

  Object.keys(updates).forEach((key) => {
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

  setClause.push('updated_at = NOW()');
  params.push(id);

  const query = `
    UPDATE lookbook_external_contributors
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const deleteExternalContributor = async (id) => {
  const result = await pool.query(
    'DELETE FROM lookbook_external_contributors WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  getAllExternalContributors,
  createExternalContributor,
  updateExternalContributor,
  deleteExternalContributor
};
