import { useState, useEffect, useLayoutEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { profilesAPI, projectsAPI, initiativesAPI, getImageUrl } from '../utils/api';
import analytics from '../utils/analytics';
import { useLoadingProgress } from '../contexts/LoadingProgressContext';
import { useAuth } from '../contexts/AuthContext';
import LazyVideo from '../components/LazyVideo';
import ProjectCardSkeleton from '../components/ProjectCardSkeleton';
import PersonCardSkeleton from '../components/PersonCardSkeleton';
// VirtualizedList requires react-window: npm install react-window
// import VirtualizedList from '../components/VirtualizedList';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Linkedin, Globe, Camera, Code, Rocket, Zap, Lightbulb, Target, Square, Grid3x3, List, ChevronLeft, ChevronRight, Menu, X, Frown, Search, Building2, Briefcase, Store, Sparkles, Sprout, MessageCircle } from 'lucide-react';
import ContactModal from '../components/ContactModal';
import AmbassadorCard from '../components/AmbassadorCard';
import AmbassadorDetailView from '../components/AmbassadorDetailView';

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

const isAmbassadorProject = (project) => {
  if (!project) return false;
  if (project.cohort === 'UFT AI Ambassadors') return true;
  if (typeof project.summary !== 'string') return false;

  try {
    const parsedSummary = JSON.parse(project.summary);
    return Boolean(parsedSummary && parsedSummary.ambassador_name);
  } catch {
    return false;
  }
};

const excludeAmbassadorProjects = (projects) =>
  (projects || []).filter((project) => !isAmbassadorProject(project));

const PEOPLE_GROUP_BUILDERS = 'builders';
const PEOPLE_GROUP_UFT = 'uft-ai-ambassadors';
const UFT_COHORT_VALUE = 'UFT AI Ambassadors';
const GRID_PAGE_SIZE = 8;

const buildPeopleNavListKey = ({ search, skills, industries, openToWork }) =>
  JSON.stringify({
    search: search || '',
    skills: [...(skills || [])].sort().join(','),
    industries: [...(industries || [])].sort().join(','),
    openToWork: Boolean(openToWork),
  });

const buildPeopleGridCacheKey = ({ page, search, skills, industries, openToWork }) =>
  `people:${page}:${buildPeopleNavListKey({ search, skills, industries, openToWork })}`;

const buildProjectsNavListKey = ({ search, skills, sectors, cohort }) =>
  JSON.stringify({
    search: search || '',
    skills: [...(skills || [])].sort().join(','),
    sectors: [...(sectors || [])].sort().join(','),
    cohort: cohort || '',
  });

const buildProjectsGridCacheKey = ({ page, search, skills, sectors, cohort }) =>
  `projects:${page}:${buildProjectsNavListKey({ search, skills, sectors, cohort })}`;

// Reusable Page Navigation Button Component
const PageNavButton = ({ onClick, onMouseEnter, disabled, direction = 'left', ariaLabel }) => {
  const isLeft = direction === 'left';
  const Icon = isLeft ? ChevronLeft : ChevronRight;
  const marginStyle = isLeft ? { marginRight: '5px' } : { marginLeft: '5px' };
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      className={`page-nav-button ${isLeft ? 'page-nav-button-left' : ''} h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center`}
      style={{
        color: disabled ? '#d1d5db' : '#4242ea',
        backgroundColor: '#ffffff',
        ...marginStyle
      }}
      aria-label={ariaLabel}
    >
      <Icon className="w-[30px] h-[30px]" strokeWidth={1.5} />
    </button>
  );
};

// Reusable Page Display Component
const PageDisplay = ({ current, total, viewMode, isList = false, totalCount = null, isDetail = false, hasContent = false, isLoading = false }) => {
  const width = isList 
    ? (viewMode === 'people' ? 'w-36' : 'w-40')
    : (viewMode === 'people' ? 'w-36' : 'w-40');
  const padding = isList ? 'px-[7.5px]' : 'px-[15px]';
  
  // Show loading indicator when loading
  if (isLoading) {
    return (
      <div className={`text-base text-gray-700 ${width} text-center bg-white rounded-md border-0 h-10 ${padding} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#4242ea]"></div>
        <span style={{marginLeft: '0.5em'}}>Loading...</span>
      </div>
    );
  }
  
  // When total is 0, show "0 Pages" or "0 People"/"0 Projects" with 0 in bold
  if (total === 0 && !hasContent) {
    const label = isDetail 
      ? (viewMode === 'people' ? 'People' : 'Projects')
      : 'Pages';
    return (
      <div className={`text-base text-gray-700 ${width} text-center bg-white rounded-md border-0 h-10 ${padding} flex items-center justify-center`}>
        <span className="font-bold">0</span> <span style={{marginLeft: '0.25em'}}>{label}</span>
      </div>
    );
  }
  
  if (isList && totalCount !== null) {
    return (
      <div className={`text-base text-gray-700 ${width} text-center bg-white rounded-md border-0 h-10 ${padding} flex items-center justify-center`}>
        <span className="font-bold">{totalCount}</span><span style={{marginLeft: '0.25em'}}>{viewMode === 'people' ? 'People' : 'Projects'}</span>
      </div>
    );
  }
  
  // In detail view, show "People" or "Projects" instead of "Pages"
  const label = isDetail 
    ? (viewMode === 'people' ? 'People' : 'Projects')
    : 'Pages';
  
  return (
    <div className={`text-base text-gray-700 ${width} text-center bg-white rounded-md border-0 h-10 ${padding} flex items-center justify-center`}>
      <span className="font-bold">{String(current).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.125em + 1px)', marginRight: '0.125em'}}>/</span>{String(Math.max(1, total)).padStart(2, '0')} <span style={{marginLeft: '0.25em'}}>{label}</span>
    </div>
  );
};

// Grid view pagination (People / Projects) — single source of truth for top + bottom bars
const GridPaginationBar = memo(({
  isLoading,
  currentPage,
  totalPages,
  totalItems,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onPrefetchPrev,
  onPrefetchNext,
  widthClass = 'w-36',
  displayClassName = '',
  barClassName = '',
}) => (
  <div className={`flex items-center ${barClassName}`}>
    <PageNavButton
      onClick={onPrev}
      onMouseEnter={onPrefetchPrev}
      disabled={!canPrev}
      direction="left"
      ariaLabel="Previous page"
    />
    <div className={`text-base text-gray-700 ${widthClass} text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center ${displayClassName}`}>
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[#4242ea]" />
          <span style={{ marginLeft: '0.5em' }}>Loading...</span>
        </>
      ) : totalItems === 0 ? (
        <>
          <span className="font-bold">0</span> <span style={{ marginLeft: '0.25em' }}>Pages</span>
        </>
      ) : (
        <>
          <span className="font-bold">{String(currentPage).padStart(2, '0')}</span>
          <span style={{ marginLeft: 'calc(0.125em + 1px)', marginRight: '0.125em' }}>/</span>
          {String(totalPages).padStart(2, '0')} <span style={{ marginLeft: '0.25em' }}>Pages</span>
        </>
      )}
    </div>
    <PageNavButton
      onClick={onNext}
      onMouseEnter={onPrefetchNext}
      disabled={!canNext}
      direction="right"
      ariaLabel="Next page"
    />
  </div>
));
GridPaginationBar.displayName = 'GridPaginationBar';

// Helper function to format name as "FirstName L."
const formatNameShort = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${firstName} ${lastInitial}.`;
};

// Helper function to convert video URLs to embeddable format
const getEmbedUrl = (url) => {
  if (!url) return url;
  
  // YouTube patterns
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  
  // Vimeo patterns
  const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[3]}`;
  }

  // Loom patterns: loom.com/share/ID or loom.com/embed/ID
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  // If already an embed URL, return as-is
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/') || url.includes('loom.com/embed/')) {
    return url;
  }
  
  // Return original URL if no pattern matches
  return url;
};

// ProfileCard component with holographic effect
const ProfileCard = ({ prof, onClick }) => {
  const [cardRef, setCardRef] = useState(null);
  const isFeatured = prof.featured === true;
  
  const handleMouseMove = (e) => {
    if (!cardRef) return;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Featured cards get more dramatic tilt (10 degrees vs 5 degrees)
    const maxRotation = isFeatured ? 10 : 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    // Featured cards lift higher on hover
    const liftAmount = isFeatured ? -8 : -4;
    cardRef.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${liftAmount}px)`;
    
    // Update holographic gradient position
    const holoElement = cardRef.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }

    // Update reflection position for featured cards
    if (isFeatured) {
      const reflectionElement = cardRef.querySelector('.reflection-effect');
      if (reflectionElement) {
        const xPercent = (x / rect.width) * 100;
        reflectionElement.style.backgroundPosition = `${xPercent}% 0`;
      }
    }
  };
  
  const handleMouseLeave = () => {
    if (!cardRef) return;
    cardRef.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };
  
  return (
    <div 
      ref={setCardRef}
      className={`rounded-xl person-card-wrapper ${isFeatured ? 'featured' : ''} person-card-cursor`}
      style={{
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card 
        className="rounded-xl border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden relative person-card"
        style={{
          backgroundColor: 'white', 
          aspectRatio: '3/4',
          borderRadius: '0.75rem'
        }}
        onClick={onClick}
      >
      {/* Background Image */}
      {(prof.photo_url || prof.photoUrl) && (
        <div className="absolute inset-0 z-0">
          <img 
            src={getImageUrl(prof.photo_url || prof.photoUrl)}
            alt={prof.name}
            className="w-full h-full object-cover opacity-90"
            loading="lazy"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70"></div>
          
          {/* Holographic Effect Overlay - Enhanced for featured */}
          <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
          
          {/* Ultra Premium effects - Only for featured cards */}
          {isFeatured && (
            <>
              {/* Foil texture */}
              <div className="foil-texture"></div>
              
              {/* Sparkle particles */}
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              <div className="sparkle" style={{zIndex: 20}}></div>
              
              {/* Reflection effect */}
              <div className="reflection-effect"></div>
            </>
          )}
        </div>
      )}
      {!(prof.photo_url || prof.photoUrl) && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-600 to-purple-600"></div>
      )}
      
      <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
        {/* Top Section - Name and Title Only */}
        <div>
          <h3 className="font-bold text-white uppercase mb-2 leading-none" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem'}}>{prof.name}</h3>
          {prof.title && (
            <p className="text-white mb-2" style={{fontSize: '14px', fontWeight: '500', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{prof.title}</p>
          )}
        </div>
        
        {/* Bottom Section - Bio, Skills and Status */}
        <div>
          {/* Bio */}
          {prof.bio && (
            <p className="text-white leading-snug mb-3 line-clamp-2" style={{fontSize: '13px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{prof.bio}</p>
          )}
          
          {/* Skills */}
          {prof.skills && prof.skills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2" style={{fontSize: '14px'}}>Skills</h4>
              <div className="flex flex-wrap gap-1">
                {prof.skills.slice(0, 5).map((skill, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                    {skill}
                  </span>
                ))}
                {prof.skills.length > 5 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                    +{prof.skills.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Industry Tags and Status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {prof.industry_expertise && prof.industry_expertise.slice(0, 2).map((industry, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                  {industry}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

// Memoize ProfileCard to prevent unnecessary re-renders
const MemoizedProfileCard = memo(ProfileCard, (prevProps, nextProps) => {
  return prevProps.prof.slug === nextProps.prof.slug && 
         prevProps.prof.featured === nextProps.prof.featured;
});

// ProjectCard component with holographic effect
const ProjectCard = ({ proj, onClick }) => {
  const [cardRef, setCardRef] = useState(null);
  const isFeatured = proj.featured === true;
  
  const handleMouseMove = (e) => {
    if (!cardRef) return;
    const rect = cardRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Featured cards get more dramatic tilt (10 degrees vs 5 degrees)
    const maxRotation = isFeatured ? 10 : 5;
    const rotateX = ((y - centerY) / centerY) * -maxRotation;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    
    // Featured cards lift higher on hover
    const liftAmount = isFeatured ? -8 : -4;
    cardRef.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(${liftAmount}px)`;
    
    // Update holographic gradient position
    const holoElement = cardRef.querySelector('.holo-effect');
    if (holoElement) {
      holoElement.style.backgroundPosition = `${(x / rect.width) * 100}% ${(y / rect.height) * 100}%`;
    }

    // Update reflection position for featured cards
    if (isFeatured) {
      const reflectionElement = cardRef.querySelector('.reflection-effect');
      if (reflectionElement) {
        const xPercent = (x / rect.width) * 100;
        reflectionElement.style.backgroundPosition = `${xPercent}% 0`;
      }
    }
  };
  
  const handleMouseLeave = () => {
    if (!cardRef) return;
    cardRef.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };
  
  const adjustColor = (color, amount) => {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00ff) + amount);
    const b = clamp((num & 0x0000ff) + amount);
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  };
  
  const formatNameShort = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length < 2) return name;
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };
  
  return (
    <div 
      ref={setCardRef}
      className={`rounded-xl project-card-wrapper ${isFeatured ? 'featured' : ''} project-card-cursor`}
      style={{
        overflow: 'hidden'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Card 
        className="rounded-xl border-0 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden relative project-card"
        style={{backgroundColor: 'white', aspectRatio: '3/4'}}
        onClick={onClick}
      >
        {/* Background Video or Image or Color */}
        {proj.card_background_video_url ? (
          <div className="absolute inset-0 z-0">
            <video
              src={proj.card_background_video_url}
              className="w-full h-full object-cover opacity-90"
              autoPlay
              muted
              loop
              playsInline
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
            
            {/* Holographic Effect Overlay - Enhanced for featured */}
            <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
            
            {/* Ultra Premium effects - Only for featured cards */}
            {isFeatured && (
              <>
                {/* Foil texture */}
                <div className="foil-texture"></div>
                
                {/* Sparkle particles */}
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                
                {/* Reflection effect */}
                <div className="reflection-effect"></div>
              </>
            )}
          </div>
        ) : (proj.card_background_url || proj.main_image_url) ? (
          <div className="absolute inset-0 z-0">
            <img 
              src={getImageUrl((() => {
                // Use card_background_url if available, otherwise use main_image_url
                const imageUrl = proj.card_background_url || proj.main_image_url;
                try {
                  const images = JSON.parse(imageUrl);
                  if (Array.isArray(images)) {
                    return typeof images[0] === 'string' ? images[0] : images[0].url;
                  }
                } catch {}
                return imageUrl;
              })())}
              alt={proj.title}
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80"></div>
            
            {/* Holographic Effect Overlay - Enhanced for featured */}
            <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
            
            {/* Ultra Premium effects - Only for featured cards */}
            {isFeatured && (
              <>
                {/* Foil texture */}
                <div className="foil-texture"></div>
                
                {/* Sparkle particles */}
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                
                {/* Reflection effect */}
                <div className="reflection-effect"></div>
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 z-0" style={{
            background: `linear-gradient(135deg, ${proj.background_color || '#6366f1'} 0%, ${adjustColor(proj.background_color || '#6366f1', -30)} 100%)`
          }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
            {/* Holographic Effect Overlay */}
            <div className={`holo-effect ${isFeatured ? 'featured' : ''} absolute inset-0 opacity-0 hover:opacity-30 transition-opacity duration-300 pointer-events-none`}></div>
            
            {/* Display icon if available */}
            {proj.icon_url && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <img 
                  src={getImageUrl(proj.icon_url)} 
                  alt={`${proj.title} icon`}
                  className="w-32 h-32 object-contain"
                />
              </div>
            )}
            
            {/* Ultra Premium effects - Only for featured cards */}
            {isFeatured && (
              <>
                {/* Foil texture */}
                <div className="foil-texture"></div>
                
                {/* Sparkle particles */}
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                <div className="sparkle" style={{zIndex: 20}}></div>
                
                {/* Reflection effect */}
                <div className="reflection-effect"></div>
              </>
            )}
          </div>
        )}
        
        <CardContent className="relative z-10 p-6 h-full flex flex-col justify-between">
          {/* Icon Badge (top-right) */}
          {proj.icon_url && (
            <div className="absolute top-4 right-4 w-12 h-12 bg-white rounded-lg shadow-lg p-2 flex items-center justify-center">
              <img 
                src={getImageUrl(proj.icon_url)} 
                alt={`${proj.title} icon`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          {/* Top Section - Title and Description */}
          <div>
            <h3 className="font-bold text-white uppercase mb-3 leading-none" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem'}}>{proj.title}</h3>
            {proj.short_description && (
              <p className="text-white leading-snug mb-2" style={{fontSize: '14px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>{proj.short_description}</p>
            )}
            
            {/* SMB Initiative Badge + Client - Card View */}
            {proj.cohort === 'SMB Winter 2025' ? (
              <div className="mt-3 mb-2">
                <div className="flex items-start gap-2">
                  {/* Sprout Icon */}
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full"
                         style={{
                           backgroundColor: 'rgba(16, 185, 129, 0.9)',
                           backdropFilter: 'blur(10px)',
                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                         }}>
                      <Sprout size={16} color="white" strokeWidth={2} />
                    </div>
                  </div>
                  
                  {/* Text and Client Info */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-white opacity-90">SMB Initiative</span>
                    
                    {/* Client */}
                    {proj.has_partner && (proj.partner_logo_url || proj.partner_name) && (
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm opacity-75">Client:</span>
                        {proj.partner_logo_url ? (
                          <img 
                            src={getImageUrl(proj.partner_logo_url)}
                            alt={proj.partner_name || 'Client'}
                            className="h-5 object-contain"
                            style={{
                              filter: 'brightness(0) invert(1)',
                              maxWidth: '120px'
                            }}
                          />
                        ) : (
                          <span className="text-white text-sm font-semibold">{proj.partner_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Non-SMB projects: Regular Project Partner Section */}
                {proj.has_partner && (proj.partner_logo_url || proj.partner_name) && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-white text-xs opacity-75">Project Partner</span>
                    {proj.partner_logo_url ? (
                      <img 
                        src={getImageUrl(proj.partner_logo_url)}
                        alt={proj.partner_name || 'Partner'}
                        className="h-5 object-contain"
                        style={{
                          filter: 'brightness(0) invert(1)',
                          maxWidth: '120px'
                        }}
                      />
                    ) : (
                      <span className="text-white text-xs font-semibold">{proj.partner_name}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Bottom Section - Team and Category */}
          <div>
            {/* Project Team */}
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2" style={{fontSize: '14px'}}>Project Team</h4>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                {proj.participants && proj.participants.slice(0, 4).map((participant, i) => (
                    <div 
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold"
                      title={participant.name || participant}
                    >
                      {(participant.photo_url || participant.photoUrl) ? (
                        <img 
                          src={getImageUrl(participant.photo_url || participant.photoUrl)}
                          alt={participant.name || participant}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(participant.name || participant).split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}</span>
                      )}
                  </div>
                ))}
                  {proj.participants && proj.participants.length > 4 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                      +{proj.participants.length - 4}
                    </div>
                  )}
                </div>
                <p className="text-white text-sm">
                  {proj.participants && proj.participants.map(p => formatNameShort(p.name || p)).join(', ')}
                </p>
              </div>
            </div>
            
            {/* Category Badge */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
              {proj.sectors && proj.sectors.length > 0 ? (
                  proj.sectors.map((sector, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-full bg-purple-600 text-white font-semibold uppercase" style={{fontSize: '10px'}}>
                      {sector}
                  </span>
                  ))
              ) : proj.skills && proj.skills.length > 0 ? (
                  proj.skills.slice(0, 2).map((skill, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold" style={{fontSize: '10px'}}>
                      {skill}
                  </span>
                  ))
                ) : null}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Memoize ProjectCard to prevent unnecessary re-renders
const MemoizedProjectCard = memo(ProjectCard, (prevProps, nextProps) => {
  return prevProps.proj.slug === nextProps.proj.slug && 
         prevProps.proj.featured === nextProps.proj.featured;
});

// Initiative definitions will be fetched from API

function PersonDetailPage() {
  const { slug, filterSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated: isAdminLoggedIn } = useAuth();
  
  // Check route shape. Project and People filters use different data sources.
  const isFilterUrl = location.pathname.startsWith('/projects/filter/');
  const isPeopleFilterUrl = location.pathname.startsWith('/people/filter/');
  const isUftPeopleDetail = location.pathname.startsWith('/people/uft/');
  // Initialize viewMode based on current URL path immediately
  const initialViewMode = location.pathname.startsWith('/projects') ? 'projects' : 'people';
  const [person, setPerson] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gridListLoading, setGridListLoading] = useState(true); // Loading state for grid/list views
  const [isRefreshing, setIsRefreshing] = useState(false); // Refetching while cached data is still on screen
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for progressive loading of additional projects
  const [slowLoadWarning, setSlowLoadWarning] = useState(false); // True after 5s of loading (cold start feedback)
  const [error, setError] = useState(null);
  const { startLoading, setLoadingProgress, completeLoading } = useLoadingProgress();
  const isFetchingRef = useRef(false); // Track if we're currently fetching to prevent multiple simultaneous fetches
  const filtersFetchedRef = useRef(false); // Track if filters have been fetched to prevent duplicate calls
  const fetchVersionRef = useRef(0); // Track fetch version to prevent stale responses from updating state
  const abortControllerRef = useRef(null); // AbortController to cancel in-flight requests on navigation
  const navigationListContextRef = useRef(null);
  const navigationListReadyRef = useRef(false);
  const gridPageCacheRef = useRef(new Map());
  const [allProfiles, setAllProfiles] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [ambassadorProjects, setAmbassadorProjects] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [viewMode, setViewMode] = useState(initialViewMode); // Initialize from URL
  const [layoutView, setLayoutView] = useState('grid'); // 'detail' or 'grid' - default to grid
  const [gridPage, setGridPage] = useState(0); // For grid pagination
  const [paginationPending, setPaginationPending] = useState(false); // Freeze pagination UI during tab/filter transitions
  const [totalProfiles, setTotalProfiles] = useState(0); // Total count from server
  const [totalProjects, setTotalProjects] = useState(0); // Total count from server
const [projectCarouselIndex, setProjectCarouselIndex] = useState(0); // For project carousel
  const [contactModalOpen, setContactModalOpen] = useState(false); // For contact modal

  // Track previous pathname to detect navigation away/back
  const prevPathnameRef = useRef(location.pathname);
  const isInitialMountRef = useRef(true);
  
  // Detect viewMode from URL - run this first
  useEffect(() => {
    const newViewMode = location.pathname.startsWith('/projects') ? 'projects' : 'people';
    const wasPeople = viewMode === 'people';
    const isPeople = newViewMode === 'people';
    const isPeopleOrProjectsRoute = location.pathname.startsWith('/people') || location.pathname.startsWith('/projects');
    const wasInPeopleOrProjectsBefore = prevPathnameRef.current && (prevPathnameRef.current.startsWith('/people') || prevPathnameRef.current.startsWith('/projects'));
    
    setViewMode(newViewMode);
    setFilterView(newViewMode);
    
    // Clear filters when switching between people and projects
    // BUT: Don't clear if we're on a filter URL (e.g., /projects/filter/smb-winter-2025)
    const isCurrentFilterUrl = location.pathname.includes('/filter/');
    if (wasPeople !== isPeople && !isCurrentFilterUrl) {
      // Switching between people and projects - reset everything including filters
      setPaginationPending(true);
      setGridPage(0);
      setError(null);
      setPerson(null);
      setProject(null);
      // Eagerly mark as loading so the empty-state message never flashes while
      // the data fetch (which runs in a separate useEffect) is in-flight.
      const switchTargetHasData = isPeople ? allProfiles.length > 0 : allProjects.length > 0;
      if (!switchTargetHasData) setGridListLoading(true);
      setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
      setPeopleSearchInput('');
      setProjectFilters({ search: '', skills: [], sectors: [] });
      setProjectSearchInput('');
      setSelectedInitiative(null);
      setSelectedPeopleGroup(PEOPLE_GROUP_BUILDERS);
      setSearchCommitted(false);
      setSearchFocused(false);
      setSearchHovered(false);
    }
    
    // Clear filters when navigating back to people/projects from another section
    // Skip on initial mount to avoid clearing filters on first load
    // BUT: Don't clear if we're on a filter URL
    if (!isInitialMountRef.current && !wasInPeopleOrProjectsBefore && isPeopleOrProjectsRoute && !isCurrentFilterUrl) {
      // Coming back to people/projects section - clear filters
      if (isPeople) {
        setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
        setPeopleSearchInput('');
        setSelectedPeopleGroup(PEOPLE_GROUP_BUILDERS);
      } else {
        setProjectFilters({ search: '', skills: [], sectors: [] });
        setProjectSearchInput('');
        setSelectedInitiative(null);
      }
      setSearchCommitted(false);
      setSearchFocused(false);
      setSearchHovered(false);
    }
    
    // Update refs after processing
    prevPathnameRef.current = location.pathname;
    isInitialMountRef.current = false;
  }, [location.pathname, viewMode]);
  
  // Sidebar state
  const [filterView, setFilterView] = useState(initialViewMode);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHovered, setSearchHovered] = useState(false);
  const [searchCommitted, setSearchCommitted] = useState(false); // Track if search has been committed with Enter
  const searchInputRef = useRef(null);
  const searchInputRefDesktop = useRef(null);
  
  // Filter state - separate input value from committed search value
  const [peopleSearchInput, setPeopleSearchInput] = useState(''); // What user types
  const [peopleFilters, setPeopleFilters] = useState({
    search: '', // Committed search value (applied to filtering)
    skills: [],
    industries: [],
    openToWork: false
  });
  const [availablePeopleFilters, setAvailablePeopleFilters] = useState({
    skills: [],
    industries: []
  });
  
  const [projectSearchInput, setProjectSearchInput] = useState(''); // What user types
  const [projectFilters, setProjectFilters] = useState({
    search: '', // Committed search value (applied to filtering)
    skills: [],
    sectors: []
  });
  const [availableProjectFilters, setAvailableProjectFilters] = useState({
    skills: [],
    sectors: []
  });
  
  // Initiative filter for projects (SMB Winter 2025, Demo Day Fall 2025, etc.)
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  // Project detail URLs are flat (`/projects/:slug`) and can't carry the active
  // initiative in the path. We persist it as an `?initiative=` query param so that
  // paging into a project keeps the list scoped to that initiative and keeps the
  // sidebar entry highlighted (instead of falling back to the full project list).
  const initiativeParam = useMemo(
    () => new URLSearchParams(location.search).get('initiative') || null,
    [location.search]
  );
  // `withInitiativeParam` is captured by memoized project cards whose `onClick` is
  // frozen at first render (their comparator only diffs `proj`). If this read
  // `selectedInitiative` directly, those stale closures would append the value from
  // the initial render — `null` before the initiative syncs from the URL — and drop
  // the `?initiative=` param. Reading from a ref keeps a single stable function that
  // always sees the live initiative, so paging/cards stay scoped to it.
  const selectedInitiativeRef = useRef(null);
  const withInitiativeParam = useCallback((path) => {
    const initiative = selectedInitiativeRef.current;
    return initiative
      ? `${path}?initiative=${encodeURIComponent(initiative)}`
      : path;
  }, []);
  // Keep the ref current every render so the stable callback above always reflects
  // the latest selected initiative, even from frozen memoized-card closures.
  selectedInitiativeRef.current = selectedInitiative;
  const [initiatives, setInitiatives] = useState([]);
  const [selectedPeopleGroup, setSelectedPeopleGroup] = useState(
    location.pathname.startsWith('/people/uft/') || location.pathname === `/people/filter/${PEOPLE_GROUP_UFT}`
      ? PEOPLE_GROUP_UFT
      : PEOPLE_GROUP_BUILDERS
  );
  const isUftPeopleMode = viewMode === 'people' && selectedPeopleGroup === PEOPLE_GROUP_UFT;
  const projectInitiatives = useMemo(
    // Hide initiatives with no published (active) projects — draft-only initiatives
    // shouldn't appear in the public sidebar
    () => initiatives.filter(initiative =>
      initiative.slug !== PEOPLE_GROUP_UFT && Number(initiative.project_count) > 0
    ),
    [initiatives]
  );
  const uftInitiative = useMemo(
    () => initiatives.find(initiative => initiative.slug === PEOPLE_GROUP_UFT),
    [initiatives]
  );

  // Search is commit-based (Enter key), so no debounce is needed — applying it
  // immediately avoids a dead delay between committing a search and fetching.
  const debouncedPeopleSearch = peopleFilters.search;
  const debouncedProjectSearch = projectFilters.search;

  // Derive the cohort value for the selected initiative. Using this scalar as an
  // effect dependency (instead of the `initiatives` array) prevents the main data
  // fetch from aborting and restarting when the initiatives list loads.
  const selectedCohortFilter = useMemo(
    () => (selectedInitiative ? initiatives.find(i => i.slug === selectedInitiative)?.cohort_value : undefined),
    [selectedInitiative, initiatives]
  );
  const initiativesLoaded = initiatives.length > 0;

  // Memoize filter arrays to prevent unnecessary re-renders
  // This creates stable references that only change when the actual values change
  const peopleSkillsFilter = useMemo(() => peopleFilters.skills, [JSON.stringify(peopleFilters.skills)]);
  const peopleIndustriesFilter = useMemo(() => peopleFilters.industries, [JSON.stringify(peopleFilters.industries)]);
  const projectSkillsFilter = useMemo(() => projectFilters.skills, [JSON.stringify(projectFilters.skills)]);
  const projectSectorsFilter = useMemo(() => projectFilters.sectors, [JSON.stringify(projectFilters.sectors)]);

  const showGridPagination =
    layoutView === 'grid' &&
    ((viewMode === 'projects' && !isFilterUrl && !selectedInitiative) ||
      (viewMode === 'people' && !isUftPeopleMode));

  const gridPagination = useMemo(() => {
    const totalItems = viewMode === 'people' ? totalProfiles : totalProjects;
    const totalPages = totalItems > 0 ? Math.max(1, Math.ceil(totalItems / GRID_PAGE_SIZE)) : 0;
    const clampedPage = totalPages === 0 ? 0 : Math.min(gridPage, totalPages - 1);
    const isLoading = gridListLoading || paginationPending;

    return {
      totalItems,
      totalPages,
      clampedPage,
      currentPage: clampedPage + 1,
      isLoading,
      canPrev: !isLoading && clampedPage > 0 && totalPages > 1,
      canNext: !isLoading && clampedPage < totalPages - 1 && totalPages > 1,
    };
  }, [
    viewMode,
    totalProfiles,
    totalProjects,
    gridPage,
    gridListLoading,
    paginationPending,
  ]);

  const goToPrevGridPage = useCallback(() => {
    setGridPage((page) => Math.max(0, page - 1));
  }, []);

  const goToNextGridPage = useCallback(() => {
    setGridPage((page) => {
      const maxPage = Math.max(0, gridPagination.totalPages - 1);
      return Math.min(maxPage, page + 1);
    });
  }, [gridPagination.totalPages]);

  // Prefetch next/previous page data on hover for instant pagination
  const prefetchPage = useCallback((pageOffset) => {
    if (gridPagination.isLoading || gridPagination.totalPages <= 1) return;
    const targetPage = gridPagination.clampedPage + pageOffset;
    const maxPage = gridPagination.totalPages - 1;

    // Only prefetch if target page is valid
    if (targetPage < 0 || targetPage > maxPage) return;

    const offset = targetPage * GRID_PAGE_SIZE;
    const limit = GRID_PAGE_SIZE;
    
    // Prefetch the data (will be cached)
    if (viewMode === 'people' && isUftPeopleMode) {
      projectsAPI.getAll({
        limit,
        offset,
        search: debouncedPeopleSearch,
        cohort: UFT_COHORT_VALUE,
        includeParticipants: true
      });
    } else if (viewMode === 'projects') {
      const cohortFilter = selectedInitiative 
        ? initiatives.find(i => i.slug === selectedInitiative)?.cohort_value 
        : undefined;
      const projectsCacheKey = buildProjectsGridCacheKey({
        page: targetPage,
        search: debouncedProjectSearch,
        skills: projectSkillsFilter,
        sectors: projectSectorsFilter,
        cohort: cohortFilter,
      });
      projectsAPI.getAll({
        limit,
        offset,
        search: debouncedProjectSearch,
        skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
        sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
        cohort: cohortFilter,
        excludeAmbassadors: true,
        includeParticipants: true
      }).then((response) => {
        if (!response?.success) return;
        const projectRows = excludeAmbassadorProjects(response.data);
        gridPageCacheRef.current.set(projectsCacheKey, {
          data: projectRows,
          total: response.pagination?.total || response.total || projectRows.length,
        });
      }).catch(() => {});
    } else {
      const cacheKey = buildPeopleGridCacheKey({
        page: targetPage,
        search: debouncedPeopleSearch,
        skills: peopleSkillsFilter,
        industries: peopleIndustriesFilter,
        openToWork: peopleFilters.openToWork,
      });
      profilesAPI.getAll({
        limit,
        offset,
        search: debouncedPeopleSearch,
        skills: peopleSkillsFilter.length > 0 ? peopleSkillsFilter : undefined,
        industries: peopleIndustriesFilter.length > 0 ? peopleIndustriesFilter : undefined,
        openToWork: peopleFilters.openToWork ? true : undefined
      }).then((response) => {
        if (!response?.success) return;
        const pageData = response.data || [];
        gridPageCacheRef.current.set(cacheKey, {
          data: pageData,
          total: response.pagination?.total || response.total || pageData.length,
        });
      }).catch(() => {});
    }
  }, [gridPagination, viewMode, debouncedProjectSearch, debouncedPeopleSearch, projectSkillsFilter, projectSectorsFilter, peopleSkillsFilter, peopleIndustriesFilter, peopleFilters.openToWork, selectedInitiative, initiatives, isUftPeopleMode, isFilterUrl]);

  // Filtered data based on search and filters
  const filteredProfiles = useMemo(() => allProfiles.filter(profile => {
    // Search filter (using debounced value)
    if (debouncedPeopleSearch) {
      const searchLower = debouncedPeopleSearch.toLowerCase();
      const matchesName = profile.name?.toLowerCase().includes(searchLower);
      const matchesBio = profile.bio?.toLowerCase().includes(searchLower);
      const matchesSkills = profile.skills?.some(skill => skill.toLowerCase().includes(searchLower));
      if (!matchesName && !matchesBio && !matchesSkills) return false;
    }
    
    // Skills filter
    if (peopleFilters.skills.length > 0) {
      const hasSkill = peopleFilters.skills.some(filterSkill => 
        profile.skills?.includes(filterSkill)
      );
      if (!hasSkill) return false;
    }
    
    // Industries filter
    if (peopleFilters.industries.length > 0) {
      const hasIndustry = peopleFilters.industries.some(filterIndustry => 
        profile.industry_expertise?.includes(filterIndustry)
      );
      if (!hasIndustry) return false;
    }
    
    // Open to work filter
    if (peopleFilters.openToWork && !profile.open_to_work) {
      return false;
    }
    
    return true;
  }), [allProfiles, debouncedPeopleSearch, peopleFilters.skills, peopleFilters.industries, peopleFilters.openToWork]);

  const filteredProjects = useMemo(() => {
    return allProjects.filter(project => {
      // UFT ambassadors belong under People only — never show in Projects
      if (isAmbassadorProject(project)) {
        return false;
      }
      // Initiative filter (cohort-based)
      if (selectedInitiative) {
        const initiative = initiatives.find(i => i.slug === selectedInitiative);
        if (initiative && project.cohort !== initiative.cohort_value) {
          return false;
        }
      }
      
      // Search filter (using debounced value)
      if (debouncedProjectSearch) {
        const searchLower = debouncedProjectSearch.toLowerCase();
        const matchesTitle = project.title?.toLowerCase().includes(searchLower);
        const matchesSummary = project.summary?.toLowerCase().includes(searchLower);
        const matchesDescription = project.short_description?.toLowerCase().includes(searchLower);
        const matchesSkills = project.skills?.some(skill => skill.toLowerCase().includes(searchLower));
        if (!matchesTitle && !matchesSummary && !matchesDescription && !matchesSkills) return false;
      }
      
      // Skills filter
      if (projectFilters.skills.length > 0) {
        const hasSkill = projectFilters.skills.some(filterSkill => 
          project.skills?.includes(filterSkill)
        );
        if (!hasSkill) return false;
      }
      
      // Sectors filter
      if (projectFilters.sectors.length > 0) {
        const hasSector = projectFilters.sectors.some(filterSector => 
          project.sectors?.includes(filterSector)
        );
        if (!hasSector) return false;
      }
      
      return true;
    });
  }, [allProjects, debouncedProjectSearch, projectFilters.skills, projectFilters.sectors, selectedInitiative, initiatives, isFilterUrl]);

  const filteredAmbassadorPeople = useMemo(() => {
    return ambassadorProjects.filter(project => {
      if (!isAmbassadorProject(project)) return false;

      if (debouncedPeopleSearch) {
        const searchLower = debouncedPeopleSearch.toLowerCase();
        const summary = typeof project.summary === 'string' ? project.summary : '';
        const matchesName = project.short_description?.toLowerCase().includes(searchLower);
        const matchesBuild = project.title?.toLowerCase().includes(searchLower);
        const matchesSummary = summary.toLowerCase().includes(searchLower);
        const matchesSkills = project.skills?.some(skill => skill.toLowerCase().includes(searchLower));
        if (!matchesName && !matchesBuild && !matchesSummary && !matchesSkills) return false;
      }

      return true;
    });
  }, [ambassadorProjects, debouncedPeopleSearch]);

  const filteredPeopleCards = isUftPeopleMode ? filteredAmbassadorPeople : filteredProfiles;

  // Filter person's projects - always show all projects for that person
  // Filters don't affect the "Select Projects" section on person detail pages
  const filteredPersonProjects = useMemo(() => {
    if (!person?.projects) {
      return [];
    }
    
    // Always return all projects for the person, regardless of filters
    // The "Select Projects" section should always show all projects
    const projectsArray = Array.isArray(person.projects) ? person.projects : [];
    return projectsArray;
  }, [person?.projects]);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setGridPage(0);
    setPaginationPending(true);
  }, [peopleFilters.skills, peopleFilters.industries, peopleFilters.openToWork, projectFilters.skills, projectFilters.sectors, debouncedPeopleSearch, debouncedProjectSearch, selectedInitiative, selectedPeopleGroup]);

  // Keep grid page in range when totals shrink (e.g. after filter/tab change)
  useEffect(() => {
    if (paginationPending || gridListLoading) return;
    if (gridPagination.clampedPage !== gridPage) {
      setGridPage(gridPagination.clampedPage);
    }
  }, [gridPagination.clampedPage, gridPage, paginationPending, gridListLoading]);

  // Reset carousel index when filtered person projects change
  useEffect(() => {
    setProjectCarouselIndex(0);
  }, [filteredPersonProjects.length, debouncedProjectSearch, projectSkillsFilter, projectSectorsFilter]);

  // Detail next/prev can reuse the loaded navigation list until filters change.
  useEffect(() => {
    navigationListReadyRef.current = false;
    navigationListContextRef.current = null;
  }, [
    debouncedPeopleSearch,
    debouncedProjectSearch,
    peopleSkillsFilter,
    peopleIndustriesFilter,
    peopleFilters.openToWork,
    projectSkillsFilter,
    projectSectorsFilter,
    selectedInitiative,
    selectedPeopleGroup,
  ]);

  // Fetch data based on current view
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      // Cancel any previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const isCurrentRequest = () => abortControllerRef.current === controller && !controller.signal.aborted;

      let slowLoadTimer = null;
      let progressBarActive = false;

      // On initiative-filtered project routes, wait for initiatives to load so we
      // can resolve the cohort before fetching. Otherwise we briefly fetch the
      // unfiltered projects list, then refetch with cohort once initiatives resolve.
      if (
        viewMode === 'projects' &&
        !initiativesLoaded &&
        (selectedInitiative || isFilterUrl)
      ) {
        return;
      }

      // Only show loading spinner when we have no data to display (avoids flicker when switching tabs)
      const hasCachedData =
        (viewMode === 'people' && (isUftPeopleMode ? ambassadorProjects.length > 0 : allProfiles.length > 0)) ||
        (viewMode === 'projects' && allProjects.length > 0);

      if (layoutView === 'grid' || layoutView === 'list') {
        isFetchingRef.current = true;
        if (isMounted && !hasCachedData) {
          progressBarActive = true;
          setGridListLoading(true);
          startLoading();
          setLoadingProgress(10); // Start at 10%
          slowLoadTimer = setTimeout(() => setSlowLoadWarning(true), 5000);
        } else if (isMounted) {
          // Keep showing the existing results, but dim them so the user can tell
          // a refresh is in progress instead of the new data snapping in silently.
          setIsRefreshing(true);
        }
      }
      
      if (layoutView === 'grid') {
        // Grid view: fetch paginated data (8 per page) OR all data for initiative filters
        // When on an initiative filter URL OR initiative is selected, show all projects without pagination
        const shouldPaginate = (!isFilterUrl && !selectedInitiative) || viewMode !== 'projects';
        const pageSize = 8;
        const offset = shouldPaginate ? gridPage * pageSize : 0;
        const limit = shouldPaginate ? pageSize : 100; // Fetch all for initiative filters
        
        if (viewMode === 'people' && isUftPeopleMode) {
          try {
            setLoadingProgress(30);
            const response = await projectsAPI.getAll({
              limit: 100,
              offset: 0,
              search: debouncedPeopleSearch,
              cohort: UFT_COHORT_VALUE,
              includeParticipants: true
            });

            if (controller.signal.aborted) return;
            setLoadingProgress(80);
            if (response && response.success) {
              setAmbassadorProjects(response.data || []);
              const total = response.pagination?.total || response.total || (response.data ? response.data.length : 0);
              setTotalProfiles(total);
            } else {
              console.error('API response error:', response);
              setAmbassadorProjects([]);
              setTotalProfiles(0);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching UFT ambassadors:', err);
            setAmbassadorProjects([]);
            setTotalProfiles(0);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        } else if (viewMode === 'people') {
          const peopleGridCacheKey = buildPeopleGridCacheKey({
            page: gridPage,
            search: debouncedPeopleSearch,
            skills: peopleSkillsFilter,
            industries: peopleIndustriesFilter,
            openToWork: peopleFilters.openToWork,
          });
          const cachedPeoplePage = gridPageCacheRef.current.get(peopleGridCacheKey);
          if (cachedPeoplePage) {
            setAllProfiles(cachedPeoplePage.data);
            setTotalProfiles(cachedPeoplePage.total);
            navigationListReadyRef.current = false;
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
            return;
          }

          try {
            if (progressBarActive) setLoadingProgress(30);
            const response = await profilesAPI.getAll({
              limit,
              offset,
              search: debouncedPeopleSearch,
              skills: peopleSkillsFilter.length > 0 ? peopleSkillsFilter : undefined,
              industries: peopleIndustriesFilter.length > 0 ? peopleIndustriesFilter : undefined,
              openToWork: peopleFilters.openToWork ? true : undefined
            });

            if (controller.signal.aborted) return;
            if (progressBarActive) setLoadingProgress(80);
            if (response && response.success) {
              const pageData = response.data || [];
              const total = response.pagination?.total || response.total || pageData.length;
              setAllProfiles(pageData);
              setTotalProfiles(total);
              gridPageCacheRef.current.set(peopleGridCacheKey, { data: pageData, total });
              navigationListReadyRef.current = false;
            } else {
              console.error('API response error:', response);
              setAllProfiles([]);
              setTotalProfiles(0);
            }
            if (progressBarActive) {
              setLoadingProgress(100);
              completeLoading();
            }
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching profiles:', err);
            setAllProfiles([]);
            setTotalProfiles(0);
            if (progressBarActive) {
              setLoadingProgress(100);
              completeLoading();
            }
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        } else if (viewMode === 'projects') {
          try {
            setLoadingProgress(30);
            const cohortFilter = selectedCohortFilter;
            // Use progressive loading for initiative filters to show results faster
            const useProgressiveLoading = (isFilterUrl || selectedInitiative) && !shouldPaginate;

            if (useProgressiveLoading) {
              // Progressive loading: fetch first page quickly, then load rest in background
              const initialResponse = await projectsAPI.getAll({
                limit: 8,
                offset: 0,
                search: debouncedProjectSearch,
                skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
                sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
                cohort: cohortFilter,
                excludeAmbassadors: true,
                includeParticipants: true
              });

              if (controller.signal.aborted) return;
              setLoadingProgress(80);
              if (initialResponse.success) {
                // Show first batch immediately
                const projectRows = excludeAmbassadorProjects(initialResponse.data);
                setAllProjects(projectRows);
                const total = initialResponse.pagination?.total || initialResponse.total || projectRows.length;
                setTotalProjects(total);
                if (slowLoadTimer) clearTimeout(slowLoadTimer);
                if (isCurrentRequest()) {
                  setSlowLoadWarning(false);
                  setGridListLoading(false); // Stop main loading spinner
                  setPaginationPending(false);
                  setIsRefreshing(false);
                  completeLoading();
                }

                // If there are more projects, fetch them in background
                if (total > 8 && isCurrentRequest()) {
                  setLoadingMore(true);
                  try {
                    const remainingResponse = await projectsAPI.getAll({
                      limit: 100,
                      offset: 8,
                      search: debouncedProjectSearch,
                      skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
                      sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
                      cohort: cohortFilter,
                      excludeAmbassadors: true,
                      includeParticipants: true
                    });

                    if (!controller.signal.aborted && remainingResponse.success) {
                      // Append remaining projects
                      setAllProjects((prev) => [
                        ...prev,
                        ...excludeAmbassadorProjects(remainingResponse.data),
                      ]);
                    }
                  } catch (bgErr) {
                    if (!controller.signal.aborted) {
                      console.error('Error fetching remaining projects:', bgErr);
                    }
                  } finally {
                    if (isCurrentRequest()) {
                      setLoadingMore(false);
                    }
                  }
                }
              }
              setLoadingProgress(100);
            } else {
              const projectsGridCacheKey = buildProjectsGridCacheKey({
                page: gridPage,
                search: debouncedProjectSearch,
                skills: projectSkillsFilter,
                sectors: projectSectorsFilter,
                cohort: cohortFilter,
              });
              const cachedProjectsPage = gridPageCacheRef.current.get(projectsGridCacheKey);
              if (cachedProjectsPage) {
                setAllProjects(cachedProjectsPage.data);
                setTotalProjects(cachedProjectsPage.total);
                navigationListReadyRef.current = false;
                if (slowLoadTimer) clearTimeout(slowLoadTimer);
                if (isCurrentRequest()) {
                  setSlowLoadWarning(false);
                  setGridListLoading(false);
                  setPaginationPending(false);
                  isFetchingRef.current = false;
                }
                return;
              }

              // Standard fetch for paginated views
              const response = await projectsAPI.getAll({
                limit,
                offset,
                search: debouncedProjectSearch,
                skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
                sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
                cohort: cohortFilter,
                excludeAmbassadors: true,
                includeParticipants: true
              });

              if (controller.signal.aborted) return;
              if (progressBarActive) setLoadingProgress(80);
              if (response.success) {
                const projectRows = excludeAmbassadorProjects(response.data);
                const total = response.pagination?.total || response.total || projectRows.length;
                setAllProjects(projectRows);
                setTotalProjects(total);
                gridPageCacheRef.current.set(projectsGridCacheKey, { data: projectRows, total });
                navigationListReadyRef.current = false;
              }
              if (progressBarActive) {
                setLoadingProgress(100);
                completeLoading();
              }
            }
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching projects:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        }
      } else if (layoutView === 'list') {
        // List view: fetch filtered data
        if (viewMode === 'people' && isUftPeopleMode) {
          try {
            setLoadingProgress(30);
            const response = await projectsAPI.getAll({
              limit: 100,
              search: debouncedPeopleSearch,
              cohort: UFT_COHORT_VALUE,
              includeParticipants: true
            });

            if (controller.signal.aborted) return;
            setLoadingProgress(80);
            if (response && response.success) {
              setAmbassadorProjects(response.data || []);
              const total = response.pagination?.total || response.total || (response.data ? response.data.length : 0);
              setTotalProfiles(total);
            } else {
              console.error('API response error:', response);
              setAmbassadorProjects([]);
              setTotalProfiles(0);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching UFT ambassadors:', err);
            setAmbassadorProjects([]);
            setTotalProfiles(0);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        } else if (viewMode === 'people') {
          try {
            setLoadingProgress(30);
            const response = await profilesAPI.getAll({
              limit: 100,
              search: debouncedPeopleSearch,
              skills: peopleSkillsFilter.length > 0 ? peopleSkillsFilter : undefined,
              industries: peopleIndustriesFilter.length > 0 ? peopleIndustriesFilter : undefined,
              openToWork: peopleFilters.openToWork ? true : undefined
            });

            if (controller.signal.aborted) return;
            setLoadingProgress(80);
            if (response && response.success) {
              setAllProfiles(response.data || []);
              const total = response.pagination?.total || response.total || (response.data ? response.data.length : 0);
              setTotalProfiles(total);
            } else {
              console.error('API response error:', response);
              setAllProfiles([]);
              setTotalProfiles(0);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching profiles:', err);
            setAllProfiles([]);
            setTotalProfiles(0);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        } else if (viewMode === 'projects') {
          try {
            setLoadingProgress(30);
            const cohortFilter = selectedCohortFilter;
            const response = await projectsAPI.getAll({
              limit: 100,
              search: debouncedProjectSearch,
              skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
              sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
              cohort: cohortFilter,
              excludeAmbassadors: true,
              includeParticipants: true
            });

            if (controller.signal.aborted) return;
            setLoadingProgress(80);
            if (response.success) {
              const projectRows = excludeAmbassadorProjects(response.data);
              setAllProjects(projectRows);
              const total = response.pagination?.total || response.total || projectRows.length;
              setTotalProjects(total);
            }
            setLoadingProgress(100);
            completeLoading();
          } catch (err) {
            if (controller.signal.aborted) return;
            console.error('Error fetching projects:', err);
            setLoadingProgress(100);
            completeLoading();
          } finally {
            if (slowLoadTimer) clearTimeout(slowLoadTimer);
            if (isCurrentRequest()) {
              setSlowLoadWarning(false);
              setGridListLoading(false);
              setPaginationPending(false);
              setIsRefreshing(false);
              isFetchingRef.current = false;
            }
          }
        }
      }
      // Detail view: Don't fetch filtered data - keep full unfiltered list for navigation
      // The detail view fetch happens in the slug-based useEffect which always fetches full list
    };

    fetchData();

    return () => {
      isMounted = false;
      isFetchingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // Note: depends on the derived `selectedCohortFilter` / `initiativesLoaded` scalars rather than
  // the `initiatives` array itself, so the fetch isn't aborted and restarted every time the
  // initiatives list resolves with a new array identity.
  }, [gridPage, viewMode, debouncedPeopleSearch, debouncedProjectSearch, peopleSkillsFilter, peopleIndustriesFilter, peopleFilters.openToWork, projectSkillsFilter, projectSectorsFilter, layoutView, selectedInitiative, selectedPeopleGroup, isUftPeopleMode, selectedCohortFilter, initiativesLoaded]);

  // Fetch filters and initiatives once on mount - these are cached
  useEffect(() => {
    // Only fetch once, unless filterSlug changes (for URL-based filtering)
    if (filtersFetchedRef.current && !filterSlug) {
      return;
    }
    
    const fetchFilters = async () => {
      // Prevent concurrent fetches
      if (filtersFetchedRef.current && !filterSlug) {
        return;
      }
      filtersFetchedRef.current = true;
      
      try {
        const [peopleFiltersData, projectFiltersData, initiativesData] = await Promise.all([
          profilesAPI.getFilters(),
          projectsAPI.getFilters(),
          // Admins bypass the 10-min HTTP cache so publish/unpublish reflects in
          // the sidebar immediately; public visitors keep the cached response.
          initiativesAPI.getAll(false, { fresh: isAdminLoggedIn })
        ]);
        
        if (peopleFiltersData && peopleFiltersData.success) {
          setAvailablePeopleFilters(peopleFiltersData.data || { skills: [], industries: [] });
        } else {
          console.error('Failed to fetch people filters:', peopleFiltersData);
          setAvailablePeopleFilters({ skills: [], industries: [] });
        }
        if (projectFiltersData && projectFiltersData.success) {
          setAvailableProjectFilters(projectFiltersData.data || { skills: [], sectors: [] });
        } else {
          console.error('Failed to fetch project filters:', projectFiltersData);
          setAvailableProjectFilters({ skills: [], sectors: [] });
        }
        if (initiativesData && initiativesData.success) {
          const loadedInitiatives = initiativesData.data || [];
          setInitiatives(loadedInitiatives);
          
          // If we have a filterSlug in the URL, apply it automatically
          if (filterSlug && viewMode === 'projects') {
            const matchingInitiative = loadedInitiatives.find(i => i.slug === filterSlug);
            if (matchingInitiative) {
              setSelectedInitiative(matchingInitiative.slug);
            }
          }
        } else {
          console.error('Failed to fetch initiatives:', initiativesData);
          setInitiatives([]);
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
        setAvailablePeopleFilters({ skills: [], industries: [] });
        setAvailableProjectFilters({ skills: [], sectors: [] });
        setInitiatives([]);
        filtersFetchedRef.current = false; // Allow retry on error
      }
    };
    fetchFilters();
  }, [filterSlug]); // Only re-run if filterSlug changes - filters are shared between tabs

  // Keep initiative state in sync with the URL. This prevents stale async filter
  // fetches from re-selecting an initiative after the user clears it.
  useEffect(() => {
    if (viewMode !== 'projects') return;

    // The active initiative comes from the filter-grid path (`/projects/filter/:slug`)
    // or, on a project detail page, the preserved `?initiative=` query param.
    const effectiveSlug = filterSlug || initiativeParam;

    if (!effectiveSlug) {
      if (selectedInitiative) {
        setSelectedInitiative(null);
      }
      return;
    }

    const matchingInitiative = initiatives.find(i => i.slug === effectiveSlug);

    // Initiatives with no published projects (e.g. draft-only) have no public filter
    // page — send visitors back to the main projects grid. Only applies to the filter
    // grid URL; a detail page carrying the param should still render normally.
    if (
      initiatives.length > 0 &&
      filterSlug &&
      filterSlug !== PEOPLE_GROUP_UFT &&
      matchingInitiative &&
      Number(matchingInitiative.project_count) === 0
    ) {
      navigate('/projects', { replace: true });
      return;
    }

    if (matchingInitiative && selectedInitiative !== matchingInitiative.slug) {
      setSelectedInitiative(matchingInitiative.slug);
    }
  }, [filterSlug, initiativeParam, initiatives, selectedInitiative, viewMode, navigate]);

  // UFT ambassadors live under People — redirect legacy Projects filter URLs
  useEffect(() => {
    if (viewMode === 'projects' && filterSlug === PEOPLE_GROUP_UFT) {
      navigate(`/people/filter/${PEOPLE_GROUP_UFT}`, { replace: true });
    }
  }, [viewMode, filterSlug, navigate]);

  // Keep People group state in sync with People URLs.
  useEffect(() => {
    if (viewMode !== 'people') return;

    const shouldShowUft = isUftPeopleDetail || (isPeopleFilterUrl && filterSlug === PEOPLE_GROUP_UFT);
    const nextGroup = shouldShowUft ? PEOPLE_GROUP_UFT : PEOPLE_GROUP_BUILDERS;
    if (selectedPeopleGroup !== nextGroup) {
      setSelectedPeopleGroup(nextGroup);
    }
  }, [filterSlug, isPeopleFilterUrl, isUftPeopleDetail, selectedPeopleGroup, viewMode]);

  useEffect(() => {
    // If no slug, default to grid view
    if (!slug) {
      setLayoutView('grid');
      setLoading(false);
      // Data will be fetched by the paginated useEffect
      return;
    }
    
    // Clear stale error immediately so previous navigation's error doesn't flash
    // on screen while the new fetch is in-flight.
    setError(null);

    // Guard: skip if the URL path doesn't match the current viewMode.
    // This prevents a race condition where setViewMode() fires before navigate()
    // updates the URL (e.g. switching from /people/:slug to /projects via the
    // tab button), causing a cross-mode fetch that returns 404 and shows
    // "Project not found" for a valid person slug.
    if (viewMode === 'projects' && !location.pathname.startsWith('/projects/')) return;
    if (viewMode === 'people' && !location.pathname.startsWith('/people/')) return;

    // Always increment fetch version so that a stale people-fetch (triggered when
    // viewMode hasn't updated yet) can't overwrite results from the correct fetch
    // that runs once viewMode catches up to the current URL.
    fetchVersionRef.current += 1;
    const currentFetchVersion = fetchVersionRef.current;
    
    // If there's a slug, show detail view
    setLayoutView('detail');
    
    // Check if we already have this person/project loaded
    // This prevents full page refresh when transitioning from grid to detail
    const hasExactData = (viewMode === 'people' && (isUftPeopleDetail ? project?.slug === slug : person?.slug === slug)) || 
                        (viewMode === 'projects' && project?.slug === slug);
    
    // Also check if the data is in our lists (from grid view)
    const hasDataInList = (viewMode === 'people' && (isUftPeopleDetail ? ambassadorProjects.some(p => p.slug === slug) : allProfiles.some(p => p.slug === slug))) ||
                          (viewMode === 'projects' && allProjects.some(p => p.slug === slug));
    
    // Only show loading screen if we don't have any data at all
    // If we have data in the list, we'll fetch full detail in background without showing loading
    // This makes the transition smooth like grid->list
    if (!hasExactData && !hasDataInList) {
    setLoading(true);
    } else {
      // We have some data, don't show loading screen - smooth transition like grid->list
      setLoading(false);
    }
    
    // On person detail view, filters should affect people (for navigation), not projects
    // The "Select Projects" section always shows all projects for that person
    if (viewMode === 'people') {
      setFilterView('people'); // Show people filters on person detail page
      // Don't clear project filters here - they're not used on person detail pages
    }
    
    if (viewMode === 'people' && isUftPeopleDetail) {
      const fetchUftPersonAndList = async () => {
        const hasBasicData = ambassadorProjects.some(p => p.slug === slug);
        if (hasBasicData) {
          setLoading(false);
        }

        startLoading();
        setLoadingProgress(10);
        try {
          setLoadingProgress(30);
          const [projectDataResult, listDataResult] = await Promise.allSettled([
            projectsAPI.getBySlug(slug),
            projectsAPI.getAll({
              limit: 100,
              search: debouncedPeopleSearch || undefined,
              cohort: UFT_COHORT_VALUE,
              includeParticipants: true
            })
          ]);

          if (currentFetchVersion !== fetchVersionRef.current) {
            return;
          }

          const projectData = projectDataResult.status === 'fulfilled'
            ? projectDataResult.value
            : (projectDataResult.reason?.response?.data || { success: false, error: 'UFT ambassador not found' });

          const listData = listDataResult.status === 'fulfilled'
            ? listDataResult.value
            : { success: false };

          setLoadingProgress(70);

          if (listData && listData.success) {
            setAmbassadorProjects(listData.data || []);
            setTotalProfiles(listData.data?.length || 0);
          }

          const ambassadorList = listData && listData.success ? listData.data : ambassadorProjects;

          if (projectData.success && isAmbassadorProject(projectData.data)) {
            const ambassadorProject = projectData.data;
            const index = ambassadorList.findIndex(p => p.slug === slug);

            setProject(ambassadorProject);
            setPerson(null);
            setCurrentIndex(index >= 0 ? index : -1);
            setError(null);
            analytics.projectViewed(
              ambassadorProject.slug,
              ambassadorProject.title,
              ambassadorProject.skills || [],
              ambassadorProject.sectors || []
            );
          } else {
            const errorMessage = projectData?.error || 'UFT ambassador not found';
            setError(errorMessage);
          }
          setLoadingProgress(100);
          completeLoading();
        } catch (err) {
          if (currentFetchVersion !== fetchVersionRef.current) {
            return;
          }
          console.error('Error fetching UFT ambassador:', err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || 'UFT ambassador not found';
          setError(errorMessage);
          setLoadingProgress(100);
          completeLoading();
        } finally {
          if (currentFetchVersion === fetchVersionRef.current) {
            setLoading(false);
          }
        }
      };
      fetchUftPersonAndList();
    } else if (viewMode === 'people') {
      const fetchPersonAndList = async () => {
        const navListKey = buildPeopleNavListKey({
          search: debouncedPeopleSearch,
          skills: peopleSkillsFilter,
          industries: peopleIndustriesFilter,
          openToWork: peopleFilters.openToWork,
        });
        const canReuseNavList =
          navigationListReadyRef.current &&
          navigationListContextRef.current === navListKey &&
          allProfiles.some((profile) => profile.slug === slug);

        if (canReuseNavList) {
          const listProfile = allProfiles.find((profile) => profile.slug === slug);
          setLoading(false);
          setPerson(listProfile);
          setProject(null);
          setCurrentIndex(allProfiles.findIndex((profile) => profile.slug === slug));
          setError(null);

          try {
            const personData = await profilesAPI.getBySlug(slug);
            if (currentFetchVersion !== fetchVersionRef.current) return;

            if (personData?.success) {
              setPerson(personData.data);
              analytics.personViewed(
                personData.data.slug,
                `${personData.data.first_name} ${personData.data.last_name}`,
                personData.data.skills || []
              );
            } else if (allProfiles.length === 0) {
              setPerson(null);
              setProject(null);
              setCurrentIndex(-1);
              setError(null);
            } else {
              setError(personData?.error || 'Person not found');
            }
          } catch (err) {
            if (currentFetchVersion !== fetchVersionRef.current) return;
            console.error('Error fetching person:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Person not found';
            setError(errorMessage);
          } finally {
            if (currentFetchVersion === fetchVersionRef.current) {
              setLoading(false);
            }
          }
          return;
        }

        const showDetailProgress = !hasExactData && !hasDataInList;
        if (showDetailProgress) {
          startLoading();
          setLoadingProgress(10);
        }
        try {
          if (showDetailProgress) setLoadingProgress(30);
          // Fetch both in parallel
          // In detail view, fetch filtered data from API (like grid/list) for navigation
          // This uses server-side filtering and avoids client-side filtering conflicts
          const [personDataResult, listDataResult] = await Promise.allSettled([
            profilesAPI.getBySlug(slug),
            profilesAPI.getAll({
              limit: 100,
              search: debouncedPeopleSearch || undefined,
              skills: peopleSkillsFilter.length > 0 ? peopleSkillsFilter : undefined,
              industries: peopleIndustriesFilter.length > 0 ? peopleIndustriesFilter : undefined,
              openToWork: peopleFilters.openToWork ? true : undefined
            })
          ]);
          
          // Check if this response is stale (user navigated to another item)
          if (currentFetchVersion !== fetchVersionRef.current) {
            return; // Discard stale response
          }
          
          // Extract results, handling both success and error cases
          const personData = personDataResult.status === 'fulfilled' 
            ? personDataResult.value 
            : (personDataResult.reason?.response?.data || { success: false, error: 'Person not found' });
          
          const listData = listDataResult.status === 'fulfilled'
            ? listDataResult.value
            : { success: false };
          
          if (showDetailProgress) setLoadingProgress(70);
          
          // Update allProfiles with filtered/unfiltered list from API (single source of truth)
          if (listData && listData.success) {
            setAllProfiles(listData.data);
            setTotalProfiles(listData.data.length);
            navigationListContextRef.current = navListKey;
            navigationListReadyRef.current = true;
          }
          
          const profiles = listData && listData.success ? listData.data : allProfiles;
          
          if (personData && personData.success) {
            const person = personData.data;
            
            // Check if current person is in the fetched list
            const currentPersonInList = profiles.some(p => p.slug === slug);
            
            if (currentPersonInList) {
              // Person is in the list, set it and update index
              setPerson(person);
            setProject(null);
            
            // Track person view
            analytics.personViewed(
                person.slug,
                `${person.first_name} ${person.last_name}`,
                person.skills || []
              );
              
              // Find current index in the list
            const index = profiles.findIndex(p => p.slug === slug);
              setCurrentIndex(index >= 0 ? index : -1);
            setError(null);
            } else if (profiles.length > 0) {
              // Person not in list but list has items - navigate to first in list
              // This will trigger a re-fetch with the new slug
              setPerson(null);
              setProject(null);
              setCurrentIndex(-1);
              setError(null);
              navigate(`/people/${profiles[0].slug}`);
              return; // Don't set error, navigation will handle it
          } else {
              // No results - clear person to show "no results" message
              setPerson(null);
              setProject(null);
              setCurrentIndex(-1);
              setError(null); // Clear error so "no results" message shows instead of "Not found"
            }
          } else {
            // Person fetch failed - check if it's because of filters or actual error
            if (profiles.length === 0) {
              // No results from filters - show "no results" message
              setPerson(null);
              setProject(null);
              setCurrentIndex(-1);
              setError(null);
            } else {
              // Actual error - person doesn't exist
              const errorMessage = personData?.error || 'Person not found';
              setError(errorMessage);
            }
          }
          if (showDetailProgress) {
            setLoadingProgress(100);
            completeLoading();
          }
        } catch (err) {
          // Check if this response is stale before updating error state
          if (currentFetchVersion !== fetchVersionRef.current) {
            return; // Discard stale error
          }
          console.error('Error fetching person:', err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Person not found';
          setError(errorMessage);
          if (showDetailProgress) {
            setLoadingProgress(100);
            completeLoading();
          }
        } finally {
          // Only update loading state if this is still the current request
          if (currentFetchVersion === fetchVersionRef.current) {
            setLoading(false);
          }
        }
      };
      fetchPersonAndList();
    } else if (viewMode === 'projects') {
      const fetchProjectAndList = async () => {
        const cohortFilter = selectedInitiative
          ? initiatives.find(i => i.slug === selectedInitiative)?.cohort_value
          : undefined;
        const navListKey = buildProjectsNavListKey({
          search: debouncedProjectSearch,
          skills: projectSkillsFilter,
          sectors: projectSectorsFilter,
          cohort: cohortFilter,
        });
        const canReuseNavList =
          navigationListReadyRef.current &&
          navigationListContextRef.current === navListKey &&
          allProjects.some((item) => item.slug === slug);

        if (canReuseNavList) {
          const listProject = allProjects.find((item) => item.slug === slug);
          setLoading(false);
          setProject(listProject);
          setPerson(null);
          setCurrentIndex(allProjects.findIndex((item) => item.slug === slug));
          setError(null);

          try {
            const projectData = await projectsAPI.getBySlug(slug);
            if (currentFetchVersion !== fetchVersionRef.current) return;

            if (projectData?.success) {
              if (isAmbassadorProject(projectData.data)) {
                navigate(`/people/uft/${slug}`, { replace: true });
                return;
              }
              setProject(projectData.data);
              analytics.projectViewed(
                projectData.data.slug,
                projectData.data.title,
                projectData.data.skills || [],
                projectData.data.sectors || []
              );
            } else if (allProjects.length === 0) {
              setProject(null);
              setPerson(null);
              setCurrentIndex(-1);
              setError(null);
            } else {
              setError(projectData?.error || 'Project not found');
            }
          } catch (err) {
            if (currentFetchVersion !== fetchVersionRef.current) return;
            console.error('Error fetching project:', err);
            const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Project not found';
            setError(errorMessage);
          } finally {
            if (currentFetchVersion === fetchVersionRef.current) {
              setLoading(false);
            }
          }
          return;
        }

        const hasBasicData = allProjects.some(p => p.slug === slug);
        if (hasBasicData) {
          setLoading(false); // Don't show loading screen
        }

        const showDetailProgress = !hasExactData && !hasDataInList && !hasBasicData;
        if (showDetailProgress) {
          startLoading();
          setLoadingProgress(10);
        }
        try {
          if (showDetailProgress) setLoadingProgress(30);
          // Fetch both in parallel
          // In detail view, fetch filtered data from API (like grid/list) for navigation
          // This uses server-side filtering and avoids client-side filtering conflicts
          const [projectDataResult, listDataResult] = await Promise.allSettled([
            projectsAPI.getBySlug(slug), // This already includes participants
            projectsAPI.getAll({
              limit: 100,
              search: debouncedProjectSearch || undefined,
              skills: projectSkillsFilter.length > 0 ? projectSkillsFilter : undefined,
              sectors: projectSectorsFilter.length > 0 ? projectSectorsFilter : undefined,
              cohort: cohortFilter,
              excludeAmbassadors: true,
              includeParticipants: false // Don't need participants for navigation list
            })
          ]);
          
          // Check if this response is stale (user navigated to another item)
          if (currentFetchVersion !== fetchVersionRef.current) {
            return; // Discard stale response
          }

          const projectData = projectDataResult.status === 'fulfilled'
            ? projectDataResult.value
            : (projectDataResult.reason?.response?.data || { success: false, error: 'Project not found' });

          const listData = listDataResult.status === 'fulfilled'
            ? listDataResult.value
            : { success: false };
          
          if (showDetailProgress) setLoadingProgress(70);
          
          // Update allProjects with filtered/unfiltered list from API (single source of truth)
          const listProjects = listData && listData.success
            ? (listData.data || []).filter((p) => !isAmbassadorProject(p))
            : allProjects.filter((p) => !isAmbassadorProject(p));

          setAllProjects(listProjects);
          setTotalProjects(listProjects.length);
          if (listData && listData.success) {
            navigationListContextRef.current = navListKey;
            navigationListReadyRef.current = true;
          }

          const projects = listProjects;
          
          if (projectData.success) {
            const project = projectData.data;

            if (isAmbassadorProject(project)) {
              navigate(`/people/uft/${slug}`, { replace: true });
              return;
            }
            
            // We successfully fetched the requested project, so always display it —
            // even when it's absent from the public navigation list (e.g. a draft
            // being previewed by an admin, or a project outside the active cohort
            // filter). The list only drives prev/next paging, so a missing entry
            // just falls back to index -1 (paging disabled) instead of silently
            // redirecting to a different project.
            setProject(project);
            setPerson(null);

            // Track project view
            analytics.projectViewed(
              project.slug,
              project.title,
              project.skills || [],
              project.sectors || []
            );

            const index = projects.findIndex(p => p.slug === slug);
            setCurrentIndex(index >= 0 ? index : -1);
            setError(null);
          } else {
            // Project fetch failed - check if it's because of filters or actual error
            if (projects.length === 0) {
              // No results from filters - show "no results" message
              setProject(null);
              setPerson(null);
              setCurrentIndex(-1);
              setError(null);
            } else {
              // Actual error - project doesn't exist
              const errorMessage = projectData?.error || 'Project not found';
              setError(errorMessage);
            }
          }
          if (showDetailProgress) {
            setLoadingProgress(100);
            completeLoading();
          }
        } catch (err) {
          // Check if this response is stale before updating error state
          if (currentFetchVersion !== fetchVersionRef.current) {
            return; // Discard stale error
          }
          console.error('Error fetching project:', err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Project not found';
          setError(errorMessage);
          if (showDetailProgress) {
            setLoadingProgress(100);
            completeLoading();
          }
        } finally {
          // Only update loading state if this is still the current request
          if (currentFetchVersion === fetchVersionRef.current) {
            setLoading(false);
          }
        }
      };
      fetchProjectAndList();
    } else {
      setLoading(false);
    }
  }, [slug, viewMode, debouncedPeopleSearch, debouncedProjectSearch, peopleSkillsFilter, peopleIndustriesFilter, peopleFilters.openToWork, projectSkillsFilter, projectSectorsFilter, selectedInitiative, selectedPeopleGroup, isUftPeopleDetail, initiatives]);

  // NOTE: Duplicate currentIndex update useEffect was removed - it caused race conditions
  // during rapid navigation. The main fetch useEffect above already handles currentIndex updates
  // atomically when data is loaded, preventing index/content desync.

  // Hide scrollbar on body/html only when in 4x2 grid view (4 columns, exactly 8 items)
  useLayoutEffect(() => {
    const updateScrollbar = () => {
      // Check if we're in grid view, 4-column layout (2xl breakpoint), and have exactly 8 items
      const is4ColumnView = window.innerWidth >= 1536; // 2xl breakpoint
      // Use total count from API, not filtered array length (which may be paginated)
      const itemCount = viewMode === 'people' ? totalProfiles : totalProjects;
      const isPerfect4x2 = layoutView === 'grid' && is4ColumnView && itemCount === 8;
      
      // Apply synchronously before browser paints to prevent flash
      if (isPerfect4x2) {
        document.body.classList.add('grid-view-page');
        document.documentElement.classList.add('grid-view-page');
        // Also set inline style immediately to prevent flash
        document.body.style.overflowY = 'hidden';
        document.documentElement.style.overflowY = 'hidden';
      } else {
        document.body.classList.remove('grid-view-page');
        document.documentElement.classList.remove('grid-view-page');
        document.body.style.overflowY = '';
        document.documentElement.style.overflowY = '';
      }
    };
    
    // Update immediately
    updateScrollbar();
    
    // Also listen for window resize to update when switching between column layouts
    window.addEventListener('resize', updateScrollbar);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', updateScrollbar);
      document.body.classList.remove('grid-view-page');
      document.documentElement.classList.remove('grid-view-page');
      document.body.style.overflowY = '';
      document.documentElement.style.overflowY = '';
    };
  }, [layoutView, viewMode, totalProfiles, totalProjects]);

  // Prefetch adjacent items for instant navigation
  useEffect(() => {
    if (currentIndex < 0 || layoutView !== 'detail') return;
    
    const prefetchAdjacent = async () => {
      if (viewMode === 'people' && isUftPeopleMode) {
        if (currentIndex < ambassadorProjects.length - 1) {
          const nextSlug = ambassadorProjects[currentIndex + 1]?.slug;
          if (nextSlug) {
            projectsAPI.getBySlug(nextSlug).catch(() => {});
          }
        }
        if (currentIndex > 0) {
          const prevSlug = ambassadorProjects[currentIndex - 1]?.slug;
          if (prevSlug) {
            projectsAPI.getBySlug(prevSlug).catch(() => {});
          }
        }
      } else if (viewMode === 'people') {
        // Prefetch next person
        if (currentIndex < allProfiles.length - 1) {
          const nextSlug = allProfiles[currentIndex + 1]?.slug;
          if (nextSlug) {
            profilesAPI.getBySlug(nextSlug).catch(() => {}); // Fire and forget
          }
        }
        // Prefetch previous person
        if (currentIndex > 0) {
          const prevSlug = allProfiles[currentIndex - 1]?.slug;
          if (prevSlug) {
            profilesAPI.getBySlug(prevSlug).catch(() => {}); // Fire and forget
          }
        }
      } else if (viewMode === 'projects') {
        // Prefetch next project
        if (currentIndex < allProjects.length - 1) {
          const nextSlug = allProjects[currentIndex + 1]?.slug;
          if (nextSlug) {
            projectsAPI.getBySlug(nextSlug).catch(() => {}); // Fire and forget
          }
        }
        // Prefetch previous project
        if (currentIndex > 0) {
          const prevSlug = allProjects[currentIndex - 1]?.slug;
          if (prevSlug) {
            projectsAPI.getBySlug(prevSlug).catch(() => {}); // Fire and forget
          }
        }
      }
    };
    
    // Delay prefetch slightly to not interfere with current page load
    const timer = setTimeout(prefetchAdjacent, 300);
    return () => clearTimeout(timer);
  }, [currentIndex, viewMode, allProfiles, allProjects, ambassadorProjects, layoutView, isUftPeopleMode]);

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      if (viewMode === 'people' && isUftPeopleMode) {
        const prevProject = ambassadorProjects[currentIndex - 1];
        if (prevProject) {
          analytics.navigation('previous', project?.slug, prevProject.slug);
          navigate(`/people/uft/${prevProject.slug}`);
        }
      } else if (viewMode === 'people') {
        const prevProfile = allProfiles[currentIndex - 1];
        if (prevProfile) {
        analytics.navigation('previous', person?.slug, prevProfile.slug);
        navigate(`/people/${prevProfile.slug}`);
        }
      } else {
        const prevProject = allProjects[currentIndex - 1];
        if (prevProject) {
        analytics.navigation('previous', project?.slug, prevProject.slug);
        navigate(withInitiativeParam(`/projects/${prevProject.slug}`));
        }
      }
    }
  };

  const handleNext = () => {
    const maxLength = viewMode === 'people' && isUftPeopleMode
      ? ambassadorProjects.length
      : viewMode === 'people'
      ? allProfiles.length
      : allProjects.length;
    if (currentIndex < maxLength - 1) {
      if (viewMode === 'people' && isUftPeopleMode) {
        const nextProject = ambassadorProjects[currentIndex + 1];
        if (nextProject) {
          analytics.navigation('next', project?.slug, nextProject.slug);
          navigate(`/people/uft/${nextProject.slug}`);
        }
      } else if (viewMode === 'people') {
        const nextProfile = allProfiles[currentIndex + 1];
        if (nextProfile) {
        analytics.navigation('next', person?.slug, nextProfile.slug);
        navigate(`/people/${nextProfile.slug}`);
        }
      } else {
        const nextProject = allProjects[currentIndex + 1];
        if (nextProject) {
        analytics.navigation('next', project?.slug, nextProject.slug);
        navigate(withInitiativeParam(`/projects/${nextProject.slug}`));
        }
      }
    }
  };

  const handleTabSwitch = (tab) => {
    // Always navigate to the new view (grid/list) when switching tabs
    // This ensures clicking "PROJECTS" shows the projects grid view
    if (tab !== viewMode) {
      setGridListLoading(true);
      setPaginationPending(true);
    }
    setFilterView(tab);
    setCurrentIndex(-1);
    setGridPage(0); // Reset grid page when switching between people and projects
    setMobileMenuOpen(false); // Close mobile menu when switching tabs
    setPerson(null);
    setProject(null);
    
    // Clear filters when switching tabs
    setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
    setPeopleSearchInput('');
    setProjectFilters({ search: '', skills: [], sectors: [] });
    setProjectSearchInput('');
    setSelectedInitiative(null);
    setSelectedPeopleGroup(PEOPLE_GROUP_BUILDERS);
    setSearchCommitted(false);
    setSearchFocused(false);
    setSearchHovered(false);
    
    // Navigate to base route (grid view will be set by useEffect if no slug)
    if (tab === 'people') {
      navigate('/people');
    } else if (tab === 'projects') {
      navigate('/projects');
    }
  };

  const beginFilterTransition = () => {
    setGridPage(0);
    setPaginationPending(true);
    setLoadingMore(false);
    setSlowLoadWarning(false);
    if (layoutView === 'grid' || layoutView === 'list') {
      setGridListLoading(true);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        // In grid view, navigate between pages
        if (layoutView === 'grid' && showGridPagination && !gridPagination.isLoading) {
          if (gridPagination.canPrev) {
            goToPrevGridPage();
          }
        } else {
          // In detail view, navigate between items
          handlePrevious();
        }
      } else if (e.key === 'ArrowRight') {
        // In grid view, navigate between pages
        if (layoutView === 'grid' && showGridPagination && !gridPagination.isLoading) {
          if (gridPagination.canNext) {
            goToNextGridPage();
          }
        } else {
          // In detail view, navigate between items
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, viewMode, filteredPeopleCards, filteredProjects, allProjects, ambassadorProjects, layoutView, gridPage, showGridPagination, gridPagination, goToPrevGridPage, goToNextGridPage, handlePrevious, handleNext]);

  const canGoPrevious = currentIndex > 0;
  // Use allProfiles/allProjects directly - they are already filtered when filters are active (from API)
  const currentLength = viewMode === 'people' && isUftPeopleMode
    ? ambassadorProjects.length
    : viewMode === 'people'
    ? allProfiles.length
    : allProjects.length;
  // Next button should be active if we're not on the last item
  const canGoNext = currentIndex >= 0 && currentIndex < currentLength - 1;

  // Only show loading screen if we're actually loading and don't have data yet
  // This prevents full page refresh when transitioning from grid to detail
  const hasDetailContent = viewMode === 'people'
    ? (isUftPeopleDetail ? project : person)
    : project;
  const isActuallyLoading = loading && !hasDetailContent;
  if (isActuallyLoading && slug) return <div className="min-h-screen" style={{backgroundColor: '#e3e3e3'}}></div>;
  // Only show error if we're done loading and viewMode has been set
  if (error && slug && !loading && viewMode) return <div className="flex items-center justify-center min-h-screen text-red-500" style={{backgroundColor: '#e3e3e3'}}>{error}</div>;
  // Show "Not found" only if we have an error AND it's not a "no results" scenario
  // If filters result in no results, show the "no results" message in the content area instead
  if (!person && !project && slug && layoutView === 'detail' && !loading && error && 
      !(viewMode === 'people' && allProfiles.length === 0) && 
      !(viewMode === 'projects' && allProjects.length === 0)) {
    return <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: '#e3e3e3'}}>Not found</div>;
  }

  const initials = person?.name?.split(' ').map(n => n.charAt(0)).join('') || project?.title?.charAt(0) || '?';

  return (
    <div className="flex" style={{backgroundColor: '#e3e3e3', width: '100%', maxWidth: '100vw', overflowX: 'hidden', minHeight: '100vh'}}>
      {/* Logo - Top Left - Fixed */}
      <div className="fixed left-2 lg:left-5 top-2 lg:top-4 z-50">
        <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          <img 
            src="/pursuit-wordmark.png" 
            alt="Pursuit" 
            className="h-8"
          />
          <span className="text-sm lg:text-base hidden lg:inline">Lookbook</span>
        </a>
      </div>

      {/* Mobile: Fixed Top Right - Search, View Toggles, and Hamburger in one unit */}
      <div className="lg:hidden fixed top-2 right-2 z-50 flex items-center gap-2">
        <div 
          className="relative"
          style={{
            paddingTop: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '20px' : '0',
            paddingBottom: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '20px' : '0',
            marginTop: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '-20px' : '0',
            marginBottom: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '-20px' : '0',
            overflow: 'visible'
          }}
          onMouseEnter={() => setSearchHovered(true)}
          onMouseLeave={() => {
            const currentInput = viewMode === 'people' ? peopleSearchInput : projectSearchInput;
            const currentCommitted = viewMode === 'people' ? peopleFilters.search : projectFilters.search;
            
            // If there's uncommitted text (user typed but didn't hit Enter), collapse
            if (currentInput && currentInput !== currentCommitted) {
              setSearchHovered(false);
              setSearchFocused(false);
              if (searchInputRef.current) {
                searchInputRef.current.blur();
              }
              // Clear uncommitted input
              if (viewMode === 'people') {
                setPeopleSearchInput('');
              } else {
                setProjectSearchInput('');
              }
            } else if (!currentCommitted) {
              // If no committed search and no input, collapse
              setSearchHovered(false);
              setSearchFocused(false);
              if (searchInputRef.current) {
                searchInputRef.current.blur();
              }
            }
            // If there's a committed search, don't collapse on mouse leave - keep tray open
          }}
        >
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-in-out"
            style={{ 
              marginLeft: searchHovered && !searchFocused ? '10px' : '0', 
              opacity: (searchFocused || searchCommitted) ? 0 : 1,
              zIndex: 1
            }}
          >
            <Search 
              className="w-[25px] h-[25px]" 
              strokeWidth={1.5}
              style={{ color: '#4242ea' }}
            />
          </div>
          {searchHovered && !searchFocused && (
            <span 
              className="absolute pointer-events-none whitespace-nowrap text-base md:text-sm"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(calc(-50% + 22.5px), -50%)', // 22.5px = (25px icon + 20px gap) / 2
                color: '#d1d5db',
                fontSize: '16px',
                zIndex: 10,
                opacity: 0,
                animation: 'fadeInText 0.1s ease-in-out 0.3s forwards',
                willChange: 'opacity',
                display: (viewMode === 'people' ? peopleFilters.search : projectFilters.search) ? 'none' : 'block'
              }}
            >
              Click to search
            </span>
          )}
            <Input
            ref={searchInputRef}
            value={searchCommitted ? (viewMode === 'people' ? peopleFilters.search : projectFilters.search) : (viewMode === 'people' ? peopleSearchInput : projectSearchInput)}
              onChange={(e) => {
                if (viewMode === 'people') {
                setPeopleSearchInput(e.target.value);
                } else {
                setProjectSearchInput(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                // Commit the search
                beginFilterTransition();
                if (viewMode === 'people') {
                  setPeopleFilters({ ...peopleFilters, search: peopleSearchInput });
                } else {
                  setProjectFilters({ ...projectFilters, search: projectSearchInput });
                }
                setSearchCommitted(true);
                // Remove focus to make it inactive (no cursor)
                if (searchInputRef.current) {
                  searchInputRef.current.blur();
                }
              }
            }}
            onFocus={() => {
              setSearchFocused(true);
              // If there's a committed search, uncommit it when user clicks to search again
              if (searchCommitted) {
                setSearchCommitted(false);
                // Set the input to the committed search value so user can see/edit it
                if (viewMode === 'people') {
                  setPeopleSearchInput(peopleFilters.search);
                } else {
                  setProjectSearchInput(projectFilters.search);
                }
              }
            }}
            onBlur={(e) => {
              // Use setTimeout to check if focus moved to a filter element or clear button
              setTimeout(() => {
                const activeElement = document.activeElement;
                const clickedFilter = activeElement?.closest('aside') || activeElement?.closest('[role="checkbox"]') || activeElement?.closest('label');
                const clickedClearButton = activeElement?.closest('button[aria-label="Clear search"]');
                
                // Don't blur if clicking on clear button or filter element
                if (clickedClearButton) {
                  return; // Keep focus, don't do anything
                }
                
                // Only clear if we didn't click on a filter element
                if (!clickedFilter && !activeElement?.matches('input')) {
                  const currentInput = viewMode === 'people' ? peopleSearchInput : projectSearchInput;
                  const currentCommitted = viewMode === 'people' ? peopleFilters.search : projectFilters.search;
                  
                  // If there's uncommitted text, clear it and collapse
                  if (currentInput && currentInput !== currentCommitted) {
                    setSearchFocused(false);
                    setSearchHovered(false);
                    if (viewMode === 'people') {
                      setPeopleSearchInput('');
                    } else {
                      setProjectSearchInput('');
                    }
                  } else if (!currentCommitted) {
                    // If no committed search, collapse
                    setSearchFocused(false);
                    setSearchHovered(false);
                  } else {
                    // If there's a committed search, just lose focus but keep tray open
                    setSearchFocused(false);
                    // Don't set searchHovered to false - keep tray open
                  }
                } else {
                  // Even if clicking on filter, keep tray open if search is committed
                  if (!searchCommitted) {
                    setSearchHovered(false);
                  }
                }
              }, 150);
            }}
            className={`search-input h-10 transition-all duration-500 ease-in-out ${
              searchHovered || searchFocused || searchCommitted
                ? searchFocused && !searchCommitted
                  ? 'bg-[#4242ea] w-32 pl-[10px] pr-14' 
                  : 'bg-white w-32 pl-[10px] pr-14' 
                : 'bg-white w-10 pl-0 pr-0'
            }`}
            style={{
              color: searchFocused && !searchCommitted ? '#fff' : '#000'
            }}
          />
          {((viewMode === 'people' ? peopleSearchInput : projectSearchInput) || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) && (searchHovered || searchFocused || searchCommitted) && (
              <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Clear all search states and collapse the tray
                beginFilterTransition();
                  if (viewMode === 'people') {
                  setPeopleSearchInput('');
                    setPeopleFilters({ ...peopleFilters, search: '' });
                  } else {
                  setProjectSearchInput('');
                    setProjectFilters({ ...projectFilters, search: '' });
                  }
                setSearchCommitted(false);
                setSearchFocused(false);
                setSearchHovered(false);
                // Blur the input to collapse the tray
                setTimeout(() => {
                  if (searchInputRef.current) {
                    searchInputRef.current.blur();
                  }
                }, 0);
                }}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-[1.5px] flex items-center justify-center search-clear-button transition-all"
                data-committed={searchCommitted ? "true" : "false"}
                style={{
                  borderColor: searchCommitted ? '#4242ea' : 'white',
                  backgroundColor: 'transparent'
                }}
                aria-label="Clear search"
              >
              <X className="w-3 h-3 lg:w-4 lg:h-4 search-clear-icon" strokeWidth={2} style={{ color: searchCommitted ? '#4242ea' : 'white' }} />
              </button>
            )}
          </div>
        {/* View Toggle Icons */}
        <div className="view-toggle-container flex items-center gap-1 bg-white rounded-md border h-10 relative" style={{padding: 0}}>
          <div 
            className="view-toggle-slider"
            style={{
              transform: layoutView === 'grid' ? 'translateX(0)' : 'translateX(calc(2.5rem + 4px))'
            }}
          />
          <button 
            className="rounded hover:bg-gray-100/50"
            data-active={layoutView === 'grid'}
            onClick={() => {
              setLayoutView('grid');
              if (viewMode === 'people') {
                navigate('/people');
              } else {
                navigate('/projects');
              }
            }}
          >
            <Grid3x3 className="w-3 h-3" />
          </button>
          <button 
            className="rounded hover:bg-gray-100/50" 
            data-active={layoutView === 'detail'}
            onClick={() => {
              if (!slug) {
                // If no slug (grid view), navigate to first item
                // Use allProfiles/allProjects (which are filtered when filters are active)
                if (viewMode === 'people') {
                  if (allProfiles.length > 0) {
                    navigate(`/people/${allProfiles[0].slug}`);
                  }
                } else if (viewMode === 'projects') {
                  if (allProjects.length > 0) {
                    navigate(withInitiativeParam(`/projects/${allProjects[0].slug}`));
                  }
                }
                // Always set layout view to detail when clicking detail button
                setLayoutView('detail');
              } else {
                // If we have a slug, we're already in detail view, so do nothing
                // But ensure layoutView is set to detail
                if (layoutView !== 'detail') {
                setLayoutView('detail');
                }
              }
            }}
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
        {/* Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white rounded-md border border-gray-200 h-10 w-10 flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop: Search Bar and View Icons - Scrolls with content */}
      <div className="hidden lg:block absolute top-4 z-40 right-2 left-[268px]">
        <div className="flex flex-row justify-between items-end gap-3" style={{marginLeft: 0, marginRight: 0, paddingLeft: '2rem', paddingRight: '1rem', width: '100%'}}>
          {/* Left side: Pagination controls - aligned with cards */}
          <div className="flex items-center gap-3" style={{marginLeft: 0, paddingLeft: 0}}>
            {/* Page indicator with navigation - left-aligned - Hide when initiative filter is active */}
            {showGridPagination && (
              <GridPaginationBar
                isLoading={gridPagination.isLoading}
                currentPage={gridPagination.currentPage}
                totalPages={gridPagination.totalPages}
                totalItems={gridPagination.totalItems}
                canPrev={gridPagination.canPrev}
                canNext={gridPagination.canNext}
                onPrev={goToPrevGridPage}
                onNext={goToNextGridPage}
                onPrefetchPrev={() => prefetchPage(-1)}
                onPrefetchNext={() => prefetchPage(1)}
                widthClass={viewMode === 'people' ? 'w-36' : 'w-40'}
              />
            )}
            {layoutView === 'list' && (
              <div className={`text-base text-gray-700 ${viewMode === 'people' ? 'w-36' : 'w-40'} text-center bg-white rounded-md border-0 h-10 px-[7.5px] flex items-center justify-center`}>
                <span className="font-bold">{viewMode === 'people' ? filteredPeopleCards.length : filteredProjects.length}</span><span style={{marginLeft: '0.25em'}}>{viewMode === 'people' ? 'People' : 'Projects'}</span>
              </div>
            )}
            {layoutView === 'detail' && (
              <div className="flex items-center">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="page-nav-button page-nav-button-left h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                  style={{
                    color: !canGoPrevious ? '#d1d5db' : '#4242ea',
                    backgroundColor: '#ffffff',
                    marginRight: '5px'
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-[30px] h-[30px]" strokeWidth={1.5} />
                </button>
                <div className={`text-base text-gray-700 ${viewMode === 'people' ? 'w-36' : 'w-40'} text-center bg-white rounded-md border-0 h-10 px-[15px] flex items-center justify-center`}>
                  {currentLength === 0 ? (
                    <>
                      <span className="font-bold">0</span> <span style={{marginLeft: '0.25em'}}>{viewMode === 'people' ? 'People' : 'Projects'}</span>
                    </>
                  ) : currentIndex >= 0 ? (
                    <>
                      <span className="font-bold">{String(currentIndex + 1).padStart(2, '0')}</span><span style={{marginLeft: 'calc(0.125em + 1px)', marginRight: '0.125em'}}>/</span>{String(currentLength).padStart(2, '0')} <span style={{marginLeft: '0.25em'}}>{viewMode === 'people' ? 'People' : 'Projects'}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold">01</span><span style={{marginLeft: 'calc(0.125em + 1px)', marginRight: '0.125em'}}>/</span>{String(currentLength).padStart(2, '0')} <span style={{marginLeft: '0.25em'}}>{viewMode === 'people' ? 'People' : 'Projects'}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="page-nav-button h-[40px] w-[40px] bg-white border-0 rounded-md disabled:cursor-not-allowed flex items-center justify-center"
                  style={{
                    color: !canGoNext ? '#d1d5db' : '#4242ea',
                    backgroundColor: '#ffffff',
                    marginLeft: '5px'
                  }}
                  aria-label="Next"
                >
                  <ChevronRight className="w-[30px] h-[30px]" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
          
          {/* Right side: Search and View Icons */}
          <div className="flex items-center gap-3 ml-auto justify-end">
            <div 
              className="relative"
              style={{
                paddingTop: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '10px' : '0',
                paddingBottom: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '10px' : '0',
                marginTop: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '-10px' : '0',
                marginBottom: (searchFocused || searchCommitted || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) ? '-10px' : '0'
              }}
              onMouseEnter={() => setSearchHovered(true)}
              onMouseLeave={() => {
                const currentInput = viewMode === 'people' ? peopleSearchInput : projectSearchInput;
                const currentCommitted = viewMode === 'people' ? peopleFilters.search : projectFilters.search;
                
                // If there's uncommitted text (user typed but didn't hit Enter), collapse
                if (currentInput && currentInput !== currentCommitted) {
                  setSearchHovered(false);
                  setSearchFocused(false);
                  if (searchInputRefDesktop.current) {
                    searchInputRefDesktop.current.blur();
                  }
                  // Clear uncommitted input
                  if (viewMode === 'people') {
                    setPeopleSearchInput('');
                  } else {
                    setProjectSearchInput('');
                  }
                } else if (!currentCommitted) {
                  // If no committed search and no input, collapse
                  setSearchHovered(false);
                  setSearchFocused(false);
                  if (searchInputRefDesktop.current) {
                    searchInputRefDesktop.current.blur();
                  }
                }
                // If there's a committed search, don't collapse on mouse leave - keep tray open
              }}
            >
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ease-in-out"
                style={{ 
                  marginLeft: searchHovered && !searchFocused ? '10px' : '0',
                  opacity: (searchFocused || searchCommitted) ? 0 : 1,
                  zIndex: 1
                }}
              >
                <Search 
                  className="w-[25px] h-[25px]" 
                  strokeWidth={1.5}
                  style={{ color: '#4242ea' }}
                />
              </div>
              {searchHovered && !searchFocused && (
                <span 
                  className="absolute pointer-events-none whitespace-nowrap text-base md:text-sm"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: 'translate(calc(-50% + 22.5px), -50%)', // 22.5px = (25px icon + 20px gap) / 2
                    color: '#d1d5db',
                    fontSize: '16px',
                    zIndex: 10,
                    opacity: 0,
                    animation: 'fadeInText 0.1s ease-in-out 0.3s forwards',
                    willChange: 'opacity',
                    display: ((viewMode === 'people' ? peopleSearchInput : projectSearchInput) || (viewMode === 'people' ? peopleFilters.search : projectFilters.search) || searchCommitted) ? 'none' : 'block'
                  }}
                >
                  Click to search
                </span>
              )}
                <Input
                ref={searchInputRefDesktop}
                  value={searchCommitted ? (viewMode === 'people' ? peopleFilters.search : projectFilters.search) : (viewMode === 'people' ? peopleSearchInput : projectSearchInput)}
                  onChange={(e) => {
                    if (viewMode === 'people') {
                      setPeopleSearchInput(e.target.value);
                    } else {
                      setProjectSearchInput(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Commit the search
                      beginFilterTransition();
                      if (viewMode === 'people') {
                        setPeopleFilters({ ...peopleFilters, search: peopleSearchInput });
                      } else {
                        setProjectFilters({ ...projectFilters, search: projectSearchInput });
                      }
                      setSearchCommitted(true);
                      // Remove focus to make it inactive (no cursor)
                      if (searchInputRefDesktop.current) {
                        searchInputRefDesktop.current.blur();
                      }
                    }
                  }}
                  onFocus={() => {
                    setSearchFocused(true);
                    // If there's a committed search, uncommit it when user clicks to search again
                    if (searchCommitted) {
                      setSearchCommitted(false);
                      // Set the input to the committed search value so user can see/edit it
                      if (viewMode === 'people') {
                        setPeopleSearchInput(peopleFilters.search);
                      } else {
                        setProjectSearchInput(projectFilters.search);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Use setTimeout to check if focus moved to clear button
                    setTimeout(() => {
                      const activeElement = document.activeElement;
                      const clickedClearButton = activeElement?.closest('button[aria-label="Clear search"]');
                      
                      // Don't blur if clicking on clear button
                      if (clickedClearButton) {
                        return; // Keep focus, don't do anything
                      }
                      
                      const currentInput = viewMode === 'people' ? peopleSearchInput : projectSearchInput;
                      const currentCommitted = viewMode === 'people' ? peopleFilters.search : projectFilters.search;
                      
                      // If there's uncommitted text, clear it and collapse
                      if (currentInput && currentInput !== currentCommitted) {
                        setSearchFocused(false);
                        setSearchHovered(false);
                        if (viewMode === 'people') {
                          setPeopleSearchInput('');
                        } else {
                          setProjectSearchInput('');
                        }
                      } else if (!currentCommitted) {
                        // If no committed search, collapse
                        setSearchFocused(false);
                        setSearchHovered(false);
                      } else {
                        // If there's a committed search, just lose focus but keep tray open
                        setSearchFocused(false);
                        setSearchHovered(false);
                      }
                    }, 150);
                  }}
                  className={`search-input h-10 transition-all duration-500 ease-in-out ${
                    searchHovered || searchFocused || searchCommitted
                      ? searchFocused && !searchCommitted
                        ? 'bg-[#4242ea] w-48 xl:w-64 pl-[10px] pr-14' 
                        : 'bg-white w-48 xl:w-64 pl-[10px] pr-14' 
                      : 'bg-white w-10 pl-0 pr-0'
                  }`}
                  style={{
                    color: searchFocused && !searchCommitted ? '#fff' : '#000'
                  }}
              />
              {((viewMode === 'people' ? peopleSearchInput : projectSearchInput) || (viewMode === 'people' ? peopleFilters.search : projectFilters.search)) && (searchHovered || searchFocused || searchCommitted) && (
                  <button
                  type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Clear all search states and collapse the tray
                      beginFilterTransition();
                      if (viewMode === 'people') {
                        setPeopleSearchInput('');
                        setPeopleFilters({ ...peopleFilters, search: '' });
                      } else {
                        setProjectSearchInput('');
                        setProjectFilters({ ...projectFilters, search: '' });
                      }
                      setSearchCommitted(false);
                      setSearchFocused(false);
                      setSearchHovered(false);
                      // Blur the input to collapse the tray
                      setTimeout(() => {
                        if (searchInputRefDesktop.current) {
                          searchInputRefDesktop.current.blur();
                        }
                      }, 0);
                    }}
                className="absolute right-[10px] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 rounded-full border-[1.5px] flex items-center justify-center search-clear-button transition-all"
                data-committed={searchCommitted ? "true" : "false"}
                style={{
                  borderColor: searchCommitted ? '#4242ea' : 'white',
                  backgroundColor: 'transparent'
                }}
                    aria-label="Clear search"
                  >
              <X className="w-3 h-3 lg:w-4 lg:h-4 search-clear-icon" strokeWidth={2} style={{ color: searchCommitted ? '#4242ea' : 'white' }} />
                  </button>
                )}
              </div>
            {/* View Toggle Icons */}
            <div className="view-toggle-container flex items-center gap-1 bg-white rounded-md border h-10 relative" style={{padding: 0}}>
              <div 
                className="view-toggle-slider"
                style={{
                  transform: layoutView === 'grid' 
                    ? 'translateX(0)' 
                    : layoutView === 'detail' 
                    ? 'translateX(calc(2.5rem + 4px))' 
                    : 'translateX(calc(5rem + 8px))'
                }}
              />
              <button
                className="rounded hover:bg-gray-100/50"
                aria-label="Grid view"
                data-active={layoutView === 'grid'}
                onClick={() => {
                  setLayoutView('grid');
                  if (viewMode === 'people') {
                    navigate('/people');
                  } else {
                    navigate('/projects');
                  }
                }}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                className="rounded hover:bg-gray-100/50"
                aria-label="Detail view"
                data-active={layoutView === 'detail'}
                onClick={() => {
                  if (!slug) {
                    // If no slug (grid view), navigate to first item
                    // Use allProfiles/allProjects (which are filtered when filters are active)
                    if (viewMode === 'people') {
                      if (allProfiles.length > 0) {
                        navigate(`/people/${allProfiles[0].slug}`);
                      }
                    } else if (viewMode === 'projects') {
                      if (allProjects.length > 0) {
                        navigate(withInitiativeParam(`/projects/${allProjects[0].slug}`));
                      }
                    }
                    // Always set layout view to detail when clicking detail button
                    setLayoutView('detail');
                  } else {
                    // If we have a slug, we're already in detail view, so do nothing
                    // But ensure layoutView is set to detail
                    if (layoutView !== 'detail') {
                    setLayoutView('detail');
                    }
                  }
                }}
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                className="rounded hover:bg-gray-100/50"
                aria-label="List view"
                data-active={layoutView === 'list'}
                onClick={() => setLayoutView('list')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Floating - Slides in on mobile, always visible on desktop */}
      <div className={`fixed left-0 lg:left-5 top-0 lg:top-20 z-50 transition-transform duration-300 ${
mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } lg:block`}>
        <aside style={{backgroundColor: '#e3e3e3'}} className="w-72 lg:w-60 h-screen lg:h-auto lg:rounded-xl border-r-2 lg:border-2 border-white lg:max-h-[calc(100vh-10rem)] pt-14 lg:pt-4 pb-20 lg:pb-0 overflow-hidden">
          <div className="flex flex-col h-full">

          {/* Filter Content */}
          <div className="flex-1 p-4 space-y-4 pt-0 overflow-y-auto">
              {/* Tabs */}
              <div className="flex gap-1 border-b">
                <button
                  className={`flex-1 py-2 text-sm transition-colors ${
                    filterView === 'people' 
                      ? 'border-b-2 font-semibold' 
                      : 'text-gray-500 hover:text-gray-700 font-medium'
                  }`}
                  style={filterView === 'people' ? {color: '#4242ea', borderColor: '#4242ea'} : {}}
                  onClick={() => handleTabSwitch('people')}
                >
                  PEOPLE
                </button>
                <button
                  className={`flex-1 py-2 text-sm transition-colors ${
                    filterView === 'projects' 
                      ? 'border-b-2 font-semibold' 
                      : 'text-gray-500 hover:text-gray-700 font-medium'
                  }`}
                  style={filterView === 'projects' ? {color: '#4242ea', borderColor: '#4242ea'} : {}}
                  onClick={() => handleTabSwitch('projects')}
                >
                  PROJECTS
                </button>
              </div>

              {/* People Filters */}
              {filterView === 'people' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm">People</h4>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          if (selectedPeopleGroup !== PEOPLE_GROUP_BUILDERS) {
                            setGridListLoading(true);
                          }
                          beginFilterTransition();
                          setSelectedPeopleGroup(PEOPLE_GROUP_BUILDERS);
                          setPeopleFilters({ search: peopleFilters.search, skills: [], industries: [], openToWork: false });
                          navigate('/people');
                          analytics.filterApplied('people_group', 'AI-Native Builders', 'people');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedPeopleGroup === PEOPLE_GROUP_BUILDERS
                            ? 'bg-[#4242ea] text-white font-medium'
                            : 'bg-white hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        AI-Native Builders
                      </button>
                      <button
                        onClick={() => {
                          if (selectedPeopleGroup !== PEOPLE_GROUP_UFT) {
                            setGridListLoading(true);
                          }
                          beginFilterTransition();
                          setSelectedPeopleGroup(PEOPLE_GROUP_UFT);
                          setPeopleFilters({ search: peopleFilters.search, skills: [], industries: [], openToWork: false });
                          navigate(`/people/filter/${PEOPLE_GROUP_UFT}`);
                          analytics.filterApplied('people_group', 'UFT AI Ambassadors', 'people');
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedPeopleGroup === PEOPLE_GROUP_UFT
                            ? 'bg-[#4242ea] text-white font-medium'
                            : 'bg-white hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        UFT AI Ambassadors
                      </button>
                    </div>
                  </div>

                  {selectedPeopleGroup === PEOPLE_GROUP_BUILDERS && (
                    <>
                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Skills</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availablePeopleFilters.skills.length > 0 ? (
                        availablePeopleFilters.skills.map(skill => (
                        <div 
                          key={skill} 
                          className="flex items-center space-x-2"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <Checkbox
                            id={`skill-${skill}`}
                            checked={peopleFilters.skills.includes(skill)}
                            onCheckedChange={(checked) => {
                              beginFilterTransition();
                              const newSkills = checked
                                ? [...peopleFilters.skills, skill]
                                : peopleFilters.skills.filter(s => s !== skill);
                              
                              setPeopleFilters({
                                ...peopleFilters,
                                skills: newSkills
                              });
                              
                              // Track filter application
                              analytics.filterApplied('skill', skill, 'people');
                            }}
                          />
                          <label htmlFor={`skill-${skill}`} className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                            {skill}
                          </label>
                        </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Loading skills...</p>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Industries</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availablePeopleFilters.industries.length > 0 ? (
                        availablePeopleFilters.industries.map(industry => (
                        <div 
                          key={industry} 
                          className="flex items-center space-x-2"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <Checkbox
                            id={`industry-${industry}`}
                            checked={peopleFilters.industries.includes(industry)}
                            onCheckedChange={(checked) => {
                              beginFilterTransition();
                              const newIndustries = checked
                                ? [...peopleFilters.industries, industry]
                                : peopleFilters.industries.filter(i => i !== industry);
                              
                              setPeopleFilters({
                                ...peopleFilters,
                                industries: newIndustries
                              });
                              
                              // Track filter application
                              analytics.filterApplied('industry', industry, 'people');
                            }}
                          />
                          <label htmlFor={`industry-${industry}`} className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                            {industry}
                          </label>
                        </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">Loading industries...</p>
                      )}
                    </div>
                  </div>
                    </>
                  )}

                  {/* TEMPORARILY HIDDEN - Additional Filters
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="has-demo-video" />
                      <label htmlFor="has-demo-video" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Has Demo Video
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="open-to-relocate" />
                      <label htmlFor="open-to-relocate" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Open to Relocate
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="open-to-work" />
                      <label htmlFor="open-to-work" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Open to Work
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="freelance" />
                      <label htmlFor="freelance" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Freelance
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="nyc-based" />
                      <label htmlFor="nyc-based" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        NYC-based
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remote-only" />
                      <label htmlFor="remote-only" className="text-sm cursor-pointer" style={{fontWeight: 400}}>
                        Remote Only
                      </label>
                    </div>
                  </div>
                  */}
                </div>
              )}

              {/* Project Filters */}
              {filterView === 'projects' && (
                <div className="space-y-4">
                  {/* Initiatives Section */}
                  {projectInitiatives.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm">Initiatives</h4>
                      <div className="space-y-1">
                        {projectInitiatives.map(initiative => (
                          <button
                            key={initiative.slug}
                            onClick={() => {
                              beginFilterTransition();
                              if (selectedInitiative === initiative.slug) {
                                // Deselecting - navigate to base projects page
                                setSelectedInitiative(null);
                                navigate('/projects');
                              } else {
                                // Selecting - navigate to filter URL
                                setSelectedInitiative(initiative.slug);
                                navigate(`/projects/filter/${initiative.slug}`);
                                // Track initiative selection
                                analytics.filterApplied('initiative', initiative.name, 'projects');
                              }
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                              selectedInitiative === initiative.slug
                                ? 'bg-[#4242ea] text-white font-medium'
                                : 'bg-white hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            {initiative.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Technologies</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableProjectFilters.skills.map(skill => (
                        <div 
                          key={skill} 
                          className="flex items-center space-x-2"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <Checkbox 
                            id={`proj-skill-${skill}`}
                            checked={projectFilters.skills.includes(skill)}
                            onCheckedChange={(checked) => {
                              beginFilterTransition();
                              const newSkills = checked
                                ? [...projectFilters.skills, skill]
                                : projectFilters.skills.filter(s => s !== skill);
                              
                              setProjectFilters({
                                ...projectFilters,
                                skills: newSkills
                              });
                              
                              // Track filter application
                              analytics.filterApplied('skill', skill, 'projects');
                            }}
                          />
                          <Label htmlFor={`proj-skill-${skill}`} className="text-sm cursor-pointer">
                            {skill}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-white" />

                  <div className="space-y-2">
                    <h4 className="text-sm">Industries</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableProjectFilters.sectors.map(sector => (
                        <div 
                          key={sector} 
                          className="flex items-center space-x-2"
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <Checkbox 
                            id={`proj-sector-${sector}`}
                            checked={projectFilters.sectors.includes(sector)}
                            onCheckedChange={(checked) => {
                              beginFilterTransition();
                              const newSectors = checked
                                ? [...projectFilters.sectors, sector]
                                : projectFilters.sectors.filter(s => s !== sector);
                              
                              setProjectFilters({
                                ...projectFilters,
                                sectors: newSectors
                              });
                              
                              // Track filter application
                              analytics.filterApplied('sector', sector, 'projects');
                            }}
                          />
                          <Label htmlFor={`proj-sector-${sector}`} className="text-sm cursor-pointer">
                            {sector}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Contact Button */}
              <Separator className="bg-white" />
              <div className="pt-2">
                <button
                  onClick={() => setContactModalOpen(true)}
                  className="contact-button w-full py-3 px-4 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(to right, #4242ea, #3535d1)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #3535d1, #2828b8)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(66, 66, 234, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #4242ea, #3535d1)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(66, 66, 234, 0.3)';
                  }}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Get in Touch</span>
                </button>
                <p className="mt-2 text-xs text-center text-black">
                  For hiring, resumes & partnerships
                </p>
              </div>
            </div>
        </div>
      </aside>

        {/* Footer under sidebar */}
        <div className="w-60 text-center text-xs text-gray-600 mt-2">
          Built with ♥ by Pursuit + AI
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-16 lg:mt-20 mx-2 lg:ml-[260px] lg:mr-2" style={{width: '100%', maxWidth: '100%', overflowX: 'hidden'}}>
        <div className="relative pt-0 pb-4" style={{marginLeft: 0, marginRight: 0, paddingLeft: '2rem', paddingRight: '1rem', width: '100%', maxWidth: '100%', overflowX: 'hidden'}}>
          
          {/* Grid View */}
          {layoutView === 'grid' && viewMode === 'projects' && (
            <>
              {!gridListLoading && totalProjects === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find any projects
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      beginFilterTransition();
                      setProjectFilters({ search: '', skills: [], sectors: [] });
                      setProjectSearchInput('');
                      setSelectedInitiative(null);
                      setSearchCommitted(false);
                      setSearchFocused(false);
                      setSearchHovered(false);
                      if (searchInputRef.current) {
                        searchInputRef.current.blur();
                      }
                      if (searchInputRefDesktop.current) {
                        searchInputRefDesktop.current.blur();
                      }
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Initiative Header - shows when an initiative is selected */}
                  {selectedInitiative && initiatives.find(i => i.slug === selectedInitiative) && (
                    <div 
                      className="mb-6 rounded-xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        animation: 'fadeIn 0.3s ease-in-out'
                      }}
                    >
                      <div className="p-6 md:p-8">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h2 
                              className="text-white font-bold uppercase tracking-wide mb-3"
                              style={{
                                fontFamily: "'Galano Grotesque', sans-serif",
                                fontSize: 'clamp(1.5rem, 3vw, 2rem)'
                              }}
                            >
                              {initiatives.find(i => i.slug === selectedInitiative)?.name}
                            </h2>
                            <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-full lg:max-w-3xl">
                              {initiatives.find(i => i.slug === selectedInitiative)?.description}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              beginFilterTransition();
                              setSelectedInitiative(null);
                              navigate('/projects');
                            }}
                            className="ml-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            title="Clear initiative filter"
                          >
                            <X className="w-5 h-5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {gridListLoading ? (
                    // Show skeleton cards while loading
                    <div 
                      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                      style={{
                        animation: 'fadeIn 0.3s ease-in-out',
                        gridAutoRows: 'auto',
                        overflow: 'visible'
                      }}
                    >
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <ProjectCardSkeleton key={`project-skeleton-${idx}`} />
                      ))}
                    </div>
                  ) : (
                  <div 
                    className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                    style={{
                      gridAutoRows: 'auto',
                      overflow: 'visible',
                      opacity: isRefreshing ? 0.5 : 1,
                      pointerEvents: isRefreshing ? 'none' : 'auto',
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                      {/* In grid view, apply client-side filters */}
                      {filteredProjects.map((proj) => (
                          <MemoizedProjectCard
                            key={proj.slug}
                            proj={proj}
                            onClick={() => {
                              setLayoutView('detail');
                              navigate(withInitiativeParam(`/projects/${proj.slug}`));
                            }}
                          />
                      ))}
                    </div>
                  )}
                  {gridListLoading && slowLoadWarning && (
                    <p className="text-sm text-gray-500 mt-2 text-center">Server is waking up, please wait...</p>
                  )}
                  {/* Loading more indicator for progressive loading */}
                  {loadingMore && (
                    <div className="flex items-center justify-center py-6 text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-[#4242ea] mr-3"></div>
                      <span>Loading more projects...</span>
                    </div>
                  )}
                </>
              )}

            {/* Mobile Navigation - Bottom Fixed for Projects Grid */}
            {showGridPagination && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 px-4 py-3 flex items-center justify-center shadow-lg">
            <GridPaginationBar
                isLoading={gridPagination.isLoading}
                currentPage={gridPagination.currentPage}
                totalPages={gridPagination.totalPages}
                totalItems={gridPagination.totalItems}
                canPrev={gridPagination.canPrev}
                canNext={gridPagination.canNext}
                onPrev={goToPrevGridPage}
                onNext={goToNextGridPage}
                onPrefetchPrev={() => prefetchPage(-1)}
                onPrefetchNext={() => prefetchPage(1)}
                widthClass="w-28"
                barClassName="justify-center"
              />
            </div>
            )}
            </>
          )}

          {/* People Grid View */}
          {layoutView === 'grid' && viewMode === 'people' && (
            <>
              {isUftPeopleMode && (
                <div
                  className="mb-6 rounded-xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                    animation: 'fadeIn 0.3s ease-in-out'
                  }}
                >
                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2
                          className="text-white font-bold uppercase tracking-wide mb-3"
                          style={{
                            fontFamily: "'Galano Grotesque', sans-serif",
                            fontSize: 'clamp(1.5rem, 3vw, 2rem)'
                          }}
                        >
                          {uftInitiative?.name || 'UFT AI Ambassadors'}
                        </h2>
                        {uftInitiative?.description && (
                          <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-full lg:max-w-3xl">
                            {uftInitiative.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          beginFilterTransition();
                          setSelectedPeopleGroup(PEOPLE_GROUP_BUILDERS);
                          navigate('/people');
                        }}
                        className="ml-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        title="Clear people filter"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!gridListLoading && totalProfiles === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find anyone
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      beginFilterTransition();
                      setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
                      setPeopleSearchInput('');
                      setSearchCommitted(false);
                      setSearchFocused(false);
                      setSearchHovered(false);
                      if (searchInputRef.current) {
                        searchInputRef.current.blur();
                      }
                      if (searchInputRefDesktop.current) {
                        searchInputRefDesktop.current.blur();
                      }
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : (
                gridListLoading ? (
                  // Show skeleton cards while loading
                  <div 
                    className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                    style={{
                      animation: 'fadeIn 0.3s ease-in-out',
                      gridAutoRows: 'auto',
                      overflow: 'visible'
                    }}
                  >
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <PersonCardSkeleton key={`person-skeleton-${idx}`} />
                    ))}
                  </div>
                ) : (
                  <div 
                    className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-[18px] mb-0" 
                    style={{
                      gridAutoRows: 'auto',
                      overflow: 'visible',
                      opacity: isRefreshing ? 0.5 : 1,
                      pointerEvents: isRefreshing ? 'none' : 'auto',
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {/* In grid view, apply client-side filters */}
                    {isUftPeopleMode ? (
                      filteredAmbassadorPeople.map((proj) => (
                        <AmbassadorCard
                          key={proj.slug}
                          project={proj}
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/people/uft/${proj.slug}`);
                          }}
                        />
                      ))
                    ) : (
                      filteredProfiles.map((prof) => (
                        <MemoizedProfileCard 
                          key={prof.slug}
                          prof={prof}
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/people/${prof.slug}`);
                          }}
                        />
                      ))
                    )}
                  </div>
                )
              )}
              {gridListLoading && slowLoadWarning && (
                <p className="text-sm text-gray-500 mt-2 text-center">Server is waking up, please wait...</p>
              )}

            {/* Mobile Navigation - Bottom Fixed for People Grid */}
            {showGridPagination && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white z-50 px-4 py-3 flex items-center justify-center shadow-lg">
            <GridPaginationBar
                isLoading={gridPagination.isLoading}
                currentPage={gridPagination.currentPage}
                totalPages={gridPagination.totalPages}
                totalItems={gridPagination.totalItems}
                canPrev={gridPagination.canPrev}
                canNext={gridPagination.canNext}
                onPrev={goToPrevGridPage}
                onNext={goToNextGridPage}
                onPrefetchPrev={() => prefetchPage(-1)}
                onPrefetchNext={() => prefetchPage(1)}
                widthClass="w-28"
                barClassName="justify-center"
              />
            </div>
            )}
            </>
          )}

          {/* List View */}
          {layoutView === 'list' && (
            <>
              {!gridListLoading && viewMode === 'projects' && filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                          Sorry! Can't find any projects
                        </p>
                        <button
                    style={{marginTop: '1rem'}}
                          onClick={() => {
                      beginFilterTransition();
                      setProjectFilters({ search: '', skills: [], sectors: [] });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                  </button>
                </div>
              ) : !gridListLoading && viewMode === 'people' && filteredPeopleCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
                  <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                  <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                    Sorry! Can't find anyone
                  </p>
                  <button
                    style={{marginTop: '1rem'}}
                    onClick={() => {
                      beginFilterTransition();
                      setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
                    }}
                    className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                  >
                    <span className="relative z-10">Clear Search</span>
                        </button>
                      </div>
                    ) : (
            <Card className="rounded-xl border-2 border-white shadow-none mb-12" style={{
              backgroundColor: 'white',
              animation: 'fadeInList 0.3s ease-in-out',
              opacity: isRefreshing ? 0.5 : 1,
              pointerEvents: isRefreshing ? 'none' : 'auto',
              transition: 'opacity 0.2s ease',
            }}>
              <CardContent className="p-6">
                {viewMode === 'projects' && (
                  <div>
                    {/* Virtual scrolling disabled until react-window is installed: npm install react-window */}
                    {filteredProjects.map((proj, index) => (
                        <div key={proj.slug}>
                          {index > 0 && <div className="border-t border-gray-200 my-0"></div>}
                          <div 
                            onClick={() => {
                              setLayoutView('detail');
                              navigate(withInitiativeParam(`/projects/${proj.slug}`));
                            }}
                            className="flex items-center gap-6 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                        {/* Project Icon/Image */}
                        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500">
                          {(proj.icon_url || proj.main_image_url) ? (
                            <img 
                              src={getImageUrl((() => {
                                // Use icon_url if available, otherwise use main_image_url
                                const imageUrl = proj.icon_url || proj.main_image_url;
                                try {
                                  const images = JSON.parse(imageUrl);
                                  if (Array.isArray(images)) {
                                    return typeof images[0] === 'string' ? images[0] : images[0].url;
                                  }
                                } catch {}
                                return imageUrl;
                              })())}
                              alt={proj.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                              {proj.title?.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Project Name and Description */}
                        <div className="flex-1 min-w-0" style={{maxWidth: '550px'}}>
                          <h3 className="font-bold text-lg uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>
                            {proj.title}
                          </h3>
                          {proj.short_description && (
                            <p className="text-gray-600 mb-2" style={{fontSize: '14px'}}>
                              {proj.short_description}
                            </p>
                          )}
                          {/* Industry Pills */}
                          <div className="flex gap-2 flex-wrap">
                            {proj.sectors && proj.sectors.slice(0, 2).map((sector, i) => (
                              <span 
                                key={i} 
                                className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase"
                              >
                                {sector}
                              </span>
                            ))}
                            {proj.sectors && proj.sectors.length > 2 && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                              >
                                +{proj.sectors.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Project Team */}
                        <div className="w-48 flex-shrink-0 ml-14">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Project Team</h4>
                          {proj.participants && proj.participants.length > 0 ? (
                            <div className="space-y-2">
                              {proj.participants.map((participant, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                                    title={participant.name || participant}
                                  >
                                    {(participant.photo_url || participant.photoUrl) ? (
                                      <img 
                                        src={getImageUrl(participant.photo_url || participant.photoUrl)}
                                        alt={participant.name || participant}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span>{(participant.name || participant).split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-700 truncate">{participant.name || participant}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No team listed</p>
                          )}
                        </div>
                      </div>
                      </div>
                    ))}
                  </div>
                )}
                {viewMode === 'people' && (
                  <div>
                    {filteredPeopleCards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-4" style={{minHeight: 'calc(100vh - 12rem)'}}>
                        <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          Sorry! Can't find anyone
                          <Frown className="text-[#4242ea]" style={{width: '1.5rem', height: '1.5rem'}} strokeWidth={1.5} />
                        </p>
                        <button
                          onClick={() => {
                            beginFilterTransition();
                            setPeopleFilters({ ...peopleFilters, search: '' });
                            setPeopleSearchInput('');
                            setSearchCommitted(false);
                            setSearchFocused(false);
                            setSearchHovered(false);
                            if (searchInputRef.current) {
                              searchInputRef.current.blur();
                            }
                            if (searchInputRefDesktop.current) {
                              searchInputRefDesktop.current.blur();
                            }
                          }}
                          className="h-10 px-6 rounded-full bg-[#4242ea] text-white font-semibold hover:opacity-90 transition-opacity"
                          style={{fontFamily: "'Galano Grotesque', sans-serif"}}
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : isUftPeopleMode ? (
                      filteredAmbassadorPeople.map((proj, index) => (
                      <div key={proj.slug}>
                        {index > 0 && <div className="border-t border-gray-200 my-0"></div>}
                        <div
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/people/uft/${proj.slug}`);
                          }}
                          className="flex items-center gap-6 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#4242ea] to-[#2525c4]">
                            {proj.main_image_url ? (
                              <img
                                src={getImageUrl(proj.main_image_url)}
                                alt={proj.short_description || proj.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                                {(proj.short_description || proj.title)?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0" style={{maxWidth: '650px'}}>
                            <h3 className="font-bold text-lg uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>
                              {proj.short_description || proj.title}
                            </h3>
                            <p className="text-gray-600 mb-2" style={{fontSize: '14px'}}>
                              {proj.title}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {proj.sectors && proj.sectors.slice(0, 2).map((sector, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                                  {sector}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      ))
                    ) : (
                      filteredProfiles.map((prof, index) => (
                      <div key={prof.slug}>
                        {index > 0 && <div className="border-t border-gray-200 my-0"></div>}
                        <div 
                          onClick={() => {
                            setLayoutView('detail');
                            navigate(`/people/${prof.slug}`);
                          }}
                          className="flex items-start gap-6 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          {/* Profile Photo */}
                          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
                            {(prof.photo_url || prof.photoUrl) ? (
                              <img 
                                src={getImageUrl(prof.photo_url || prof.photoUrl)}
                                alt={prof.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                {prof.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                              </div>
                            )}
                          </div>

                          {/* Name and Bio */}
                          <div className="flex-1 min-w-0" style={{maxWidth: '550px'}}>
                            <h3 className="font-bold text-lg uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>
                              {prof.name}
                            </h3>
                            {prof.title && (
                              <p className="text-sm text-gray-700 mb-1" style={{fontWeight: '500'}}>
                                {prof.title}
                              </p>
                            )}
                            {prof.bio && (
                              <p className="text-gray-600 mb-2 line-clamp-2" style={{fontSize: '14px'}}>
                                {prof.bio}
                              </p>
                            )}
                            {/* Skills/Industries Pills */}
                            <div className="flex gap-2 flex-wrap">
                              {prof.skills && prof.skills.slice(0, 3).map((skill, i) => (
                                <span 
                                  key={i} 
                                  className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold"
                                >
                                  {skill}
                                </span>
                              ))}
                              {prof.skills && prof.skills.length > 3 && (
                                <span 
                                  className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                                >
                                  +{prof.skills.length - 3}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Industries/Status */}
                          <div className="w-48 flex-shrink-0 ml-14">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Industry Expertise</h4>
                            {prof.industry_expertise && prof.industry_expertise.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prof.industry_expertise.slice(0, 3).map((industry, i) => (
                                  <span 
                                    key={i} 
                                    className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase"
                                  >
                                    {industry}
                                  </span>
                                ))}
                                {prof.industry_expertise.length > 3 && (
                                  <span 
                                    className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-semibold"
                                  >
                                    +{prof.industry_expertise.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No industries listed</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )))}
                  </div>
                )}
              </CardContent>
            </Card>
              )}
            </>
          )}

          {/* Detail View */}
          {layoutView === 'detail' && (
            <>
          {/* Mobile Navigation - Bottom Fixed */}
          {(
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-3 flex items-center justify-center shadow-lg">
            <PageNavButton
              onClick={handlePrevious}
              disabled={!canGoPrevious || currentLength <= 1}
              direction="left"
              ariaLabel="Previous"
            />
            <PageDisplay
              current={currentIndex + 1}
              total={currentLength}
              viewMode={viewMode}
              isDetail={true}
              hasContent={!!(person || project)}
              isLoading={loading && !(person || project)}
            />
            <PageNavButton
              onClick={handleNext}
              disabled={!canGoNext || currentLength <= 1}
              direction="right"
              ariaLabel="Next"
            />
            </div>
          )}

          {/* Show "No results" without Card wrapper, or show content in Card */}
          {!loading && !gridListLoading && (
            (viewMode === 'people' && (isUftPeopleDetail ? ambassadorProjects.length === 0 && !project : allProfiles.length === 0 && !person)) ||
            (viewMode === 'projects' && allProjects.length === 0 && !project)
          ) ? (
            <div className="flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 12rem)', gap: '1rem'}}>
              <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
              <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                {viewMode === 'people' ? "Sorry! Can't find anyone" : "Sorry! Can't find any projects"}
              </p>
            <button
                style={{marginTop: '1rem'}}
                onClick={() => {
                  if (viewMode === 'people') {
                    setPeopleFilters({ search: '', skills: [], industries: [], openToWork: false });
                    setPeopleSearchInput('');
                    // Navigate to first person after clearing filters
                    if (allProfiles.length > 0) {
                      navigate(`/people/${allProfiles[0].slug}`);
                    }
                  } else {
                    setProjectFilters({ search: '', skills: [], sectors: [] });
                    setProjectSearchInput('');
                    setSelectedInitiative(null);
                    // Navigate to base projects page when clearing filters
                    if (isFilterUrl) {
                      navigate('/projects');
                    } else if (allProjects.length > 0) {
                      // Navigate to first project after clearing filters
                      navigate(`/projects/${allProjects[0].slug}`);
                    }
                  }
                  setSearchCommitted(false);
                  setSearchFocused(false);
                  setSearchHovered(false);
                  if (searchInputRef.current) {
                    searchInputRef.current.blur();
                  }
                  if (searchInputRefDesktop.current) {
                    searchInputRefDesktop.current.blur();
                  }
                }}
                className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
              >
                <span className="relative z-10">Clear Search</span>
            </button>
          </div>
          ) : (
          <Card className="rounded-xl border-2 border-white shadow-none mb-12 md:mb-12" style={{
            backgroundColor: 'white', 
            minHeight: '800px',
            marginBottom: 'calc(3rem + 70px)', // Extra space for mobile nav on mobile
            animation: 'fadeIn 0.3s ease-in-out',
          }}>
            <CardContent className="p-4 md:p-[30px]">
              {/* Render Person or Project based on viewMode */}
              {viewMode === 'people' && isUftPeopleDetail && project && (
                <AmbassadorDetailView project={project} />
              )}

              {viewMode === 'people' && !isUftPeopleDetail && person && (
              <>
              {/* Header with Photo and Name */}
              <div className="flex flex-col md:flex-row gap-6 mb-6 items-start">
                {/* Profile Photo Card and Highlights */}
                <div className="flex-shrink-0 w-full md:w-60">
                  <div className="rounded-lg overflow-hidden mb-4" style={{height: '270px'}}>
                    {(person.photo_url || person.photoUrl) ? (
                      <img 
                        src={getImageUrl(person.photo_url || person.photoUrl)} 
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-6xl">
                        {initials}
                      </div>
                    )}
                  </div>
                  
                  {/* Highlights */}
                  {person.highlights && person.highlights.length > 0 && (
                    <Card className="bg-black border-black">
                      <CardContent className="p-4">
                        <h3 className="font-bold text-sm mb-3 text-white">Highlights</h3>
                        <div className="space-y-3">
                          {person.highlights.map((highlight, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                ✓
                              </div>
                              <p className="text-base text-white leading-snug" style={{fontSize: '14px'}}>{highlight}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                {/* Name and Info */}
                <div className="flex-1 w-full md:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                        <h1 className="font-bold uppercase tracking-tight text-2xl md:text-3xl" style={{fontFamily: "'Galano Grotesque', sans-serif", margin: 0, lineHeight: '1.1'}}>{person.name}</h1>
                        {person.title && (
                          <p className="text-base md:text-lg text-gray-600">{person.title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#0A66C2', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.github_url && (
                        <a href={person.github_url} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#181717', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.x_url && (
                        <a href={person.x_url.startsWith('http') ? person.x_url : `https://x.com/${person.x_url.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" style={{ backgroundColor: '#000000', color: 'white' }} className="hover:opacity-90">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {person.website_url && (
                        <a href={person.website_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon" className="bg-white hover:bg-gray-200">
                            <Globe className="h-4 w-4 text-black" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Bio & Credentials */}
                  {person.bio && (
                    <div className="mb-4 pb-4 border-b">
                      <h2 className="text-lg font-bold mb-2">Bio & Credentials</h2>
                      <p className="text-gray-700 leading-snug" style={{fontSize: '16px'}}>{person.bio}</p>
                    </div>
                  )}

                  {/* Select Projects - Before Experience Section */}
                  {person?.projects && Array.isArray(person.projects) && person.projects.length > 0 && (
                    <div className="mb-4 pb-4 border-b">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold">Select Projects</h3>
                        {filteredPersonProjects && filteredPersonProjects.length > 3 && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setProjectCarouselIndex(Math.max(0, projectCarouselIndex - 3))}
                              disabled={projectCarouselIndex === 0}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const maxIndex = Math.floor((filteredPersonProjects.length - 1) / 3) * 3;
                                setProjectCarouselIndex(Math.min(maxIndex, projectCarouselIndex + 3));
                              }}
                              disabled={projectCarouselIndex >= Math.floor((filteredPersonProjects.length - 1) / 3) * 3}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {!filteredPersonProjects || filteredPersonProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8" style={{gap: '1rem'}}>
                          <Frown className="text-[#4242ea] error-icon" style={{width: '3rem', height: '3rem'}} strokeWidth={1.5} stroke="#4242ea" />
                          <p className="text-[#4242ea] uppercase" style={{fontFamily: "'Galano Grotesque', sans-serif", fontSize: '1.5rem', fontWeight: 400}}>
                            Sorry! Can't find any projects
                          </p>
                          <button
                            style={{marginTop: '1rem'}}
                            onClick={() => {
                              setProjectFilters({ search: '', skills: [], sectors: [] });
                            }}
                            className="page-nav-button h-10 px-6 rounded-full border-[1.5px] border-[#4242ea] bg-[#e3e3e3] text-[#4242ea] transition-all"
                          >
                            <span className="relative z-10">Clear Search</span>
                          </button>
                        </div>
                      ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-3">
                          {filteredPersonProjects.slice(projectCarouselIndex, projectCarouselIndex + 3).map((project, idx) => {
                          // Cycle through different icons for variety (fallback if no image)
                          const icons = [Camera, Code, Rocket, Zap, Lightbulb, Target];
                          const Icon = icons[(projectCarouselIndex + idx) % icons.length];
                          
                          // Check if project has main_image_url (prioritize this) or icon_url
                          const hasProjectImage = project.mainImageUrl || project.main_image_url || project.icon_url;
                          const imageUrl = project.mainImageUrl || project.main_image_url || project.icon_url;
                          
                          return (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white flex-shrink-0 overflow-hidden">
                                {hasProjectImage ? (
                                  <img
                                    src={getImageUrl((() => {
                                      try {
                                        // If it's a JSON string with array of images, get the first one
                                        const images = JSON.parse(imageUrl);
                                        if (Array.isArray(images) && images.length > 0) {
                                          return typeof images[0] === 'string' ? images[0] : images[0].url;
                                        }
                                      } catch {
                                        // If not JSON, use the URL as-is
                                      }
                                      return imageUrl;
                                    })())}
                                    alt={project.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                <Icon className="w-6 h-6" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-base mb-1">{project.title}</h4>
                                {(project.short_description || project.summary) && (
                                  <p className="text-gray-600 leading-snug mb-2" style={{fontSize: '16px'}}>{project.short_description || project.summary}</p>
                                )}
                                <button
                                  onClick={() => {
                                    setViewMode('projects');
                                    navigate(`/projects/${project.slug}`);
                                  }}
                                  className="text-sm inline-flex items-center gap-1 hover:underline cursor-pointer"
                                  style={{color: '#4242ea'}}
                                >
                                  Learn More →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      )}
                    </div>
                  )}

                  {/* Three Column Layout - Experience, Skills, Industry Expertise */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pt-2">
                    {/* Experience & Education */}
                    <div>
                      <h3 className="text-lg font-bold mb-3">Experience & Education</h3>
                      {person.experience && person.experience.length > 0 ? (
                        <div className="space-y-3">
                          {person.experience.map((exp, idx) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center flex-shrink-0 font-bold text-lg" style={{color: '#4242ea'}}>
                                {exp.org?.charAt(0) || '📄'}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold" style={{fontSize: '16px'}}>{exp.role}</div>
                                <div className="text-gray-600" style={{fontSize: '16px'}}>{exp.org}</div>
                                {(exp.dateFrom || exp.dateTo) && (
                                  <div className="text-gray-500 mt-0.5" style={{fontSize: '16px'}}>
                                    {exp.dateFrom} - {exp.dateTo || 'Present'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No experience listed</p>
                      )}
                    </div>

                  {/* Skills */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">Skills</h3>
                      {person.skills && person.skills.length > 0 ? (
                        <ul className={`space-y-1 ${person.skills.length > 7 ? 'grid grid-cols-2 gap-x-4' : ''}`}>
                          {person.skills.slice(0, 14).map((skill, idx) => (
                            <li key={idx} className="text-gray-700" style={{fontSize: '14px'}}>
                              • {skill}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-base">No skills listed</p>
                      )}
                    </div>

                  {/* Industry Expertise */}
                  <div>
                    <h3 className="text-lg font-bold mb-3">Industry Expertise</h3>
                      {person.industry_expertise && person.industry_expertise.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {person.industry_expertise.map((industry, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold uppercase">
                              {industry}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No industry expertise listed</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}

              {/* Project View — Standard (ambassadors redirect to /people/uft/:slug) */}
              {viewMode === 'projects' && project && (
              <>
              {/* Draft preview banner — only admins can load draft projects */}
              {isAdminLoggedIn && project.status === 'draft' && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Draft</span>
                  <span className="text-sm text-amber-800">
                    This project is a draft preview — it is not visible on the public site until published.
                  </span>
                </div>
              )}
              <div className="mb-6">
                {/* Project Info */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4">
                    <div className="flex-1">
                      {/* Title */}
                      <h1 className="font-bold uppercase tracking-tight text-2xl md:text-3xl mb-2" style={{fontFamily: "'Galano Grotesque', sans-serif"}}>{project.title}</h1>
                      
                      {/* SMB Initiative Badge - pill underneath title */}
                      {project.cohort === 'SMB Winter 2025' && (
                        <div className="mb-3">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)'}}>
                            <div className="flex items-center justify-center w-6 h-6 rounded-full"
                                 style={{
                                   backgroundColor: '#10b981',
                                 }}>
                              <Sprout size={14} color="white" strokeWidth={2} />
                            </div>
                            <span className="text-sm font-semibold" style={{color: '#10b981'}}>SMB Initiative</span>
                          </div>
                        </div>
                      )}
                      
                      {/* SMB Projects: Client Section */}
                      {project.cohort === 'SMB Winter 2025' ? (
                        <>
                          {/* Client Section - Separate */}
                          {project.has_partner && (project.partner_logo_url || project.partner_name) && (
                            <div className="mb-4 mt-3">
                              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Client</div>
                              {project.partner_logo_url ? (
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={getImageUrl(project.partner_logo_url)} 
                                    alt={project.partner_name || 'Client logo'} 
                                    className="max-h-10 object-contain"
                                    style={{ maxWidth: '160px', filter: 'brightness(0)' }}
                                  />
                                  {project.partner_name && (
                                    <span className="text-lg font-semibold text-gray-800">{project.partner_name}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xl font-bold text-gray-900">
                                  {project.partner_name}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Non-SMB projects: Regular Project Partner Section */}
                          {project.has_partner && (project.partner_logo_url || project.partner_name) && (
                            <div className="mt-6 mb-2">
                              {project.partner_logo_url ? (
                                <>
                                  <div className="mb-2">
                                    <img 
                                      src={getImageUrl(project.partner_logo_url)} 
                                      alt={project.partner_name || 'Partner logo'} 
                                      className="max-h-12 object-contain"
                                      style={{ maxWidth: '180px', filter: 'brightness(0)' }}
                                    />
                                  </div>
                                  <div className="text-xs text-gray-600 uppercase tracking-wide">
                                    <span className="font-bold">Project Partner</span>
                                    {project.partner_name && (
                                      <span className="ml-2">{project.partner_name}</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="mb-2">
                                    <div className="text-2xl font-bold text-gray-900">
                                      {project.partner_name}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold">
                                    Project Partner
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {project.github_url && (
                        <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon" className="bg-white hover:bg-gray-200">
                            <svg className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          </Button>
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="icon" className="bg-white hover:bg-gray-200">
                            <Globe className="h-4 w-4 text-black" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Summary */}
                  {project.summary && (
                    <div className="mb-6 pb-6 border-b">
                      <h2 className="text-lg font-bold mb-2">About</h2>
                      <div className="md:max-w-[75%]">
                        {project.summary.split('\n').filter(para => para.trim()).map((paragraph, idx) => (
                          <p key={idx} className="text-gray-700 leading-snug mb-4" style={{fontSize: '16px'}}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Two Column Layout - Skills and Team */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pt-2">
                    {/* Skills */}
                    <div>
                      <h3 className="text-base font-bold mb-3">Technologies</h3>
                      {project.skills && project.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {project.skills.map((skill, idx) => (
                            <span key={idx} className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No technologies listed</p>
                      )}
                    </div>

                    {/* Team */}
                    <div>
                      <h3 className="text-base font-bold mb-3">Team</h3>
                      {project.participants && project.participants.length > 0 ? (
                        <div className="space-y-2">
                          {project.participants.map((participant, idx) => (
                                     <div key={idx} className="flex items-center gap-2 text-gray-700" style={{fontSize: '16px'}}>
                                       <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                                {participant.photoUrl ? (
                                  <img 
                                    src={getImageUrl(participant.photoUrl)} 
                                    alt={participant.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                    {participant.name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              {participant.slug ? (
                                <button 
                                  onClick={() => {
                                    setViewMode('people');
                                    setFilterView('people');
                                    navigate(`/people/${participant.slug}`);
                                  }}
                                  className="hover:underline cursor-pointer"
                                  style={{color: '#4242ea'}}
                                >
                                  {participant.name || participant}
                                </button>
                              ) : (
                                <span>{participant.name || participant}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-base">No team members listed</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screenshot Section */}
                {project.main_image_url && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold mb-3">Screenshot{(() => {
                      try {
                        const images = JSON.parse(project.main_image_url);
                        return Array.isArray(images) && images.length > 1 ? 's' : '';
                      } catch {
                        return '';
                      }
                    })()}</h3>
                    <div className="space-y-6">
                      {(() => {
                        try {
                          // Try to parse as JSON array
                          const images = JSON.parse(project.main_image_url);
                          if (Array.isArray(images)) {
                            return images.map((image, idx) => (
                              <div key={idx}>
                                <div className="rounded-lg overflow-hidden">
                                  <img 
                                    src={typeof image === 'string' ? image : image.url}
                                    alt={`${project.title} screenshot ${idx + 1}`}
                                    className="w-full h-auto"
                                  />
                                </div>
                                {typeof image === 'object' && image.description && (
                                  <p className="mt-12 mb-12 text-gray-700 leading-relaxed" style={{fontSize: '16px', maxWidth: '75%'}}>{image.description}</p>
                                )}
                              </div>
                            ));
                          }
                        } catch {
                          // If not JSON, treat as single URL
                        }
                        // Single image
                        return (
                          <div className="rounded-lg overflow-hidden">
                            <img 
                              src={getImageUrl(project.main_image_url)} 
                              alt={`${project.title} screenshot`}
                              className="w-full h-auto"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Demo Video if available */}
                {project.demo_video_url && (
                  <div className="mb-6">
                    <h3 className="text-base font-bold mb-3">Demo Video{(() => {
                      try {
                        const videos = JSON.parse(project.demo_video_url);
                        return Array.isArray(videos) && videos.length > 1 ? 's' : '';
                      } catch {
                        return '';
                      }
                    })()}</h3>
                    <div className="space-y-6">
                      {(() => {
                        try {
                          // Try to parse as JSON array
                          const videos = JSON.parse(project.demo_video_url);
                          if (Array.isArray(videos)) {
                            return videos.map((video, idx) => (
                              <div key={idx}>
                                <LazyVideo
                                  src={getEmbedUrl(typeof video === 'string' ? video : video.url)}
                                  title={`Demo Video ${idx + 1}`}
                                  className="rounded-lg overflow-hidden"
                                  style={{position: 'relative', paddingBottom: '56.25%', height: 0}}
                                />
                                {typeof video === 'object' && video.description && (
                                  <p className="mt-12 mb-12 text-gray-700 leading-snug" style={{fontSize: '16px', maxWidth: '75%'}}>{video.description}</p>
                                )}
                                {typeof video === 'object' && video.screenshot_after && (
                                  <div className="mt-6 rounded-lg overflow-hidden">
                                    <img 
                                      src={video.screenshot_after}
                                      alt={`${project.title} screenshot`}
                                      className="w-full h-auto"
                                    />
                                  </div>
                                )}
                              </div>
                            ));
                          }
                        } catch {
                          // If not JSON, treat as single URL
                        }
                        // Single video
                        return (
                          <LazyVideo
                            src={getEmbedUrl(project.demo_video_url)}
                            title="Demo Video"
                            className="rounded-lg overflow-hidden"
                            style={{position: 'relative', paddingBottom: '56.25%', height: 0}}
                          />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
              </>
              )}
            </CardContent>
          </Card>
          )}
            </>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
}

export default PersonDetailPage;
