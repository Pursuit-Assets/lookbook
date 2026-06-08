import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { profilesAPI, taxonomyAPI, getImageUrl } from '../utils/api';
import { apiCache } from '../utils/cache';
import AdminLayout from '../components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Save, ArrowLeft, Plus, X, Eye, Edit3, Linkedin, Globe, Database } from 'lucide-react';

function AdminPersonEditPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = slug === 'new';

  const prefilledUserId = searchParams.get('userId');
  const prefilledFirstName = searchParams.get('firstName');
  const prefilledLastName = searchParams.get('lastName');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState('form'); // 'form' or 'wysiwyg'
  const [photoPreviewFailed, setPhotoPreviewFailed] = useState(false);
  
  // Taxonomy data
  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableIndustries, setAvailableIndustries] = useState([]);
  
  const [formData, setFormData] = useState({
    userId: null,
    name: '',
    title: '',
    bio: '',
    photo_url: '',
    linkedin_url: '',
    x_url: '',
    website_url: '',
    github_url: '',
    skills: [],
    industry_expertise: [],
    highlights: [],
    experience: [],
    open_to_work: false,
    featured: false,
    slug: ''
  });

  // Temporary inputs for arrays
  const [skillInput, setSkillInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');

  const generateSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').replace(/-+/g, '-');

  useEffect(() => {
    fetchTaxonomy();
    if (!isNew) {
      fetchPerson();
    } else if (prefilledUserId) {
      const fullName = `${prefilledFirstName} ${prefilledLastName}`.trim();
      setFormData(prev => ({
        ...prev,
        userId: parseInt(prefilledUserId, 10),
        name: fullName,
        slug: generateSlug(fullName)
      }));
    }
  }, [slug, isNew]);

  useEffect(() => {
    const url = formData.photo_url;
    if (!url || url.startsWith('data:image')) {
      setPhotoPreviewFailed(false);
      return;
    }

    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setPhotoPreviewFailed(false);
    };
    probe.onerror = () => {
      if (!cancelled) setPhotoPreviewFailed(true);
    };
    probe.src = getImageUrl(url);

    return () => {
      cancelled = true;
    };
  }, [formData.photo_url]);

  const fetchTaxonomy = async () => {
    try {
      const [skillsRes, industriesRes] = await Promise.all([
        taxonomyAPI.getAllSkills(),
        taxonomyAPI.getAllIndustries()
      ]);
      setAvailableSkills(skillsRes.data || []);
      setAvailableIndustries(industriesRes.data || []);
    } catch (error) {
      console.error('Error fetching taxonomy:', error);
    }
  };

  const fetchPerson = async () => {
    try {
      setLoading(true);
      const response = await profilesAPI.getBySlug(slug, { includeIncomplete: true });
      const person = response.data;
      
      setPhotoPreviewFailed(false);
      setFormData({
        name: person.name || '',
        title: person.title || '',
        bio: person.bio || '',
        photo_url: person.photo_url || person.photoUrl || '',
        linkedin_url: person.linkedin_url || '',
        x_url: person.x_url || '',
        website_url: person.website_url || '',
        github_url: person.github_url || '',
        skills: person.skills || [],
        industry_expertise: person.industry_expertise || [],
        highlights: person.highlights || [],
        experience: person.experience || [],
        open_to_work: person.openToWork || person.open_to_work || false,
        featured: person.featured || false,
        slug: person.slug || ''
      });
    } catch (error) {
      console.error('Error fetching person:', error);
    } finally {
      setLoading(false);
    }
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

  // Handle photo file upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please upload an image file (PNG, JPG, etc.)'
      });
      return;
    }

    try {
      // Show compression toast
      toast.info('Compressing image...', {
        description: 'This may take a moment for large images'
      });

      // Compression options
      const options = {
        maxSizeMB: 0.5,          // Max 500KB
        maxWidthOrHeight: 1024,   // Max dimension 1024px
        useWebWorker: true,
        fileType: file.type
      };

      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Show size reduction
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      
      toast.success('Image compressed!', {
        description: `Reduced from ${originalSizeMB}MB to ${compressedSizeMB}MB`
      });

      // Convert compressed file to base64
      const base64 = await fileToBase64(compressedFile);
      setPhotoPreviewFailed(false);
      setFormData(prev => ({ ...prev, photo_url: base64 }));
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to compress image', {
        description: 'Please try a different image'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Validation
    if (!formData.slug || formData.slug.trim() === '') {
      toast.error('Slug is required', {
        description: 'Please enter a URL slug for this profile'
      });
      setSaving(false);
      return;
    }
    
    // Validate slug format (alphanumeric, hyphens, underscores only)
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(formData.slug.trim())) {
      toast.error('Invalid slug format', {
        description: 'Slug can only contain lowercase letters, numbers, hyphens, and underscores'
      });
      setSaving(false);
      return;
    }
    
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Name is required', {
        description: 'Please enter a name for this profile'
      });
      setSaving(false);
      return;
    }
    
    const slugChanged = !isNew && formData.slug !== slug;
    
    try {
      if (isNew) {
        // Normalize slug (trim and lowercase)
        const normalizedFormData = {
          ...formData,
          slug: formData.slug.trim().toLowerCase()
        };
        const response = await profilesAPI.create(normalizedFormData);
        
        // Check if there's a warning about name update
        if (response?.warning) {
          toast.warning('Profile created with limitations', {
            description: response.warning
          });
        } else {
          toast.success('Person created successfully!', {
            description: `${formData.name} has been added to the lookbook.`
          });
        }
      } else {
        const response = await profilesAPI.update(slug, formData);
        const warning = response?.warning || '';
        const photoStillMissing = warning.toLowerCase().includes('photo');
        
        if (photoStillMissing) {
          toast.warning('Saved, but photo still needs upload', {
            description: warning
          });
        } else if (warning) {
          toast.success('Person updated successfully!', {
            description: warning
          });
        } else if (slugChanged) {
          toast.success('Person updated successfully!', {
            description: `Slug changed to ${formData.slug}. URL updated.`
          });
        } else {
          toast.success('Person updated successfully!', {
            description: `Changes to ${formData.name} have been saved.`
          });
        }

        apiCache.clear();

        if (photoStillMissing) {
          setSaving(false);
          return;
        }
      }
      
      // Clear the frontend cache to ensure fresh data is fetched
      apiCache.clear();
      
      navigate('/admin/people', { 
        state: { refresh: true, timestamp: Date.now() },
        replace: false
      });
    } catch (error) {
      console.error('Error saving person:', error);
      
      // Log the full error response for debugging
      if (error.response?.data) {
        console.error('Backend error response:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Try multiple ways to extract the error message
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.responseData?.error ||
        error.responseData?.message ||
        error.message || 
        'An error occurred. Please try again.';
      
      console.error('Error message that will be shown:', errorMessage);
      
      toast.error('Failed to save person', {
        description: errorMessage
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

  const addIndustry = () => {
    if (industryInput.trim() && !formData.industry_expertise.includes(industryInput.trim())) {
      setFormData({ ...formData, industry_expertise: [...formData.industry_expertise, industryInput.trim()] });
      setIndustryInput('');
    }
  };

  const removeIndustry = (industry) => {
    setFormData({ ...formData, industry_expertise: formData.industry_expertise.filter(i => i !== industry) });
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setFormData({ ...formData, highlights: [...formData.highlights, highlightInput.trim()] });
      setHighlightInput('');
    }
  };

  const removeHighlight = (index) => {
    setFormData({ ...formData, highlights: formData.highlights.filter((_, i) => i !== index) });
  };

  const addExperience = () => {
    setFormData({
      ...formData,
      experience: [...formData.experience, { role: '', org: '', dateFrom: '', dateTo: '' }]
    });
  };

  const updateExperience = (index, field, value) => {
    const updated = [...formData.experience];
    updated[index][field] = value;
    setFormData({ ...formData, experience: updated });
  };

  const removeExperience = (index) => {
    setFormData({ ...formData, experience: formData.experience.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/people')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to People
          </Button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? 'Add New Person' : `Edit ${formData.name}`}
            </h1>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={editMode === 'form' ? 'default' : 'outline'}
                onClick={() => setEditMode('form')}
                className="flex items-center gap-2"
                style={editMode === 'form' ? {backgroundColor: '#4242ea'} : {backgroundColor: 'white', color: '#1f2937', borderColor: '#d1d5db'}}
              >
                <Edit3 className="w-4 h-4" />
                Form Mode
              </Button>
              <Button
                type="button"
                variant={editMode === 'wysiwyg' ? 'default' : 'outline'}
                onClick={() => setEditMode('wysiwyg')}
                className="flex items-center gap-2"
                style={editMode === 'wysiwyg' ? {backgroundColor: '#4242ea'} : {backgroundColor: 'white', color: '#1f2937', borderColor: '#d1d5db'}}
              >
                <Eye className="w-4 h-4" />
                WYSIWYG Mode
              </Button>
            </div>
          </div>
        </div>

        {isNew && formData.userId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
            <Database className="w-4 h-4 shrink-0" />
            Creating profile for an existing database user — name and slug are pre-filled.
          </div>
        )}

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title/Role *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="john-doe"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Will appear in URL: /people/[slug]</p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  className="bg-white text-gray-900"
                />
              </div>

              <div>
                <Label htmlFor="photo_url">Photo URL</Label>
                <Input
                  id="photo_url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="open_to_work"
                  checked={formData.open_to_work}
                  onCheckedChange={(checked) => setFormData({ ...formData, open_to_work: checked })}
                />
                <Label htmlFor="open_to_work" className="cursor-pointer">Open to Work</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                />
                <Label htmlFor="featured" className="cursor-pointer">
                  Featured ⭐
                  <span className="ml-2 text-xs text-gray-500">(Ultra Premium card effect)</span>
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
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
                <Label htmlFor="x_url">X (Twitter) URL</Label>
                <Input
                  id="x_url"
                  value={formData.x_url}
                  onChange={(e) => setFormData({ ...formData, x_url: e.target.value })}
                  placeholder="https://x.com/..."
                />
              </div>
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected skills */}
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-md">
                {formData.skills.length === 0 ? (
                  <span className="text-sm text-gray-400">No skills selected</span>
                ) : (
                  formData.skills.map((skill, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 px-3 py-1"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-gray-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              {/* Available skills grid */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Available Skills (click to add)</Label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3 bg-white">
                  {/* Group by category */}
                  {Object.entries(
                    availableSkills.reduce((acc, skill) => {
                      const category = skill.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(skill);
                      return acc;
                    }, {})
                  ).map(([category, skills]) => (
                    <div key={category} className="mb-4 last:mb-0">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {category}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => {
                          const isSelected = formData.skills.includes(skill.name);
                          return (
                            <Badge
                              key={skill.id}
                              onClick={() => {
                                if (!isSelected) {
                                  setFormData({
                                    ...formData,
                                    skills: [...formData.skills, skill.name]
                                  });
                                }
                              }}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              } border-0`}
                              style={isSelected ? { pointerEvents: 'none' } : {}}
                            >
                              {skill.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry Expertise */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected industries */}
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-md">
                {formData.industry_expertise.length === 0 ? (
                  <span className="text-sm text-gray-400">No industries selected</span>
                ) : (
                  formData.industry_expertise.map((industry, idx) => (
                    <Badge 
                      key={idx} 
                      className="text-sm bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1 px-3 py-1"
                    >
                      <span>{industry}</span>
                      <button
                        type="button"
                        onClick={() => removeIndustry(industry)}
                        className="hover:text-gray-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              {/* Available industries */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Available Industries (click to add)</Label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {availableIndustries.map((industry) => {
                      const isSelected = formData.industry_expertise.includes(industry.name);
                      return (
                        <Badge
                          key={industry.id}
                          onClick={() => {
                            if (!isSelected) {
                              setFormData({
                                ...formData,
                                industry_expertise: [...formData.industry_expertise, industry.name]
                              });
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } border-0`}
                          style={isSelected ? { pointerEvents: 'none' } : {}}
                        >
                          {industry.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Highlights */}
          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                  placeholder="Add a highlight..."
                />
                <Button type="button" onClick={addHighlight}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-gray-50 p-3 rounded">
                    <span className="text-sm flex-1">{highlight}</span>
                    <button
                      type="button"
                      onClick={() => removeHighlight(idx)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Experience</span>
                <Button type="button" onClick={addExperience} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experience
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.experience.map((exp, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Experience {idx + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Role/Position</Label>
                      <Input
                        value={exp.role}
                        onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <Label>Organization</Label>
                      <Input
                        value={exp.org}
                        onChange={(e) => updateExperience(idx, 'org', e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <Label>From</Label>
                      <Input
                        value={exp.dateFrom}
                        onChange={(e) => updateExperience(idx, 'dateFrom', e.target.value)}
                        placeholder="Jan 2020"
                      />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input
                        value={exp.dateTo}
                        onChange={(e) => updateExperience(idx, 'dateTo', e.target.value)}
                        placeholder="Present"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {formData.experience.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No experience added yet. Click "Add Experience" to get started.
                </p>
              )}
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
              {saving ? 'Saving...' : 'Save Person'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/people')}
              style={{backgroundColor: 'white', color: '#1f2937', borderColor: '#d1d5db'}}
            >
              Cancel
            </Button>
          </div>
          </>
          ) : (
            // WYSIWYG MODE - Live preview with inline editing
            <>
              <Card className="rounded-xl border-2 border-gray-200 shadow-sm">
                <CardContent className="p-8">
                  {photoPreviewFailed && (
                    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      The saved photo file is missing on the server. Click the photo below, choose <strong>Upload New Photo</strong>, then save again.
                    </div>
                  )}
                  {/* Header with Photo and Name */}
                  <div className="flex items-start gap-6 mb-6">
                    {/* Profile Photo Card */}
                    <div className="flex-shrink-0 w-60">
                      <div 
                        className="rounded-lg overflow-hidden mb-4 bg-gray-100 border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors relative" 
                        style={{height: '270px'}}
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        {formData.photo_url ? (
                          <div className="relative group h-full">
                            <img 
                              src={getImageUrl(formData.photo_url)} 
                              alt={formData.name}
                              className="w-full h-full object-cover"
                              onError={() => setPhotoPreviewFailed(true)}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('photo-upload')?.click();
                                }}
                              >
                                Upload New Photo
                              </Button>
                              <div className="text-xs text-center text-white">or paste URL below:</div>
                              <Input
                                value={formData.photo_url}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setFormData({ ...formData, photo_url: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Photo URL"
                                className="w-5/6 bg-white text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
                            <div className="text-center p-4">
                              <div className="mb-4 text-6xl font-bold">{formData.name?.split(' ').map(n => n.charAt(0)).join('') || '?'}</div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('photo-upload')?.click();
                                }}
                              >
                                Upload Photo
                              </Button>
                              <div className="text-xs mt-3 mb-2">or paste URL:</div>
                              <Input
                                value={formData.photo_url}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setFormData({ ...formData, photo_url: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Photo URL"
                                className="text-xs mt-2 bg-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      
                      {/* Highlights */}
                      <Card className="bg-black border-black">
                        <CardContent className="p-4">
                          <h3 className="font-bold text-sm mb-3 text-white">Highlights</h3>
                          <div className="space-y-2">
                            {formData.highlights.map((highlight, idx) => (
                              <div key={idx} className="flex gap-2 items-start group">
                                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                  ✓
                                </div>
                                <div className="flex-1">
                                  <p 
                                    className="text-base text-white leading-snug cursor-text hover:bg-white/10 px-1 rounded"
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                      const updated = [...formData.highlights];
                                      updated[idx] = e.target.textContent;
                                      setFormData({ ...formData, highlights: updated });
                                    }}
                                    style={{fontSize: '14px'}}
                                  >
                                    {highlight}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeHighlight(idx)}
                                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                              <Input
                                value={highlightInput}
                                onChange={(e) => setHighlightInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                                placeholder="Add highlight..."
                                className="text-xs text-white placeholder:text-gray-400"
                              />
                              <Button type="button" onClick={addHighlight} size="sm">
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Name and Info */}
                    <div className="flex-1 pt-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-baseline gap-3">
                            <h1 
                              className="font-bold uppercase tracking-tight cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors border-2 border-transparent hover:border-gray-200"
                              style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '2rem'}}
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => setFormData({ ...formData, name: e.target.textContent })}
                            >
                              {formData.name}
                            </h1>
                            {formData.title && (
                              <p 
                                className="text-lg text-gray-600 cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors border-2 border-transparent hover:border-gray-200"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => setFormData({ ...formData, title: e.target.textContent })}
                              >
                                {formData.title}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {formData.linkedin_url && (
                            <Button 
                              size="icon" 
                              style={{ backgroundColor: '#0A66C2', color: 'white' }} 
                              className="hover:opacity-90"
                              onClick={() => {
                                const newUrl = prompt('LinkedIn URL:', formData.linkedin_url);
                                if (newUrl !== null) setFormData({ ...formData, linkedin_url: newUrl });
                              }}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </Button>
                          )}
                          {formData.x_url && (
                            <Button 
                              size="icon" 
                              style={{ backgroundColor: '#000000', color: 'white' }} 
                              className="hover:opacity-90"
                              onClick={() => {
                                const newUrl = prompt('X (Twitter) URL:', formData.x_url);
                                if (newUrl !== null) setFormData({ ...formData, x_url: newUrl });
                              }}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </Button>
                          )}
                          {formData.website_url && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => {
                                const newUrl = prompt('Website URL:', formData.website_url);
                                if (newUrl !== null) setFormData({ ...formData, website_url: newUrl });
                              }}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>
                          )}
                          {!formData.linkedin_url && !formData.x_url && !formData.website_url && (
                            <Button variant="outline" size="sm" onClick={() => {
                              const type = prompt('Add social link (linkedin/x/website):');
                              if (type) {
                                const url = prompt('Enter URL:');
                                if (url) {
                                  if (type === 'linkedin') setFormData({ ...formData, linkedin_url: url });
                                  else if (type === 'x') setFormData({ ...formData, x_url: url });
                                  else if (type === 'website') setFormData({ ...formData, website_url: url });
                                }
                              }
                            }}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Social
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Bio & Credentials */}
                      <div className="mb-4 pb-4 border-b">
                        <h2 className="text-lg font-bold mb-2">Bio & Credentials</h2>
                        <p 
                          className="text-gray-700 leading-snug cursor-text hover:bg-gray-50 px-2 py-1 rounded transition-colors border-2 border-transparent hover:border-gray-200"
                          style={{fontSize: '16px', minHeight: '60px'}}
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => setFormData({ ...formData, bio: e.target.textContent })}
                        >
                          {formData.bio || 'Click to add bio...'}
                        </p>
                      </div>

                      {/* Three Column Layout - Experience, Skills, Industry Expertise */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pt-2">
                        {/* Experience */}
                        <div>
                          <h3 className="text-lg font-bold mb-3">Experience & Education</h3>
                          {formData.experience && formData.experience.length > 0 ? (
                            <div className="space-y-3">
                              {formData.experience.map((exp, idx) => (
                                <div key={idx} className="flex gap-3 items-start group">
                                  <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center flex-shrink-0 font-bold text-lg" style={{color: '#4242ea'}}>
                                    {exp.org?.charAt(0) || '📄'}
                                  </div>
                                  <div className="flex-1">
                                    <div 
                                      className="font-semibold cursor-text hover:bg-gray-50 px-1 rounded"
                                      style={{fontSize: '16px'}}
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => updateExperience(idx, 'role', e.target.textContent)}
                                    >
                                      {exp.role}
                                    </div>
                                    <div 
                                      className="text-gray-600 cursor-text hover:bg-gray-50 px-1 rounded"
                                      style={{fontSize: '16px'}}
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => updateExperience(idx, 'org', e.target.textContent)}
                                    >
                                      {exp.org}
                                    </div>
                                    <div className="text-gray-500 mt-0.5 flex gap-1" style={{fontSize: '14px'}}>
                                      <span 
                                        className="cursor-text hover:bg-gray-50 px-1 rounded"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => updateExperience(idx, 'dateFrom', e.target.textContent)}
                                      >
                                        {exp.dateFrom || 'Start'}
                                      </span>
                                      <span>-</span>
                                      <span 
                                        className="cursor-text hover:bg-gray-50 px-1 rounded"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => updateExperience(idx, 'dateTo', e.target.textContent)}
                                      >
                                        {exp.dateTo || 'Present'}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeExperience(idx)}
                                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs mt-1 transition-opacity"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No experience listed</p>
                          )}
                          <Button type="button" onClick={addExperience} size="sm" variant="outline" className="mt-3 w-full" style={{backgroundColor: 'white', color: '#1f2937', borderColor: '#d1d5db'}}>
                            <Plus className="w-3 h-3 mr-1" />
                            Add Experience
                          </Button>
                        </div>

                        {/* Skills */}
                        <div>
                          <h3 className="text-lg font-bold mb-3">Skills</h3>
                          {formData.skills && formData.skills.length > 0 ? (
                            <div className="space-y-1">
                              {formData.skills.map((skill, idx) => (
                                <div key={idx} className="flex items-center justify-between group hover:bg-gray-50 px-2 py-1 rounded">
                                  <span className="text-gray-700" style={{fontSize: '14px'}}>
                                    • {skill}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeSkill(skill)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No skills listed</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Input
                              value={skillInput}
                              onChange={(e) => setSkillInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              placeholder="Add skill..."
                              className="text-sm"
                            />
                            <Button type="button" onClick={addSkill} size="sm">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Industry Expertise */}
                        <div>
                          <h3 className="text-lg font-bold mb-3">Industry Expertise</h3>
                          {formData.industry_expertise && formData.industry_expertise.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {formData.industry_expertise.map((industry, idx) => (
                                <div key={idx} className="group relative">
                                  <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-3 font-bold uppercase">
                                    {industry}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => removeIndustry(industry)}
                                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No industry expertise listed</p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Input
                              value={industryInput}
                              onChange={(e) => setIndustryInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIndustry())}
                              placeholder="Add industry..."
                              className="text-sm"
                            />
                            <Button type="button" onClick={addIndustry} size="sm">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* URL Slug and Open to Work - At the bottom */}
                      <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="slug-wysiwyg" className="text-sm font-semibold">URL Slug</Label>
                            <Input
                              id="slug-wysiwyg"
                              value={formData.slug}
                              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                              placeholder="john-doe"
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Will appear in URL: /people/{formData.slug}</p>
                          </div>
                          <div className="flex items-center">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="open_to_work-wysiwyg"
                                checked={formData.open_to_work}
                                onCheckedChange={(checked) => setFormData({ ...formData, open_to_work: checked })}
                              />
                              <Label htmlFor="open_to_work-wysiwyg" className="cursor-pointer">Open to Work</Label>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="featured-wysiwyg"
                                checked={formData.featured}
                                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                              />
                              <Label htmlFor="featured-wysiwyg" className="cursor-pointer">Featured ⭐</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
                  {saving ? 'Saving...' : 'Save Person'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/people')}
                  style={{backgroundColor: 'white', color: '#1f2937', borderColor: '#d1d5db'}}
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

export default AdminPersonEditPage;

