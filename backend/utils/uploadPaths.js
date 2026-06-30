const fs = require('fs');
const path = require('path');

const DEFAULT_UPLOADS_ROOT = path.join(__dirname, '..', 'public', 'uploads');

function getUploadsRoot() {
  const configuredRoot = process.env.UPLOADS_ROOT || process.env.UPLOAD_ROOT;
  if (!configuredRoot) return DEFAULT_UPLOADS_ROOT;
  return path.resolve(configuredRoot);
}

function ensureUploadsRoot() {
  const uploadsRoot = getUploadsRoot();
  if (!fs.existsSync(uploadsRoot)) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
  }
  return uploadsRoot;
}

module.exports = {
  DEFAULT_UPLOADS_ROOT,
  getUploadsRoot,
  ensureUploadsRoot,
};
