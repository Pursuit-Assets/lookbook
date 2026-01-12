import { memo } from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/api';
import './PersonCard.css';

function PersonCard({ person }) {
  return (
    <Link to={`/people/${person.slug}`} className="person-card">
      <div className="person-card__header">
        {person.photo_url ? (
          <img 
            src={getImageUrl(person.photo_url)} 
            alt={person.name}
            className="person-card__photo"
            loading="lazy"
          />
        ) : (
          <div className="person-card__photo person-card__photo--placeholder">
            {person.name?.charAt(0) || '?'}
          </div>
        )}
      </div>

      <div className="person-card__body">
        <div className="person-card__content">
          <h3 className="person-card__name">{person.name}</h3>
          
          {person.title && (
            <p className="person-card__title">{person.title}</p>
          )}

          {person.open_to_work && (
            <span className="badge badge--success person-card__badge">
              Open to Work
            </span>
          )}

          {person.industry_expertise && person.industry_expertise.length > 0 && (
            <div className="person-card__industries">
              <span className="text-muted text-small">
                {person.industry_expertise.slice(0, 2).join(', ')}
                {person.industry_expertise.length > 2 && ` +${person.industry_expertise.length - 2}`}
              </span>
            </div>
          )}
        </div>

        {/* Footer with skills and arrow */}
        <div className="person-card__footer">
          {person.skills && person.skills.length > 0 && (
            <div className="person-card__skills">
              {person.skills.slice(0, 5).map(skill => (
                <span key={skill} className="badge badge--primary">
                  {skill}
                </span>
              ))}
              {person.skills.length > 5 && (
                <span className="badge badge--secondary">
                  +{person.skills.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Arrow Button */}
          <div className="person-card__arrow">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if the person slug or key properties change
export default memo(PersonCard, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.person?.slug === nextProps.person?.slug &&
    prevProps.person?.name === nextProps.person?.name &&
    prevProps.person?.title === nextProps.person?.title &&
    prevProps.person?.open_to_work === nextProps.person?.open_to_work &&
    JSON.stringify(prevProps.person?.skills) === JSON.stringify(nextProps.person?.skills) &&
    JSON.stringify(prevProps.person?.industry_expertise) === JSON.stringify(nextProps.person?.industry_expertise)
  );
});


