import './PersonCardSkeleton.css';

function PersonCardSkeleton() {
  return (
    <div className="person-card-skeleton">
      <div className="person-card-skeleton__header">
        {/* Circular photo skeleton */}
        <div className="person-card-skeleton__photo"></div>
      </div>

      <div className="person-card-skeleton__body">
        <div className="person-card-skeleton__content">
          {/* Name skeleton */}
          <div className="person-card-skeleton__name"></div>
          
          {/* Title skeleton */}
          <div className="person-card-skeleton__title"></div>

          {/* Industries skeleton */}
          <div className="person-card-skeleton__industries">
            <div className="skeleton-industry-text"></div>
          </div>
        </div>

        {/* Footer with skills and arrow */}
        <div className="person-card-skeleton__footer">
          {/* Skills skeleton */}
          <div className="person-card-skeleton__skills">
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
            <div className="skeleton-badge"></div>
          </div>

          {/* Arrow button skeleton */}
          <div className="person-card-skeleton__arrow"></div>
        </div>
      </div>
    </div>
  );
}

export default PersonCardSkeleton;
