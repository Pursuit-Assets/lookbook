#!/usr/bin/env node

/**
 * Sync /uploads assets from an API environment to local uploads storage.
 *
 * Usage:
 *   SOURCE_API_URL=https://your-api.onrender.com/api node scripts/sync-upload-assets-from-api.js
 *
 * Optional env vars:
 *   TARGET_UPLOADS_ROOT=/absolute/path/to/uploads
 *   DRY_RUN=1
 */

const fs = require('fs');
const path = require('path');
const { getUploadsRoot } = require('../utils/uploadPaths');

const SOURCE_API_URL = process.env.SOURCE_API_URL;
const TARGET_UPLOADS_ROOT = process.env.TARGET_UPLOADS_ROOT || getUploadsRoot();
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!SOURCE_API_URL) {
  console.error('❌ SOURCE_API_URL is required.');
  console.error('Example: SOURCE_API_URL=https://lookbook-api.onrender.com/api node scripts/sync-upload-assets-from-api.js');
  process.exit(1);
}

function normalizeApiBase(url) {
  return url.replace(/\/+$/, '').replace(/\/api$/, '/api');
}

const API_BASE = normalizeApiBase(SOURCE_API_URL);
const SOURCE_ORIGIN = API_BASE.replace(/\/api$/, '');

function extractUploadPath(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    return value.startsWith('/uploads/') ? value : null;
  }
  return null;
}

function collectUploadsFromProject(project) {
  return [
    extractUploadPath(project.card_background_url),
    extractUploadPath(project.main_image_url),
    extractUploadPath(project.icon_url),
    extractUploadPath(project.partner_logo_url),
  ].filter(Boolean);
}

function collectUploadsFromProfile(profile) {
  return [
    extractUploadPath(profile.photo_url),
    extractUploadPath(profile.photoUrl),
  ].filter(Boolean);
}

function collectUploadsFromContributor(contributor) {
  return [extractUploadPath(contributor.photo_url)].filter(Boolean);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }
  return res.json();
}

async function fetchSourceUploads() {
  const [projectsPayload, profilesPayload, contributorsPayload] = await Promise.all([
    getJson(`${API_BASE}/projects?limit=500&offset=0&includeParticipants=false`),
    getJson(`${API_BASE}/profiles?limit=500&offset=0`),
    getJson(`${API_BASE}/external-contributors`),
  ]);

  const projects = projectsPayload?.data || [];
  const profiles = profilesPayload?.data || [];
  const contributors = contributorsPayload?.data || [];

  const uploadPaths = new Set();
  projects.forEach((p) => collectUploadsFromProject(p).forEach((u) => uploadPaths.add(u)));
  profiles.forEach((p) => collectUploadsFromProfile(p).forEach((u) => uploadPaths.add(u)));
  contributors.forEach((c) => collectUploadsFromContributor(c).forEach((u) => uploadPaths.add(u)));

  return {
    projectsCount: projects.length,
    profilesCount: profiles.length,
    contributorsCount: contributors.length,
    uploadPaths: [...uploadPaths],
  };
}

async function downloadOne(uploadPath) {
  const sourceUrl = `${SOURCE_ORIGIN}${uploadPath}`;
  const relative = uploadPath.replace(/^\/uploads\//, '');
  const targetPath = path.join(TARGET_UPLOADS_ROOT, relative);

  if (fs.existsSync(targetPath)) {
    return { uploadPath, status: 'exists', targetPath };
  }

  if (DRY_RUN) {
    return { uploadPath, status: 'would-download', targetPath };
  }

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    return { uploadPath, status: 'failed', reason: `HTTP ${res.status}`, sourceUrl, targetPath };
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, bytes);
  return { uploadPath, status: 'downloaded', bytes: bytes.length, sourceUrl, targetPath };
}

async function main() {
  console.log('🔎 Source API:', API_BASE);
  console.log('📁 Target uploads root:', TARGET_UPLOADS_ROOT);
  if (DRY_RUN) console.log('🧪 Dry run mode enabled (no files written)');

  const source = await fetchSourceUploads();
  console.log(`📦 Source records: projects=${source.projectsCount}, profiles=${source.profilesCount}, external_contributors=${source.contributorsCount}`);
  console.log(`🖼️  Unique /uploads paths discovered: ${source.uploadPaths.length}`);

  const results = [];
  for (const uploadPath of source.uploadPaths) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await downloadOne(uploadPath));
  }

  const summary = results.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Sync summary:', summary);

  const report = {
    timestamp: new Date().toISOString(),
    sourceApi: API_BASE,
    targetUploadsRoot: TARGET_UPLOADS_ROOT,
    dryRun: DRY_RUN,
    discovered: source.uploadPaths.length,
    summary,
    failures: results.filter((r) => r.status === 'failed'),
  };

  const reportPath = path.join(process.cwd(), 'sync-upload-assets-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Report written: ${reportPath}`);
}

main().catch((error) => {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
});
