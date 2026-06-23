import { useState, useEffect, useRef } from 'react';
import { projectsAPI } from '../utils/api';
import ProjectCard from '../components/ProjectCard';
import ProjectCardSkeleton from '../components/ProjectCardSkeleton';
import './ProjectsPage.css';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    cohort: '',
    skills: [],
    sectors: []
  });
  // Prevent stale responses from overwriting newer results when fetches
  // resolve out of order (cache hits are instant, misses hit the network)
  const fetchVersionRef = useRef(0);

  useEffect(() => {
    const version = ++fetchVersionRef.current;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const data = await projectsAPI.getAll(filters);
        // A newer fetch has started since this one — discard this response
        if (version !== fetchVersionRef.current) return;
        if (data.success) {
          setProjects(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      } finally {
        if (version === fetchVersionRef.current) {
          setLoading(false);
        }
      }
    };

    // Debounce so typing in search doesn't fire a request per keystroke.
    // First fetch on mount runs immediately.
    const timeoutId = setTimeout(fetchProjects, version === 1 ? 0 : 250);
    return () => clearTimeout(timeoutId);
  }, [filters]);

  return (
    <div className="projects-page">
      <div className="projects-page__header">
        <h1>Projects</h1>
        <p className="text-muted">Discover innovative projects and their teams</p>
      </div>

      <div className="projects-page__search">
        <input
          type="text"
          placeholder="Search Projects"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
      </div>

      {loading && projects.length === 0 && (
        <div className="projects-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="empty-state">
          <h3 className="empty-state__title">No projects found</h3>
        </div>
      )}

      {/* Keep previous results visible during refetches to avoid the grid
          blanking out and popping back in */}
      {projects.length > 0 && (
        <div className="projects-grid">
          {projects.map(project => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;


