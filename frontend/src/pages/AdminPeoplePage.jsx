import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { profilesAPI, getImageUrl } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Eye, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import AddFromDatabaseModal from '../components/AddFromDatabaseModal';

function AdminPeoplePage() {
  const location = useLocation();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, person: null });
  const [dbModalOpen, setDbModalOpen] = useState(false);
  const prevLocationKeyRef = useRef(null);
  const hasRefreshedFromStateRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchPeople({ bustCache: true });
    prevLocationKeyRef.current = location.key;
  }, [pagination.page, pagination.limit, debouncedSearchTerm]);

  // Refresh when navigating to this page (e.g., after creating/editing a person)
  useEffect(() => {
    // Only process if we're on the people page
    if (location.pathname !== '/admin/people') {
      prevLocationKeyRef.current = location.key;
      hasRefreshedFromStateRef.current = false;
      return;
    }

    // Skip if this is the initial mount
    if (prevLocationKeyRef.current === null) {
      prevLocationKeyRef.current = location.key;
      return;
    }
    
    const keyChanged = location.key !== prevLocationKeyRef.current;
    const hasRefreshState = location.state?.refresh;
    
    // Always refresh if we have refresh state (highest priority) - ignore time check for refresh state
    if (hasRefreshState && !hasRefreshedFromStateRef.current) {
      fetchPeople({ bustCache: true });
      hasRefreshedFromStateRef.current = true;
    }
    // Also refresh if location key changed (navigation occurred)
    else if (keyChanged) {
      fetchPeople({ bustCache: true });
      hasRefreshedFromStateRef.current = false;
    }
    
    prevLocationKeyRef.current = location.key;
  }, [location.pathname, location.state, location.key]);

  const fetchPeople = async ({
    page = pagination.page,
    limit = pagination.limit,
    search = debouncedSearchTerm,
    bustCache = false,
  } = {}) => {
    try {
      setLoading(true);
      const response = await profilesAPI.getAll({
        limit,
        page,
        includeIncomplete: true,
        search: search || undefined,
        ...(bustCache ? { _t: Date.now() } : {}),
      });

      setPeople(response.data || []);

      const apiPagination = response.pagination || {};
      const total = apiPagination.total ?? response.data?.length ?? 0;
      const effectiveLimit = apiPagination.limit ?? limit;
      const totalPages = apiPagination.totalPages ?? Math.max(1, Math.ceil(total / Math.max(1, effectiveLimit)));
      setPagination((prev) => ({
        ...prev,
        page: apiPagination.page ?? page,
        limit: effectiveLimit,
        total,
        totalPages,
      }));
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (person) => {
    setDeleteDialog({ isOpen: true, person });
  };

  const handleDeleteConfirm = async () => {
    const { person } = deleteDialog;
    if (!person) return;

    const personSlug = person.slug; // Store slug before closing dialog

    try {
      await profilesAPI.delete(personSlug);
      toast.success('Person deleted successfully');
      setDeleteDialog({ isOpen: false, person: null });

      // If we deleted the last person on a non-first page, go back one page.
      if (people.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        fetchPeople({ bustCache: true });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete person';
      toast.error(errorMessage);
      console.error('Error deleting person:', error);
      setDeleteDialog({ isOpen: false, person: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ isOpen: false, person: null });
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">People</h1>
            <p className="text-gray-500 mt-1">Manage team members and their profiles</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white text-gray-900 border-gray-300 hover:bg-gray-100"
              onClick={() => setDbModalOpen(true)}
            >
              <Database className="w-4 h-4" />
              Add from Database
            </Button>
            <Link to="/admin/people/new/edit">
              <Button className="flex items-center gap-2" style={{backgroundColor: '#4242ea'}}>
                <Plus className="w-4 h-4" />
                Add New Person
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name or title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total People</div>
              <div className="text-2xl font-bold mt-1">{pagination.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Open to Work (Page)</div>
              <div className="text-2xl font-bold mt-1">
                {people.filter(p => p.open_to_work).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">With Projects (Page)</div>
              <div className="text-2xl font-bold mt-1">
                {people.filter(p => p.project_count > 0).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* People List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {people.map((person) => (
                  <tr key={person.profile_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {person.photo_url ? (
                          <img 
                            src={getImageUrl(person.photo_url)} 
                            alt={person.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {person.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{person.name}</div>
                          <div className="text-sm text-gray-500">{person.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {person.skills?.slice(0, 3).map((skill, idx) => (
                          <Badge 
                            key={idx} 
                            className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 border-0"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {person.skills?.length > 3 && (
                          <Badge 
                            className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 border-0"
                          >
                            +{person.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {person.project_count || 0} projects
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {person.hired ? (
                        <Badge className="bg-gray-900 text-white hover:bg-gray-800 border-0">
                          {person.hired_company ? `Hired · ${person.hired_company}` : 'Hired'}
                        </Badge>
                      ) : person.open_to_work ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-0">
                          Open to Work
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">
                          Not Available
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/people/${person.slug}`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link to={`/admin/people/${person.slug}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(person)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing {people.length} of {pagination.total} people
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 min-w-[110px] text-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                >
                  Next
                </Button>
              </div>
            </div>

            {people.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No people found matching your search.
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        message={`Delete ${deleteDialog.person?.name || 'this person'}?`}
      />

      <AddFromDatabaseModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
      />
    </AdminLayout>
  );
}

export default AdminPeoplePage;

