import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI } from '../utils/api';

function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await projectsAPI.getBySlug(slug);
        if (data.success) setProject(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [slug]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div>
      <Link to="/projects" className="back-link">← Back to Projects</Link>
      <h1>{project.title}</h1>
      
      {/* Project Partner Section */}
      {project.has_partner && (project.partner_logo_url || project.partner_name) && (
        <div className="mt-4 mb-4">
          {project.partner_logo_url && (
            <div className="mb-2">
              <img 
                src={project.partner_logo_url} 
                alt={project.partner_name || 'Partner logo'} 
                className="max-h-16 object-contain"
                style={{ maxWidth: '200px' }}
              />
            </div>
          )}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">Project Partner</span>
            {project.partner_name && (
              <span className="ml-2">{project.partner_name}</span>
            )}
          </div>
        </div>
      )}
      
      {project.summary && <p className="text-muted">{project.summary}</p>}
      
      {project.skills && (
        <div className="mt-lg">
          <h3>Technologies</h3>
          <div className="flex gap-sm mt-sm">
            {project.skills.map(skill => (
              <span key={skill} className="badge badge--primary">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {project.participants && project.participants.length > 0 && (
        <div className="mt-lg">
          <h3>Team</h3>
          <div className="mt-sm">
            {project.participants.map((p, index) => (
              p.slug ? (
                <Link key={p.slug} to={`/people/${p.slug}`} className="btn btn--outline mr-sm">
                  {p.name}
                </Link>
              ) : (
                <span key={`${p.name}-${index}`} className="btn btn--outline mr-sm">
                  {p.name}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      {(project.github_url || project.live_url) && (
        <div className="mt-lg">
          {project.github_url && <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="btn btn--outline mr-sm">GitHub</a>}
          {project.live_url && <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="btn btn--primary">View Live</a>}
        </div>
      )}
    </div>
  );
}

export default ProjectDetailPage;


