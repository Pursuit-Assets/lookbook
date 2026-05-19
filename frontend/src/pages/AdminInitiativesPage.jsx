import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initiativesAPI, projectsAPI } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Save, X, Rocket, FolderOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function AdminInitiativesPage() {
  const navigate = useNavigate();
  const [initiatives, setInitiatives] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInitiative, setExpandedInitiative] = useState(null);
  const [addingProjectTo, setAddingProjectTo] = useState(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cohortValue: ''
  });

  useEffect(() => {
    fetchInitiatives();
    fetchAllProjects();
  }, []);

  const fetchAllProjects = async () => {
    try {
      const response = await projectsAPI.getAll({ limit: 1000 });
      setAllProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      const response = await initiativesAPI.getAll(true); // Include inactive
      setInitiatives(response.data || []);
    } catch (error) {
      console.error('Error fetching initiatives:', error);
      toast.error('Failed to load initiatives');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', cohortValue: '' });
    setShowAddForm(false);
    setEditingInitiative(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.cohortValue.trim()) {
      toast.error('Name and cohort value are required');
      return;
    }

    try {
      await initiativesAPI.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        cohortValue: formData.cohortValue.trim()
      });
      toast.success('Initiative created successfully');
      resetForm();
      fetchInitiatives();
    } catch (error) {
      console.error('Error creating initiative:', error);
      toast.error(error.response?.data?.error || 'Failed to create initiative');
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim() || !formData.cohortValue.trim()) {
      toast.error('Name and cohort value are required');
      return;
    }

    try {
      await initiativesAPI.update(editingInitiative.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        cohortValue: formData.cohortValue.trim()
      });
      toast.success('Initiative updated successfully');
      resetForm();
      fetchInitiatives();
    } catch (error) {
      console.error('Error updating initiative:', error);
      toast.error(error.response?.data?.error || 'Failed to update initiative');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this initiative? This will not delete the projects, but they will no longer be grouped under this initiative.')) {
      return;
    }

    try {
      await initiativesAPI.delete(id);
      toast.success('Initiative deleted successfully');
      fetchInitiatives();
    } catch (error) {
      console.error('Error deleting initiative:', error);
      toast.error('Failed to delete initiative');
    }
  };

  const startEdit = (initiative) => {
    setEditingInitiative(initiative);
    setFormData({
      name: initiative.name,
      description: initiative.description || '',
      cohortValue: initiative.cohort_value
    });
    setShowAddForm(false);
  };

  const startAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  // Get projects for a specific initiative
  const getProjectsForInitiative = (cohortValue) => {
    return allProjects.filter(p => p.cohort === cohortValue);
  };

  // Get projects not in any initiative
  const getUnassignedProjects = () => {
    const initiativeCohorts = initiatives.map(i => i.cohort_value);
    return allProjects.filter(p => !p.cohort || !initiativeCohorts.includes(p.cohort));
  };

  // Add project to initiative
  const addProjectToInitiative = async (projectSlug, cohortValue) => {
    try {
      await projectsAPI.update(projectSlug, { cohort: cohortValue });
      toast.success('Project added to initiative');
      fetchAllProjects();
      fetchInitiatives();
      setAddingProjectTo(null);
    } catch (error) {
      console.error('Error adding project to initiative:', error);
      toast.error('Failed to add project to initiative');
    }
  };

  // Remove project from initiative
  const removeProjectFromInitiative = async (projectSlug) => {
    try {
      await projectsAPI.update(projectSlug, { cohort: '' });
      toast.success('Project removed from initiative');
      fetchAllProjects();
      fetchInitiatives();
    } catch (error) {
      console.error('Error removing project from initiative:', error);
      toast.error('Failed to remove project from initiative');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Initiatives</h1>
            <p className="text-gray-500 mt-1">Manage project groupings, cohorts, and partner initiatives</p>
          </div>
          {!showAddForm && !editingInitiative && (
            <Button 
              onClick={startAdd}
              style={{backgroundColor: '#4242ea'}}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Initiative
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingInitiative) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingInitiative ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingInitiative ? 'Edit Initiative' : 'Add New Initiative'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initiative Name *
                  </label>
                  <Input
                    placeholder="e.g., SMB Winter 2025"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cohort Value *
                  </label>
                  <Input
                    placeholder="e.g., SMB Winter 2025 or UFT AI Ambassadors"
                    value={formData.cohortValue}
                    onChange={(e) => setFormData({ ...formData, cohortValue: e.target.value })}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This value must match the project initiative/cohort field for projects you want to include.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Describe this initiative and the projects it contains..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="bg-white text-gray-900 border-gray-300"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={editingInitiative ? handleUpdate : handleCreate}
                    style={{backgroundColor: '#4242ea'}}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingInitiative ? 'Save Changes' : 'Create Initiative'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={resetForm}
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">Loading initiatives...</div>
        )}

        {/* Empty State */}
        {!loading && initiatives.length === 0 && !showAddForm && (
          <Card>
            <CardContent className="py-12 text-center">
              <Rocket className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No initiatives yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first initiative to group and organize projects.
              </p>
              <Button 
                onClick={startAdd}
                style={{backgroundColor: '#4242ea'}}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Initiative
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Initiatives List */}
        {!loading && initiatives.length > 0 && (
          <div className="space-y-4">
            {initiatives.map((initiative) => {
              const initiativeProjects = getProjectsForInitiative(initiative.cohort_value);
              const isExpanded = expandedInitiative === initiative.id;
              const isAddingProject = addingProjectTo === initiative.id;
              const unassignedProjects = getUnassignedProjects();
              
              return (
                <Card 
                  key={initiative.id}
                  className={`${!initiative.is_active ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{initiative.name}</h3>
                          {!initiative.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          <Badge 
                            className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-0 cursor-pointer"
                            onClick={() => setExpandedInitiative(isExpanded ? null : initiative.id)}
                          >
                            <FolderOpen className="w-3 h-3 mr-1" />
                            {initiativeProjects.length} projects
                            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                          </Badge>
                        </div>
                        
                        <div className="mb-3">
                          <span className="text-sm text-gray-500">Cohort value: </span>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {initiative.cohort_value}
                          </code>
                        </div>
                        
                        {initiative.description && (
                          <p className="text-gray-600">{initiative.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(initiative)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(initiative.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Projects Section */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-700">Projects in this Initiative</h4>
                          <Button
                            size="sm"
                            onClick={() => setAddingProjectTo(isAddingProject ? null : initiative.id)}
                            style={{backgroundColor: '#4242ea'}}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Project
                          </Button>
                        </div>

                        {/* Add Project Dropdown */}
                        {isAddingProject && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-2">Select a project to add:</p>
                            {unassignedProjects.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">All projects are already assigned to initiatives</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {unassignedProjects.map(project => (
                                  <button
                                    key={project.slug}
                                    onClick={() => addProjectToInitiative(project.slug, initiative.cohort_value)}
                                    className="w-full text-left px-3 py-2 text-sm bg-white hover:bg-purple-50 rounded border border-gray-200 transition-colors"
                                  >
                                    {project.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Projects List */}
                        {initiativeProjects.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No projects in this initiative yet</p>
                        ) : (
                          <div className="space-y-2">
                            {initiativeProjects.map(project => (
                              <div 
                                key={project.slug}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-900">{project.title}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => navigate(`/admin/projects/${project.slug}/edit`)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeProjectFromInitiative(project.slug)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How Initiatives Work</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Initiatives group projects by their initiative/cohort field value</li>
            <li>• Initiatives can represent Builder cohorts, partner programs, school groups, or other project collections</li>
            <li>• When users click an initiative in the sidebar, they see only projects with a matching value</li>
            <li>• To add a project to an initiative, edit the project and set its initiative field to match the initiative's value</li>
            <li>• The description you set here will appear in the header when users filter by this initiative</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminInitiativesPage;

