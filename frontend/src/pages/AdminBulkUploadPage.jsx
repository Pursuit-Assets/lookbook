import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { profilesAPI, projectsAPI } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileText, Users, Briefcase, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function AdminBulkUploadPage() {
  const navigate = useNavigate();
  const [uploadType, setUploadType] = useState('people'); // 'people' or 'projects'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

  // CSV Templates
  const peopleTemplate = [
    ['name', 'title', 'slug', 'bio', 'photo_url', 'linkedin_url', 'x_url', 'website_url', 'skills', 'industry_expertise', 'highlights', 'open_to_work'],
    ['John Doe', 'Software Engineer', 'john-doe', 'Experienced full-stack developer', 'https://example.com/photo.jpg', 'https://linkedin.com/in/johndoe', '', 'https://johndoe.com', 'JavaScript,React,Node.js', 'Technology,Finance', 'Led team of 5 developers|Increased performance by 40%', 'true']
  ];

  const projectsTemplate = [
    ['title', 'slug', 'summary', 'short_description', 'main_image_url', 'demo_video_url', 'github_url', 'live_url', 'skills', 'sectors'],
    ['My Project', 'my-project', 'A comprehensive web application that does amazing things', 'An amazing web app', 'https://example.com/image.jpg', 'https://player.vimeo.com/video/123456', 'https://github.com/user/repo', 'https://myproject.com', 'React,Node.js,PostgreSQL', 'B2B,Technology']
  ];

  const downloadTemplate = async () => {
    const { default: Papa } = await import('papaparse');
    const template = uploadType === 'people' ? peopleTemplate : projectsTemplate;
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uploadType}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Invalid file type', {
          description: 'Please upload a CSV file'
        });
        return;
      }
      setFile(selectedFile);
      setResults(null);
      setErrors([]);
      toast.info('File selected', {
        description: `${selectedFile.name} is ready to upload`
      });
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

  const processPersonRow = (row) => {
    // Validate required fields
    if (!row.name || !row.slug) {
      throw new Error('Missing required fields: name and slug are required');
    }
    
    // Normalize slug (trim, lowercase, replace spaces with hyphens)
    const normalizedSlug = (row.slug || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    
    if (!normalizedSlug) {
      throw new Error('Invalid slug: slug must contain at least one alphanumeric character');
    }
    
    return {
      name: row.name.trim(),
      title: row.title || '',
      slug: normalizedSlug,
      bio: row.bio || '',
      photo_url: row.photo_url || '',
      linkedin_url: row.linkedin_url || '',
      x_url: row.x_url || '',
      website_url: row.website_url || '',
      skills: row.skills ? row.skills.split(',').map(s => s.trim()).filter(s => s) : [],
      industry_expertise: row.industry_expertise ? row.industry_expertise.split(',').map(s => s.trim()).filter(s => s) : [],
      highlights: row.highlights ? row.highlights.split('|').map(s => s.trim()).filter(s => s) : [],
      open_to_work: row.open_to_work === 'true' || row.open_to_work === '1',
      experience: []
    };
  };

  const processProjectRow = (row) => {
    // Validate required fields
    if (!row.title || !row.slug) {
      throw new Error('Missing required fields: title and slug are required');
    }
    
    // Normalize slug (trim, lowercase, replace spaces with hyphens)
    const normalizedSlug = (row.slug || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    
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
      toast.error('No file selected', {
        description: 'Please select a CSV file to upload'
      });
      return;
    }

    setUploading(true);
    setErrors([]);
    const successResults = [];
    const errorResults = [];

    try {
      const data = await parseCSV(file);
      toast.info('Processing file...', {
        description: `Uploading ${data.length} ${uploadType}...`
      });
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          if (uploadType === 'people') {
            const personData = processPersonRow(row);
            await profilesAPI.create(personData);
            successResults.push({ row: i + 1, name: personData.name });
          } else {
            const projectData = processProjectRow(row);
            await projectsAPI.create(projectData);
            successResults.push({ row: i + 1, name: projectData.title });
          }
        } catch (error) {
          const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
          errorResults.push({
            row: i + 1,
            name: row.name || row.title || 'Unknown',
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
        toast.success('Upload completed successfully!', {
          description: `Successfully uploaded ${successResults.length} ${uploadType}`
        });
      } else if (successResults.length > 0) {
        toast.warning('Upload completed with errors', {
          description: `${successResults.length} succeeded, ${errorResults.length} failed`
        });
      } else {
        toast.error('Upload failed', {
          description: 'All items failed to upload. Check the errors below.'
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Error processing file', {
        description: 'Please check the file format and try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bulk Upload</h1>

        {/* Upload Type Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Upload Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setUploadType('people');
                  setFile(null);
                  setResults(null);
                  setErrors([]);
                }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  uploadType === 'people'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-8 h-8 mx-auto mb-2" style={{color: uploadType === 'people' ? '#4242ea' : '#6b7280'}} />
                <div className="font-semibold">People</div>
                <div className="text-sm text-gray-500 mt-1">Upload multiple team members</div>
              </button>

              <button
                onClick={() => {
                  setUploadType('projects');
                  setFile(null);
                  setResults(null);
                  setErrors([]);
                }}
                className={`p-6 rounded-lg border-2 transition-all ${
                  uploadType === 'projects'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Briefcase className="w-8 h-8 mx-auto mb-2" style={{color: uploadType === 'projects' ? '#4242ea' : '#6b7280'}} />
                <div className="font-semibold">Projects</div>
                <div className="text-sm text-gray-500 mt-1">Upload multiple projects</div>
              </button>
            </div>
          </CardContent>
        </Card>

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
              Download {uploadType === 'people' ? 'People' : 'Projects'} Template
            </Button>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                CSV Format Guide:
              </h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-6 list-disc">
                {uploadType === 'people' ? (
                  <>
                    <li>Use commas to separate multiple skills or industries (e.g., "JavaScript,React,Node.js")</li>
                    <li>Use pipe | to separate highlights (e.g., "Led team|Increased performance")</li>
                    <li>Set open_to_work as "true" or "false"</li>
                    <li>Slug must be unique and URL-friendly (e.g., "john-doe")</li>
                  </>
                ) : (
                  <>
                    <li>Use commas to separate technologies or sectors (e.g., "React,Node.js")</li>
                    <li>Slug must be unique and URL-friendly (e.g., "my-project")</li>
                    <li>Use suggested sectors: B2B, Fintech, Consumer, Education, Healthcare, etc.</li>
                    <li>URLs should be complete including https://</li>
                  </>
                )}
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
                  <div className="text-xs text-gray-500">
                    CSV files only
                  </div>
                </label>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2"
                style={{backgroundColor: '#4242ea'}}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : `Upload ${uploadType === 'people' ? 'People' : 'Projects'}`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{results.total}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
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
                        <strong>Row {err.row}</strong> ({err.name}): {err.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {results.success > 0 && (
                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={() => navigate(uploadType === 'people' ? '/admin/people' : '/admin/projects')}
                    style={{backgroundColor: '#4242ea'}}
                  >
                    View {uploadType === 'people' ? 'People' : 'Projects'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setResults(null);
                      setErrors([]);
                    }}
                    className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                  >
                    Upload More
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

export default AdminBulkUploadPage;

