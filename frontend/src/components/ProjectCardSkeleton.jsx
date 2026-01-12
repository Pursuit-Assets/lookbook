import './ProjectCardSkeleton.css';

function ProjectCardSkeleton() {
  return (
    <div className="project-card-skeleton">
      {/* Image skeleton */}
      <div className="project-card-skeleton__image"></div>
      
      <div className="project-card-skeleton__body">
        {/* Title skeleton */}
        <div className="project-card-skeleton__title"></div>
        
        {/* Summary skeleton - 2 lines */}
        <div className="project-card-skeleton__summary">
          <div></div>
          <div></div>
        </div>

        {/* Skills skeleton */}
        <div className="project-card-skeleton__skills">
          <div className="skeleton-badge"></div>
          <div className="skeleton-badge"></div>
          <div className="skeleton-badge"></div>
          <div className="skeleton-badge"></div>
        </div>

        {/* Team skeleton */}
        <div className="project-card-skeleton__team">
          <div className="skeleton-team-text"></div>
        </div>
      </div>
    </div>
  );
}

export default ProjectCardSkeleton;
