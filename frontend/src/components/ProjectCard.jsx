import { Link } from 'react-router-dom';
import './ProjectCard.css';

function ProjectCard({ project }) {
  // Priority: video > card background image > main image
  const cardVideoUrl = project.card_background_video_url;
  const cardImageUrl = project.card_background_url || project.main_image_url;
  
  return (
    <Link to={`/projects/${project.slug}`} className="project-card">
      {cardVideoUrl ? (
        <div className="project-card__image">
          <video 
            src={cardVideoUrl} 
            alt={project.title}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : cardImageUrl ? (
        <div className="project-card__image">
          <img src={cardImageUrl} alt={project.title} />
        </div>
      ) : null}
      
      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>
        
        {project.summary && (
          <p className="project-card__summary">{project.summary}</p>
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

export default ProjectCard;


