import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { projectsAPI, initiativesAPI } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';

function AdminProjectsPage() {
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState(null);
  const [initiatives, setInitiatives] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, project: null });
  const prevLocationKeyRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const hasRefreshedFromStateRef = useRef(false);

  useEffect(() => {
    fetchProjects();
    fetchInitiatives();
    lastFetchTimeRef.current = Date.now();
    prevLocationKeyRef.current = location.key;
  }, []);

  // Refresh when navigating to this page (e.g., after creating/editing a project)
  useEffect(() => {
    // Only process if we're on the projects page
    if (location.pathname !== '/admin/projects') {
      prevLocationKeyRef.current = location.key;
      hasRefreshedFromStateRef.current = false;
      return;
    }

    // Skip if this is the initial mount
    if (prevLocationKeyRef.current === null) {
      prevLocationKeyRef.current = location.key;
      return;
    }
    
    const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
    const shouldRefresh = timeSinceLastFetch > 100;
    
    // Always refresh if we have refresh state (highest priority)
    if (location.state?.refresh && !hasRefreshedFromStateRef.current && shouldRefresh) {
      fetchProjects();
      lastFetchTimeRef.current = Date.now();
      hasRefreshedFromStateRef.current = true;
    }
    // Also refresh if location key changed (navigation occurred)
    else if (location.key !== prevLocationKeyRef.current && shouldRefresh) {
      fetchProjects();
      lastFetchTimeRef.current = Date.now();
      hasRefreshedFromStateRef.current = false;
    }
    
    prevLocationKeyRef.current = location.key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.state, location.key]);

  const fetchInitiatives = async () => {
    try {
      const response = await initiativesAPI.getAll();
      if (response.success) {
        setInitiatives(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching initiatives:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const filters = { limit: 100 };
      
      // Add cohort filter if an initiative is selected
      if (selectedInitiative) {
        const initiative = initiatives.find(i => i.slug === selectedInitiative);
        if (initiative) {
          filters.cohort = initiative.cohort_value;
        }
      }
      
      const response = await projectsAPI.getAll(filters);
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh projects when initiative filter changes
  useEffect(() => {
    if (initiatives.length > 0) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInitiative]);

  const filteredProjects = projects.filter(project =>
    project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (project) => {
    setDeleteDialog({ isOpen: true, project });
  };

  const handleDeleteConfirm = async () => {
    const { project } = deleteDialog;
    if (!project) return;

    const projectSlug = project.slug; // Store slug before closing dialog

    try {
      await projectsAPI.delete(projectSlug);
      toast.success('Project deleted successfully');
      setDeleteDialog({ isOpen: false, project: null });
      // Remove the deleted project from the list immediately using slug
      setProjects(prevProjects => prevProjects.filter(p => p.slug !== projectSlug));
      // Also refresh from server to ensure consistency
      await fetchProjects();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete project';
      toast.error(errorMessage);
      console.error('Error deleting project:', error);
      setDeleteDialog({ isOpen: false, project: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, project: null });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 mt-1">Manage projects and portfolios</p>
          </div>
          <Link to="/admin/projects/new/edit">
            <Button className="flex items-center gap-2" style={{backgroundColor: '#4242ea'}}>
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </Link>
        </div>

        {/* Initiative Filter */}
        {initiatives.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Initiative</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedInitiative === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedInitiative(null)}
                style={selectedInitiative === null ? {backgroundColor: '#4242ea', color: 'white'} : {}}
                className={selectedInitiative === null ? '' : 'bg-white hover:bg-gray-50'}
              >
                All Projects
              </Button>
              {initiatives.map(initiative => (
                <Button
                  key={initiative.slug}
                  variant={selectedInitiative === initiative.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInitiative(initiative.slug)}
                  style={selectedInitiative === initiative.slug ? {backgroundColor: '#4242ea', color: 'white'} : {}}
                  className={selectedInitiative === initiative.slug ? '' : 'bg-white hover:bg-gray-50'}
                >
                  {initiative.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">
                {selectedInitiative ? 'Filtered Projects' : 'Total Projects'}
              </div>
              <div className="text-2xl font-bold mt-1">{filteredProjects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">With Videos</div>
              <div className="text-2xl font-bold mt-1">
                {filteredProjects.filter(p => p.demo_video_url).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">With Team</div>
              <div className="text-2xl font-bold mt-1">
                {filteredProjects.filter(p => p.participant_count > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Initiative
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technologies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => {
                  // Find the initiative that matches this project's cohort
                  const projectInitiative = initiatives.find(i => i.cohort_value === project.cohort);
                  
                  return (
                    <tr key={project.project_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{project.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {project.short_description || project.summary}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {projectInitiative ? (
                          <Badge 
                            className="text-xs font-medium"
                            style={{backgroundColor: '#4242ea', color: 'white'}}
                          >
                            {projectInitiative.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">No initiative</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {project.skills?.slice(0, 3).map((skill, idx) => (
                            <Badge 
                              key={idx} 
                              className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 border-0"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {project.skills?.length > 3 && (
                            <Badge 
                              className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
                            >
                              +{project.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {project.sectors?.map((sector, idx) => (
                            <Badge key={idx} className="text-xs" style={{backgroundColor: '#4242ea'}}>
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {project.participant_count || 0} members
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/projects/${project.slug}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/admin/projects/${project.slug}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(project)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No projects found matching your search.
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        message={`Delete ${deleteDialog.project?.title || 'this project'}?`}
      />
    </AdminLayout>
  );
}

export default AdminProjectsPage;

