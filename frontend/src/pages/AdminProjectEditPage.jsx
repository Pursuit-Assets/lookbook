import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectsAPI, profilesAPI, initiativesAPI, getImageUrl } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, ArrowLeft, Plus, X, Upload, Link as LinkIcon, Eye, Edit3, ExternalLink, Github, Rocket } from 'lucide-react';

function AdminProjectEditPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isNew = slug === 'new';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allPeople, setAllPeople] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    short_description: '',
    main_image_url: '',
    icon_url: '',
    demo_video_url: '',
    github_url: '',
    live_url: '',
    background_color: '#6366f1', // Default indigo color
    skills: [],
    sectors: [],
    participants: [], // Array of profile_ids
    slug: '',
    has_partner: false,
    partner_name: '',
    partner_logo_url: '',
    cohort: '' // Initiative cohort value
  });

  const [skillInput, setSkillInput] = useState('');
  const [sectorInput, setSectorInput] = useState('');
  const [imageInputMode, setImageInputMode] = useState('url'); // 'url' or 'upload'
  const [iconInputMode, setIconInputMode] = useState('url'); // 'url' or 'upload'
  const [partnerLogoInputMode, setPartnerLogoInputMode] = useState('url'); // 'url' or 'upload'
  const [editMode, setEditMode] = useState('form'); // 'form' or 'wysiwyg'

  // Helper function to adjust color brightness for gradients
  const adjustColor = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle main image file upload
  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, SVG, etc.)'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB'
      });
      return;
    }

    try {
      toast.info('Uploading image...', {
        description: 'Converting image to base64...'
      });
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, main_image_url: base64 });
      toast.success('Image uploaded!', {
        description: 'Image has been converted and will be saved with the project'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Upload failed', {
        description: 'Failed to process the image. Please try again.'
      });
    }
  };

  // Handle partner logo file upload
  const handlePartnerLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, SVG, etc.)'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an image smaller than 5MB'
      });
      return;
    }

    try {
      toast.info('Uploading partner logo...', {
        description: 'Converting image to base64...'
      });
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, partner_logo_url: base64 });
      toast.success('Partner logo uploaded!', {
        description: 'Logo has been converted and will be saved with the project'
      });
    } catch (error) {
      console.error('Error uploading partner logo:', error);
      toast.error('Upload failed', {
        description: 'Failed to process the partner logo. Please try again.'
      });
    }
  };

  // Handle icon file upload
  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, SVG, etc.)'
      });
      return;
    }

    // Validate file size (max 2MB for icons)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Please upload an icon smaller than 2MB'
      });
      return;
    }

    try {
      toast.info('Uploading icon...', {
        description: 'Converting icon to base64...'
      });
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, icon_url: base64 });
      toast.success('Icon uploaded!', {
        description: 'Icon has been converted and will be saved with the project'
      });
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast.error('Upload failed', {
        description: 'Failed to process the icon. Please try again.'
      });
    }
  };

  // Helper to convert regular Vimeo URLs to player embed URLs
  const normalizeVimeoUrl = (url) => {
    if (!url) return url;
    
    // Trim whitespace and remove leading @ symbol if present
    url = url.trim().replace(/^@+/, '');
    
    // If it's already a player URL, return as is
    if (url.includes('player.vimeo.com')) return url;
    
    // Match various Vimeo URL formats and extract video ID
    const patterns = [
      /vimeo\.com\/(\d+)/,           // https://vimeo.com/123456789
      /vimeo\.com\/video\/(\d+)/,    // https://vimeo.com/video/123456789
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }
    
    // If no pattern matches, return cleaned URL
    return url;
  };

  // Handle demo video URL change with automatic conversion
  const handleDemoVideoChange = (e) => {
    const rawUrl = e.target.value;
    const normalizedUrl = normalizeVimeoUrl(rawUrl);
    
    // Show a toast if we converted the URL
    if (rawUrl !== normalizedUrl && normalizedUrl) {
      toast.info('Vimeo URL converted', {
        description: 'Converted to player embed format'
      });
    }
    
    setFormData({ ...formData, demo_video_url: normalizedUrl });
  };

  useEffect(() => {
    fetchAllPeople();
    fetchInitiatives();
    if (!isNew) {
      fetchProject();
    }
  }, [slug, isNew]);

  const fetchAllPeople = async () => {
    try {
      const response = await profilesAPI.getAll();
      setAllPeople(response.data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const fetchInitiatives = async () => {
    try {
      const response = await initiativesAPI.getAll();
      setInitiatives(response.data || []);
    } catch (error) {
      console.error('Error fetching initiatives:', error);
    }
  };

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getBySlug(slug);
      const project = response.data;
      
      // Extract participant profile_ids from participants array
      const participantIds = project.participants ? project.participants.map(p => p.profile_id) : [];

      
      // Normalize the video URL if it exists
      const normalizedVideoUrl = project.demo_video_url ? normalizeVimeoUrl(project.demo_video_url) : '';
      
      setFormData({
        title: project.title || '',
        summary: project.summary || '',
        short_description: project.short_description || '',
        main_image_url: project.main_image_url || '',
        icon_url: project.icon_url || '',
        demo_video_url: normalizedVideoUrl,
        github_url: project.github_url || '',
        live_url: project.live_url || '',
        background_color: project.background_color || '#6366f1',
        skills: project.skills || [],
        sectors: project.sectors || [],
        participants: participantIds,
        slug: project.slug || '',
        has_partner: project.has_partner || false,
        partner_name: project.partner_name || '',
        partner_logo_url: project.partner_logo_url || '',
        cohort: project.cohort || ''
      });
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (isNew) {
        await projectsAPI.create(formData);
        toast.success('Project created successfully!', {
          description: `${formData.title} has been added to the lookbook.`
        });
      } else {
        await projectsAPI.update(slug, formData);
        toast.success('Project updated successfully!', {
          description: `Changes to ${formData.title} have been saved.`
        });
      }
      navigate('/admin/projects', { 
        state: { refresh: true, timestamp: Date.now() },
        replace: false
      });
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Failed to save project', {
        description: error.message || 'An error occurred. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addSector = () => {
    if (sectorInput.trim() && !formData.sectors.includes(sectorInput.trim())) {
      setFormData({ ...formData, sectors: [...formData.sectors, sectorInput.trim()] });
      setSectorInput('');
    }
  };

  const removeSector = (sector) => {
    setFormData({ ...formData, sectors: formData.sectors.filter(s => s !== sector) });
  };

  const addParticipant = (profileId) => {
    if (!formData.participants.includes(profileId)) {
      setFormData({ ...formData, participants: [...formData.participants, profileId] });
    }
    setParticipantSearch('');
  };

  const removeParticipant = (profileId) => {
    setFormData({ ...formData, participants: formData.participants.filter(id => id !== profileId) });
  };

  // Filter people based on search
  const filteredPeople = allPeople.filter(person => {
    if (!participantSearch) return false;
    const searchLower = participantSearch.toLowerCase();
    const name = (person.name || `${person.user?.first_name || ''} ${person.user?.last_name || ''}`).toLowerCase();
    const title = (person.title || '').toLowerCase();
    return (name.includes(searchLower) || title.includes(searchLower)) && !formData.participants.includes(person.profile_id);
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/projects')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? 'Add New Project' : `Edit ${formData.title}`}
            </h1>
            {/* Edit Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={editMode === 'form' ? 'default' : 'outline'}
                onClick={() => setEditMode('form')}
                className="flex items-center gap-2"
                style={editMode === 'form' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
              >
                <Edit3 className="w-4 h-4" />
                Form Mode
              </Button>
              <Button
                type="button"
                variant={editMode === 'wysiwyg' ? 'default' : 'outline'}
                onClick={() => setEditMode('wysiwyg')}
                className="flex items-center gap-2"
                style={editMode === 'wysiwyg' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
              >
                <Eye className="w-4 h-4" />
                WYSIWYG Mode
              </Button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {editMode === 'form' ? (
            // FORM MODE - Original form inputs
            <>
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="my-project"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Will appear in URL: /projects/[slug]</p>
              </div>

              <div>
                <Label htmlFor="short_description">Short Description</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                  rows={2}
                  placeholder="A brief 1-2 sentence description for grid view"
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label htmlFor="summary">Long Description</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={6}
                  placeholder="Detailed project description (supports multiple paragraphs)"
                  className="bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Use line breaks to create paragraphs</p>
              </div>
            </CardContent>
          </Card>

          {/* Project Partner */}
          <Card>
            <CardHeader>
              <CardTitle>Project Partner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_partner"
                  checked={formData.has_partner}
                  onChange={(e) => setFormData({ ...formData, has_partner: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="has_partner" className="cursor-pointer">
                  This project has a partner organization
                </Label>
              </div>

              {formData.has_partner && (
                <>
                  <div>
                    <Label htmlFor="partner_name">Partner Company Name</Label>
                    <Input
                      id="partner_name"
                      value={formData.partner_name}
                      onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                      placeholder="Enter partner company name..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="partner_logo_url">Partner Logo</Label>
                    
                    {/* Toggle between URL and Upload */}
                    <div className="flex gap-2 mb-3 mt-2">
                      <Button
                        type="button"
                        variant={partnerLogoInputMode === 'url' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPartnerLogoInputMode('url')}
                        className="flex items-center gap-2"
                        style={partnerLogoInputMode === 'url' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                      >
                        <LinkIcon className="w-4 h-4" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant={partnerLogoInputMode === 'upload' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPartnerLogoInputMode('upload')}
                        className="flex items-center gap-2"
                        style={partnerLogoInputMode === 'upload' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    </div>

                    {partnerLogoInputMode === 'url' ? (
                      <>
                        <Textarea
                          id="partner_logo_url"
                          value={formData.partner_logo_url}
                          onChange={(e) => setFormData({ ...formData, partner_logo_url: e.target.value })}
                          rows={3}
                          placeholder="https://example.com/partner-logo.png"
                          className="bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the URL of the partner logo
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handlePartnerLogoUpload}
                            className="flex-1 bg-white text-gray-900"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Upload a partner logo (PNG, JPG, SVG, max 5MB)
                        </p>
                      </>
                    )}

                    {/* Logo Preview */}
                    {formData.partner_logo_url && (
                      <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-2">Partner Logo Preview:</p>
                        <div className="bg-white p-4 rounded flex items-center justify-center" style={{minHeight: '120px'}}>
                          <img 
                            src={getImageUrl(formData.partner_logo_url)} 
                            alt="Partner logo preview" 
                            className="max-h-20 max-w-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'block';
                            }}
                          />
                          <p className="text-xs text-red-500" style={{display: 'none'}}>
                            Unable to load partner logo preview
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Initiative */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Initiative
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cohort">Assign to Initiative</Label>
                <select
                  id="cohort"
                  value={formData.cohort}
                  onChange={(e) => setFormData({ ...formData, cohort: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Initiative (show in all projects)</option>
                  {initiatives.map((initiative) => (
                    <option key={initiative.id} value={initiative.cohort_value}>
                      {initiative.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Assigning to an initiative will group this project with others in that cohort
                </p>
              </div>
              
              {formData.cohort && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <strong>Selected:</strong> {initiatives.find(i => i.cohort_value === formData.cohort)?.name || formData.cohort}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="main_image_url">Main Image</Label>
                
                {/* Toggle between URL and Upload */}
                <div className="flex gap-2 mb-3 mt-2">
                  <Button
                    type="button"
                    variant={imageInputMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImageInputMode('url')}
                    className="flex items-center gap-2"
                    style={imageInputMode === 'url' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                  >
                    <LinkIcon className="w-4 h-4" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={imageInputMode === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImageInputMode('upload')}
                    className="flex items-center gap-2"
                    style={imageInputMode === 'upload' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </div>

                {imageInputMode === 'url' ? (
                  <>
                    <Textarea
                      id="main_image_url"
                      value={formData.main_image_url}
                      onChange={(e) => setFormData({ ...formData, main_image_url: e.target.value })}
                      rows={3}
                      placeholder="Single URL or JSON array: ['url1', 'url2']"
                      className="bg-white text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      For multiple images, use JSON array format
                    </p>
                  </>
                ) : (
                  <>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="main_image_upload"
                        accept="image/*"
                        onChange={handleMainImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="main_image_upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG, SVG up to 5MB
                        </span>
                      </label>
                    </div>
                    {formData.main_image_url && formData.main_image_url.startsWith('data:') && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Image uploaded successfully
                      </div>
                    )}
                  </>
                )}

                {/* Image Preview */}
                {formData.main_image_url && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <img 
                      src={getImageUrl(formData.main_image_url)} 
                      alt="Main image preview" 
                      className="w-full h-48 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <p className="text-xs text-red-500 mt-1" style={{display: 'none'}}>
                      Unable to load image preview
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="icon_url">Project Icon</Label>
                
                {/* Toggle between URL and Upload */}
                <div className="flex gap-2 mb-3 mt-2">
                  <Button
                    type="button"
                    variant={iconInputMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIconInputMode('url')}
                    className="flex items-center gap-2"
                    style={iconInputMode === 'url' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                  >
                    <LinkIcon className="w-4 h-4" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant={iconInputMode === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIconInputMode('upload')}
                    className="flex items-center gap-2"
                    style={iconInputMode === 'upload' ? {backgroundColor: '#4242ea', color: 'white'} : {backgroundColor: 'white', color: '#374151'}}
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                </div>

                {iconInputMode === 'url' ? (
                  <>
                    <Input
                      id="icon_url"
                      value={formData.icon_url}
                      onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                      placeholder="https://example.com/icon.svg"
                      className="bg-white text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Square icon/logo for the project (SVG or PNG recommended)
                    </p>
                  </>
                ) : (
                  <>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        type="file"
                        id="icon_upload"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="icon_upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Click to upload icon
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG, SVG up to 2MB (square recommended)
                        </span>
                      </label>
                    </div>
                    {formData.icon_url && formData.icon_url.startsWith('data:') && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Icon uploaded successfully
                      </div>
                    )}
                  </>
                )}

                {/* Icon Preview */}
                {formData.icon_url && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <img 
                      src={formData.icon_url} 
                      alt="Project icon" 
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <p className="text-xs text-red-500 mt-1" style={{display: 'none'}}>
                      Unable to load icon preview
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="background_color">Background Color (if no image)</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    id="background_color"
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.background_color}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    {['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, background_color: color })}
                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                        style={{backgroundColor: color}}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Used as background when no image is provided. Click a preset or use custom color.
                </p>
              </div>

              <div>
                <Label htmlFor="demo_video_url">Demo Video URL</Label>
                <Textarea
                  id="demo_video_url"
                  value={formData.demo_video_url}
                  onChange={handleDemoVideoChange}
                  rows={3}
                  placeholder="Vimeo URL (will be auto-converted to embed format)"
                  className="bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste any Vimeo URL (e.g., https://vimeo.com/1234567) and it will be automatically converted to the embed format
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Project Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="github_url">GitHub URL</Label>
                <Input
                  id="github_url"
                  value={formData.github_url}
                  onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <Label htmlFor="live_url">Live Site URL</Label>
                <Input
                  id="live_url"
                  value={formData.live_url}
                  onChange={(e) => setFormData({ ...formData, live_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Technologies */}
          <Card>
            <CardHeader>
              <CardTitle>Technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a technology..."
                />
                <Button type="button" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-sm">{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Industries */}
          <Card>
            <CardHeader>
              <CardTitle>Industries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={sectorInput}
                  onChange={(e) => setSectorInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSector())}
                  placeholder="Add an industry..."
                />
                <Button type="button" onClick={addSector}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.sectors.map((sector, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 rounded-full text-white" style={{backgroundColor: '#4242ea'}}>
                    <span className="text-sm">{sector}</span>
                    <button
                      type="button"
                      onClick={() => removeSector(sector)}
                      className="hover:opacity-80"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Suggested: B2B, Fintech, Consumer, Education, Healthcare, Real Estate and Construction, Industrials, Government
              </p>
            </CardContent>
          </Card>

          {/* Project Team */}
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Search people by name..."
                />
                {/* Dropdown with filtered results */}
                {participantSearch && filteredPeople.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPeople.slice(0, 10).map((person) => (
                      <button
                        key={person.profile_id}
                        type="button"
                        onClick={() => addParticipant(person.profile_id)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
                      >
                        {person.photo_url && (
                          <img 
                            src={getImageUrl(person.photo_url)} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {person.name || `${person.user?.first_name || ''} ${person.user?.last_name || ''}`}
                          </div>
                          <div className="text-xs text-gray-500">{person.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Selected team members */}
              <div className="space-y-2">
                {formData.participants.map((profileId) => {
                  const person = allPeople.find(p => p.profile_id === profileId || p.id === profileId);
                  if (!person) return null;
                  
                  return (
                    <div key={profileId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {person.photo_url && (
                          <img 
                            src={getImageUrl(person.photo_url)} 
                            alt="" 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {person.name || `${person.user?.first_name || ''} ${person.user?.last_name || ''}`}
                          </div>
                          <div className="text-sm text-gray-500">{person.title}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeParticipant(profileId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {formData.participants.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No team members added yet. Search and add people above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
              style={{backgroundColor: '#4242ea'}}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Project'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/projects')}
              className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
            >
              Cancel
            </Button>
          </div>
          </>
          ) : (
            // WYSIWYG MODE - Live preview with inline editing
            <>
              <Card className="relative overflow-hidden rounded-xl border-0 shadow-md hover:shadow-2xl transition-all" style={{backgroundColor: 'white', height: '380px'}}>
                {/* Background Image or Color */}
                {formData.main_image_url ? (
                  <div className="absolute inset-0 z-0">
                    <img 
                      src={getImageUrl(formData.main_image_url)}
                      alt={formData.title}
                      className="w-full h-full object-cover opacity-90"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-0" style={{
                    background: `linear-gradient(135deg, ${formData.background_color || '#6366f1'} 0%, ${adjustColor(formData.background_color || '#6366f1', -30)} 100%)`
                  }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
                    {/* Display icon if available */}
                    {formData.icon_url && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <img 
                          src={getImageUrl(formData.icon_url)} 
                          alt={`${formData.title} icon`}
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
                
                <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
                  {/* Icon Badge (top-right) */}
                  {formData.icon_url && (
                    <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-lg shadow-lg p-2 flex items-center justify-center">
                      <img 
                        src={getImageUrl(formData.icon_url)} 
                        alt={`${formData.title} icon`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  
                  {/* Top Section - Title and Description */}
                  <div>
                    <h3 
                      className="font-bold text-white uppercase mb-3 leading-tight cursor-text hover:bg-white/10 px-2 py-1 rounded transition-colors" 
                      style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem'}}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => setFormData({ ...formData, title: e.target.textContent })}
                    >
                      {formData.title}
                    </h3>
                    {formData.short_description && (
                      <p 
                        className="text-white leading-snug mb-2 cursor-text hover:bg-white/10 px-2 py-1 rounded transition-colors" 
                        style={{fontSize: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setFormData({ ...formData, short_description: e.target.textContent })}
                      >
                        {formData.short_description}
                      </p>
                    )}
                    
                    {/* Project Partner */}
                    {formData.has_partner && (formData.partner_logo_url || formData.partner_name) && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-white text-xs opacity-75">Project Partner</span>
                        {formData.partner_logo_url ? (
                          <img 
                            src={getImageUrl(formData.partner_logo_url)}
                            alt={formData.partner_name || 'Partner'}
                            className="h-5 object-contain"
                            style={{
                              filter: 'brightness(0) invert(1)',
                              maxWidth: '120px'
                            }}
                          />
                        ) : (
                          <span className="text-white text-xs font-semibold">{formData.partner_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Section - Team and Category */}
                  <div>
                    {/* Project Team */}
                    <div className="mb-4">
                      <h4 className="text-white font-semibold mb-2" style={{fontSize: '14px'}}>Project Team</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {formData.participants.slice(0, 4).map((participantId, i) => {
                            const participant = allPeople.find(p => p.profile_id === participantId || p.id === participantId);
                            if (!participant) return null;
                            
                            return (
                              <div 
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold"
                                title={participant.name}
                              >
                                {participant.photo_url ? (
                                  <img 
                                    src={getImageUrl(participant.photo_url)}
                                    alt={participant.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{(participant.name || '').split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}</span>
                                )}
                              </div>
                            );
                          })}
                          {formData.participants.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                              +{formData.participants.length - 4}
                            </div>
                          )}
                        </div>
                        <p className="text-white text-sm">
                          {formData.participants.map(participantId => {
                            const participant = allPeople.find(p => p.profile_id === participantId || p.id === participantId);
                            if (!participant) return null;
                            const nameParts = (participant.name || '').split(' ');
                            return nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.` : participant.name;
                          }).filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Category Badge and Arrow */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {formData.sectors && formData.sectors.length > 0 ? (
                          formData.sectors.map((sector, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                              {sector}
                            </span>
                          ))
                        ) : formData.skills && formData.skills.length > 0 ? (
                          formData.skills.slice(0, 2).map((skill, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">
                              {skill}
                            </span>
                          ))
                        ) : null}
                      </div>
                      
                      {/* Arrow Button */}
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Cards Below */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Add Skills & Industries */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Technologies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        placeholder="Add technology..."
                        className="text-sm bg-white text-gray-900"
                      />
                      <Button type="button" onClick={addSkill} size="sm" className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.skills.map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 border-0 group relative"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="pt-3 border-t">
                      <h4 className="font-semibold text-sm mb-2">Industries</h4>
                      <div className="flex gap-2">
                        <Input
                          value={sectorInput}
                          onChange={(e) => setSectorInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSector())}
                          placeholder="Add industry..."
                          className="text-sm bg-white text-gray-900"
                        />
                        <Button type="button" onClick={addSector} size="sm" className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.sectors.map((sector, idx) => (
                          <Badge 
                            key={idx} 
                            className="text-xs group relative"
                            style={{backgroundColor: '#4242ea', color: 'white'}}
                          >
                            {sector}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - Summary, Links, Media */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">Long Description</Label>
                      <Textarea
                        value={formData.summary}
                        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        rows={4}
                        placeholder="Detailed description..."
                        className="mt-1 text-sm bg-white text-gray-900"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Demo Video URL</Label>
                      <Input
                        value={formData.demo_video_url}
                        onChange={handleDemoVideoChange}
                        placeholder="https://vimeo.com/... (will auto-convert)"
                        className="mt-1 bg-white text-gray-900"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">Background Color</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                          className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                        />
                        <Input
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                          placeholder="#6366f1"
                          className="flex-1 bg-white text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold">URL Slug</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="project-slug"
                        className="mt-1 bg-white text-gray-900"
                      />
                      <p className="text-xs text-gray-500 mt-1">Will appear in URL: /projects/{formData.slug}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Project'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/projects')}
                  className="bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </AdminLayout>
  );
}

export default AdminProjectEditPage;

