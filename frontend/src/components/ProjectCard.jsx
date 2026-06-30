import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl, getProjectTileImageUrl, getVideoThumbnailUrl } from '../utils/api';
import './ProjectCard.css';

// Build srcset for WebP uploads that have a 400w variant
function getImageSrcSet(imageUrl) {
  if (!imageUrl?.startsWith('/uploads/') || !imageUrl.endsWith('.webp')) return null;
  const smallUrl = getImageUrl(imageUrl.replace('.webp', '-400w.webp'));
  const fullUrl = getImageUrl(imageUrl);
  return `${smallUrl} 400w, ${fullUrl} 1200w`;
}

function getDisplaySummary(summary) {
  if (!summary) return null;
  try {
    const parsed = JSON.parse(summary);
    if (parsed && parsed.ambassador_name) return parsed.bio || null;
  } catch {
    // not JSON
  }
  return summary;
}

function ProjectCard({ project }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cardSrc, setCardSrc] = useState(() => getProjectTileImageUrl(project));

  // Priority: video > card background image > main image
  const cardVideoUrl = project.card_background_video_url;
  const cardImageUrl = project.card_background_url || project.main_image_url;
  const fallbackThumbnail = useMemo(
    () => getVideoThumbnailUrl(project.demo_video_url),
    [project.demo_video_url]
  );
  const cardSrcSet = getImageSrcSet(cardImageUrl);

  useEffect(() => {
    setImageLoaded(false);
    setCardSrc(getProjectTileImageUrl(project));
  }, [project.slug, project.card_background_url, project.main_image_url, project.icon_url, project.demo_video_url]);

  return (
    <Link to={`/projects/${project.slug}`} className="project-card">
      {cardVideoUrl ? (
        <div className="project-card__image project-card__image--loaded">
          <video
            src={cardVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
        </div>
      ) : cardImageUrl ? (
        <div className={`project-card__image${imageLoaded ? ' project-card__image--loaded' : ''}`}>
          <img
            src={cardSrc}
            srcSet={cardSrcSet || undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            alt={project.title}
            loading="lazy"
            className={imageLoaded ? 'loaded' : ''}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              if (fallbackThumbnail && cardSrc !== fallbackThumbnail) {
                setCardSrc(fallbackThumbnail);
                return;
              }
              setCardSrc(null);
            }}
          />
        </div>
      ) : null}
      
      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>
        
        {getDisplaySummary(project.summary) && (
          <p className="project-card__summary">{getDisplaySummary(project.summary)}</p>
        )}

        {project.skills && project.skills.length > 0 && (
          <div className="project-card__skills">
            {project.skills.slice(0, 4).map(skill => (
              <span key={skill} className="badge badge--primary">{skill}</span>
            ))}
            {project.skills.length > 4 && (
              <span className="badge badge--secondary">+{project.skills.length - 4}</span>
            )}
          </div>
        )}

        {project.participants && project.participants.length > 0 && (
          <div className="project-card__team">
            <span className="text-muted text-small">Team: </span>
            {project.participants.slice(0, 3).map((p, idx) => (
              <span key={idx} className="text-small">
                {p.name}{idx < Math.min(2, project.participants.length - 1) ? ', ' : ''}
              </span>
            ))}
            {project.participants.length > 3 && <span className="text-small"> +{project.participants.length - 3}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if the project slug or key properties change
export default memo(ProjectCard, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.project?.slug === nextProps.project?.slug &&
    prevProps.project?.title === nextProps.project?.title &&
    prevProps.project?.summary === nextProps.project?.summary &&
    JSON.stringify(prevProps.project?.skills) === JSON.stringify(nextProps.project?.skills) &&
    JSON.stringify(prevProps.project?.participants) === JSON.stringify(nextProps.project?.participants)
  );
});


