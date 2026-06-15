import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { profilesAPI, projectsAPI } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Upload, Download, FileText, Users, Briefcase, CheckCircle, XCircle, AlertCircle, Search, UserPlus } from 'lucide-react';

function AdminBulkUploadPage() {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState('people');
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bulk Add</h1>

        {/* Upload Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setUploadType('people'); setResults(null); setErrors([]); }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  uploadType === 'people'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: uploadType === 'people' ? '#4242ea' : '#6b7280' }} />
                <div className="font-semibold">People</div>
                <div className="text-sm text-gray-500 mt-1">Add existing users to the Lookbook</div>
              </button>

              <button
                onClick={() => { setUploadType('projects'); setResults(null); setErrors([]); }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  uploadType === 'projects'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Briefcase className="w-8 h-8 mx-auto mb-2" style={{ color: uploadType === 'projects' ? '#4242ea' : '#6b7280' }} />
                <div className="font-semibold">Projects</div>
                <div className="text-sm text-gray-500 mt-1">Upload projects via CSV</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {uploadType === 'people' ? (
          <PeopleBulkAdd results={results} setResults={setResults} errors={errors} setErrors={setErrors} />
        ) : (
          <ProjectsBulkUpload results={results} setResults={setResults} errors={errors} setErrors={setErrors} />
        )}

        {/* Results */}
        {results && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    {results.success}
                  </div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-2">
                    <XCircle className="w-6 h-6" />
                    {results.failed}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
                  {errors.map((err, idx) => (
                    <Alert key={idx} variant="destructive">
                      <AlertDescription>
                        <strong>{err.name || `User ${err.userId}`}</strong>: {err.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {results.success > 0 && (
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => navigate(uploadType === 'people' ? '/admin/people' : '/admin/projects')}
                    style={{ backgroundColor: '#4242ea' }}
                  >
                    View {uploadType === 'people' ? 'People' : 'Projects'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setResults(null); setErrors([]); }}
                    className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                  >
                    Add More
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

// =====================================================
// People: pick existing users from the database
// =====================================================

function PeopleBulkAdd({ results, setResults, errors, setErrors }) {
  const [users, setUsers] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (selectedCohort) filters.cohort = selectedCohort;
      const response = await profilesAPI.getAvailableUsers(filters);
      setUsers(response.data || []);
      setTotal(response.total || 0);
      if (response.cohorts) setCohorts(response.cohorts);
    } catch (error) {
      console.error('Error fetching available users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCohort]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleUser = (userId) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUserIds.size === users.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map(u => u.user_id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('No users selected');
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      const response = await profilesAPI.bulkCreate(Array.from(selectedUserIds));
      const data = response.data;

      setResults({
        success: data.success.length,
        failed: data.failed.length,
        total: data.success.length + data.failed.length
      });
      setErrors(data.failed || []);
      setSelectedUserIds(new Set());
      fetchUsers();

      if (data.failed.length === 0) {
        toast.success(`Added ${data.success.length} people to the Lookbook!`);
      } else if (data.success.length > 0) {
        toast.warning(`${data.success.length} added, ${data.failed.length} failed`);
      } else {
        toast.error('All entries failed');
      }
    } catch (error) {
      console.error('Error bulk creating profiles:', error);
      toast.error('Failed to create profiles');
    } finally {
      setSubmitting(false);
    }
  };

  const allSelected = users.length > 0 && selectedUserIds.size === users.length;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Users to Lookbook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Select users from the database to create Lookbook profiles for them. Only users who don't already have a profile are shown.
          </p>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[180px]"
            >
              <option value="">All cohorts</option>
              {cohorts.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Select all + count */}
          <div className="flex items-center justify-between mb-3 px-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAll}
                className="w-4 h-4 rounded border-gray-300"
                disabled={users.length === 0}
              />
              <span className="font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
            </label>
            <span className="text-sm text-gray-500">
              {total} user{total !== 1 ? 's' : ''} available
              {selectedUserIds.size > 0 && (
                <span className="ml-2 font-medium text-blue-600">
                  ({selectedUserIds.size} selected)
                </span>
              )}
            </span>
          </div>

          {/* User list */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm || selectedCohort
                  ? 'No matching users found'
                  : 'All users already have Lookbook profiles'}
              </div>
            ) : (
              users.map((user) => (
                <label
                  key={user.user_id}
                  className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                    selectedUserIds.has(user.user_id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(user.user_id)}
                    onChange={() => toggleUser(user.user_id)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {user.full_name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {user.email}
                    </div>
                  </div>
                  {user.cohort && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                      {user.cohort}
                    </span>
                  )}
                  {user.role && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                      {user.role}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={selectedUserIds.size === 0 || submitting}
            className="w-full mt-4 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#4242ea' }}
          >
            <UserPlus className="w-4 h-4" />
            {submitting
              ? 'Adding to Lookbook...'
              : `Add ${selectedUserIds.size || ''} ${selectedUserIds.size === 1 ? 'Person' : 'People'} to Lookbook`}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

// =====================================================
// Projects: CSV upload (unchanged)
// =====================================================

function ProjectsBulkUpload({ results, setResults, errors, setErrors }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const projectsTemplate = [
    ['title', 'slug', 'summary', 'short_description', 'main_image_url', 'demo_video_url', 'github_url', 'live_url', 'skills', 'sectors'],
    ['My Project', 'my-project', 'A comprehensive web application that does amazing things', 'An amazing web app', 'https://example.com/image.jpg', 'https://player.vimeo.com/video/123456', 'https://github.com/user/repo', 'https://myproject.com', 'React,Node.js,PostgreSQL', 'B2B,Technology']
  ];

  const downloadTemplate = async () => {
    const { default: Papa } = await import('papaparse');
    const csv = Papa.unparse(projectsTemplate);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projects_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Invalid file type', { description: 'Please upload a CSV file' });
        return;
      }
      setFile(selectedFile);
      setResults(null);
      setErrors([]);
      toast.info('File selected', { description: `${selectedFile.name} is ready to upload` });
    }
  };

  const parseCSV = async (file) => {
    const { default: Papa } = await import('papaparse');
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error) => reject(error)
      });
    });
  };

  const processProjectRow = (row) => {
    if (!row.title || !row.slug) {
      throw new Error('Missing required fields: title and slug are required');
    }

    const normalizedSlug = (row.slug || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!normalizedSlug) {
      throw new Error('Invalid slug: slug must contain at least one alphanumeric character');
    }

    return {
      title: row.title.trim(),
      slug: normalizedSlug,
      summary: row.summary || '',
      short_description: row.short_description || '',
      main_image_url: row.main_image_url || '',
      demo_video_url: row.demo_video_url || '',
      github_url: row.github_url || '',
      live_url: row.live_url || '',
      skills: row.skills ? row.skills.split(',').map(s => s.trim()).filter(s => s) : [],
      sectors: row.sectors ? row.sectors.split(',').map(s => s.trim()).filter(s => s) : []
    };
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('No file selected', { description: 'Please select a CSV file to upload' });
      return;
    }

    setUploading(true);
    setErrors([]);
    const successResults = [];
    const errorResults = [];

    try {
      const data = await parseCSV(file);
      toast.info('Processing file...', { description: `Uploading ${data.length} projects...` });

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const projectData = processProjectRow(row);
          // Bulk-uploaded projects start as drafts so they can be reviewed before publishing
          await projectsAPI.create({ ...projectData, status: 'draft' });
          successResults.push({ row: i + 1, name: projectData.title });
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
          errorResults.push({
            row: i + 1,
            name: row.title || 'Unknown',
            error: errorMessage
          });
        }
      }

      setResults({
        success: successResults.length,
        failed: errorResults.length,
        total: data.length
      });
      setErrors(errorResults);

      if (errorResults.length === 0) {
        toast.success(`Uploaded ${successResults.length} projects!`);
      } else if (successResults.length > 0) {
        toast.warning(`${successResults.length} succeeded, ${errorResults.length} failed`);
      } else {
        toast.error('All items failed to upload');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error processing file', { description: 'Please check the file format and try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Template Download */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Download the CSV template, fill in your data, and upload it back.
          </p>
          <Button
            onClick={downloadTemplate}
            variant="outline"
            className="flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
          >
            <Download className="w-4 h-4" />
            Download Projects Template
          </Button>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              CSV Format Guide:
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-6 list-disc">
              <li>Use commas to separate technologies or sectors (e.g., "React,Node.js")</li>
              <li>Slug must be unique and URL-friendly (e.g., "my-project")</li>
              <li>Use suggested sectors: B2B, Fintech, Consumer, Education, Healthcare, etc.</li>
              <li>URLs should be complete including https://</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium mb-1">
                  {file ? file.name : 'Click to upload CSV file'}
                </div>
                <div className="text-xs text-gray-500">CSV files only</div>
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full flex items-center justify-center gap-2"
              style={{ backgroundColor: '#4242ea' }}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Projects'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default AdminBulkUploadPage;
