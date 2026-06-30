import { getImageUrl } from '../utils/api';
import { Button } from '@/components/ui/button';
import { Linkedin, Globe } from 'lucide-react';
import LazyVideo from '../components/LazyVideo';

function getLoomEmbed(url) {
  if (!url) return null;
  const match = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
  if (match) return `https://www.loom.com/embed/${match[1]}`;
  if (url.includes('loom.com/embed/')) return url;
  return null;
}

function AmbassadorDetailView({ project }) {
  let amb = {};
  try { amb = JSON.parse(project.summary || '{}'); } catch { amb = {}; }

  const ambassadorName = project.short_description || amb.ambassador_name || project.title;
  const buildName      = project.title;
  const bio            = amb.bio             || '';
  const location       = amb.location        || '';
  const school         = amb.school          || '';
  const role           = amb.position        || '';
  const yearsInUft     = amb.years_in_uft    || '';
  const cohortNum      = (project.sectors && project.sectors[0]) || amb.cohort_num || '';
  const licenseArea    = amb.license_area    || '';
  const gradeLevels    = amb.grade_levels    || '';
  const problem        = amb.problem         || '';
  const targetAudience = amb.target_audience || '';
  const solution       = amb.solution        || '';
  const whatsNext      = amb.whats_next      || '';
  const toolsUsed      = project.skills      || (amb.tools_used ? amb.tools_used.split(',').map(t => t.trim()) : []);
  const loomUrl        = getLoomEmbed(project.demo_video_url);
  const tryItUrl       = project.live_url    || '';
  const linkedinUrl    = project.github_url  || amb.linkedin_url || '';

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row gap-6 mb-6 items-start">
        {/* Headshot */}
        <div className="flex-shrink-0 w-full md:w-56">
          <div className="rounded-lg overflow-hidden aspect-[4/5] max-h-[320px] md:aspect-auto md:h-[260px] md:max-h-none">
            {project.main_image_url ? (
              <img
                src={getImageUrl(project.main_image_url)}
                alt={ambassadorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#4242ea] to-[#2525c4] flex items-center justify-center text-white font-bold text-5xl">
                {ambassadorName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="flex-1">
          {/* Cohort + Location */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {cohortNum && (
              <span className="px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#4242ea' }}>
                {cohortNum}
              </span>
            )}
            {location && (
              <span className="text-gray-500 text-sm">{location}</span>
            )}
          </div>

          {/* Name */}
          <h1
            className="font-bold uppercase tracking-tight mb-1"
            style={{ fontFamily: "'Galano Grotesque', sans-serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.1 }}
          >
            {ambassadorName}
          </h1>

          {/* Role · School · Years */}
          {(role || school || yearsInUft) && (
            <p className="text-gray-600 text-sm mb-2">
              {[role, school, yearsInUft ? `${yearsInUft} years in UFT` : ''].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* License Area · Grade Levels */}
          {(licenseArea || gradeLevels) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {licenseArea && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {licenseArea}
                </span>
              )}
              {gradeLevels && gradeLevels !== 'Not Applicable' && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  Grades: {gradeLevels}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            {linkedinUrl && (
              <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" style={{ backgroundColor: '#0A66C2', color: 'white' }} className="hover:opacity-90 flex items-center gap-1">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </Button>
              </a>
            )}
            {tryItUrl && tryItUrl !== 'N/A' && tryItUrl !== 'n/a' && tryItUrl !== '.' && (
              <a href={tryItUrl.startsWith('http') ? tryItUrl : `https://${tryItUrl}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" style={{ backgroundColor: '#4242ea', color: 'white' }} className="hover:opacity-90 flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Try It
                </Button>
              </a>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <div className="pb-4 border-b">
              <h2 className="text-base font-bold mb-1">About</h2>
              <p className="text-gray-700 leading-snug" style={{ fontSize: '15px' }}>{bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Build Section ── */}
      <div className="mb-6 p-5 rounded-xl" style={{ background: '#f5f5ff', border: '1.5px solid #e0e0ff' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-8 rounded-full" style={{ background: '#4242ea' }} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4242ea' }}>Build</p>
            <h2 className="font-bold text-xl" style={{ fontFamily: "'Galano Grotesque', sans-serif" }}>{buildName}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {problem && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-1">The Problem</h3>
              <p className="text-gray-700 leading-snug" style={{ fontSize: '14px' }}>{problem}</p>
            </div>
          )}
          {targetAudience && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-1">Target Audience</h3>
              <p className="text-gray-700 leading-snug" style={{ fontSize: '14px' }}>{targetAudience}</p>
            </div>
          )}
          {solution && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-1">The Solution</h3>
              <p className="text-gray-700 leading-snug" style={{ fontSize: '14px' }}>{solution}</p>
            </div>
          )}
          {whatsNext && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-1">What's Next</h3>
              <p className="text-gray-700 leading-snug" style={{ fontSize: '14px' }}>{whatsNext}</p>
            </div>
          )}
        </div>

        {/* Tools Used */}
        {toolsUsed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#e0e0ff]">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">Tools Used</h3>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(toolsUsed) ? toolsUsed : toolsUsed.split(',').map(t => t.trim())).map((tool, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full font-semibold text-white" style={{ background: '#4242ea' }}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Loom Demo ── */}
      {loomUrl && (
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3">Demo</h3>
          <LazyVideo
            src={loomUrl}
            title={`${ambassadorName} — ${buildName} demo`}
            className="rounded-lg overflow-hidden"
            style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
          />
        </div>
      )}
    </div>
  );
}

export default AmbassadorDetailView;
