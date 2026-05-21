import { useState } from 'react';
import { getImageUrl } from '../utils/api';
import { Card, CardContent } from '@/components/ui/card';
import './AmbassadorCard.css';

function AmbassadorCard({ project, onClick }) {
  const [cardRef, setCardRef] = useState(null);
  const [imageError, setImageError] = useState(false);

  // Parse ambassador-specific fields from summary JSON
  let amb = {};
  try { amb = JSON.parse(project.summary || '{}'); } catch { amb = {}; }

  const ambassadorName = project.short_description || amb.ambassador_name || '';
  const buildName      = project.title || '';
  const role           = amb.position || '';
  const school         = amb.school   || '';
  const cohortNum      = (project.sectors && project.sectors[0]) || amb.cohort_num || '';

  const handleMouseMove = (e) => {
    if (!cardRef) return;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2, cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -5;
    const ry = ((x - cx) / cx) * 5;
    cardRef.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    const holo = cardRef.querySelector('.holo-effect');
    if (holo) holo.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
  };

  const handleMouseLeave = () => {
    if (!cardRef) return;
    cardRef.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div
      ref={setCardRef}
      className="rounded-xl ambassador-card-wrapper project-card-cursor"
      style={{ overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card
        className="rounded-xl border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
        style={{ backgroundColor: 'white', aspectRatio: '3/4', cursor: 'pointer' }}
        onClick={onClick}
      >
        {/* Headshot background */}
        {project.main_image_url && !imageError ? (
          <div className="absolute inset-0 z-0">
            <img
              src={getImageUrl(project.main_image_url)}
              alt={ambassadorName}
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/80" />
            <div className="holo-effect absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#4242ea] to-[#2525c4]">
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          </div>
        )}

        <CardContent className="relative z-10 p-5 h-full flex flex-col justify-between">
          {/* Top — cohort badge */}
          <div>
            {cohortNum && (
              <span className="ambassador-card__badge">{cohortNum}</span>
            )}
          </div>

          {/* Bottom — identity + build */}
          <div>
            <h3
              className="font-bold text-white uppercase leading-tight mb-1"
              style={{ fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.3rem' }}
            >
              {ambassadorName}
            </h3>
            {role && (
              <p className="text-white/75 text-xs mb-0.5 line-clamp-1">{role}</p>
            )}
            {school && (
              <p className="text-white/55 text-xs mb-3 line-clamp-1">{school}</p>
            )}
            <div className="ambassador-card__build-pill">
              <span className="ambassador-card__build-label">Build</span>
              <span className="ambassador-card__build-name">{buildName}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AmbassadorCard;
