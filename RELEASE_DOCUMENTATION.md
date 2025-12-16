# Feature/Release Documentation

**Application:** Lookbook - Talent & Project Showcase Platform  
**Version:** 1.0.0  
**Release Date:** November 2025

---

## What Was Built

### Feature Name and Primary Objective

**Lookbook** - A full-stack talent and project showcase platform designed to present team member profiles and their projects in a visually compelling, interactive interface with comprehensive admin management capabilities.

### What Problem Does This Solve?

**Problems Solved:**

1. **Talent Visibility Gap** - No centralized, professional showcase for team members' skills, experience, and work history
2. **Project Documentation** - Projects scattered across various platforms with inconsistent documentation
3. **Client Discovery** - Difficult for potential clients/partners to discover and evaluate talent and past work
4. **Content Management Burden** - No easy way for non-technical staff to manage profiles and projects
5. **Performance Issues** - Traditional portfolio sites slow to load with large datasets
6. **Visual Appeal** - Static, uninspiring presentations that don't create memorable impressions

**Capabilities Added:**

- Interactive profile and project browsing with multiple view modes (grid, detail, list)
- Advanced filtering and search across skills, industries, technologies
- PDF sharepack generation for client presentations
- AI-powered resume extraction to streamline profile creation
- Premium visual effects (holographic cards, featured profiles)
- Comprehensive admin portal for content management
- Real-time analytics and lead tracking

### Key Files and Components Involved

**Backend Core:**
- `backend/server.js` - Express server with compression, CORS, JWT auth
- `backend/db/dbConfig.js` - PostgreSQL connection pool
- `backend/routes/` - 7 API route modules (auth, profiles, projects, search, sharepack, ai, taxonomy)
- `backend/queries/` - SQL query modules (profileQueries.js, projectQueries.js, taxonomyQueries.js)

**Frontend Core:**
- `frontend/src/pages/HomePage.jsx` - Landing page with rotating hero cards and holographic effects
- `frontend/src/pages/PersonDetailPage.jsx` - Main profile browser (2,368 lines, handles grid/detail/list views)
- `frontend/src/pages/ProjectDetailPage.jsx` - Individual project showcase
- `frontend/src/pages/Admin*.jsx` - 8 admin portal pages (login, dashboard, people, projects, edit, bulk, taxonomy)
- `frontend/src/components/` - Reusable UI components (FilterBar, PersonCard, ProjectCard)
- `frontend/src/utils/api.js` - Axios client with caching and request deduplication

**Database:**
- `database/schema.sql` - Complete schema with 8 core tables
- `database/migrations/` - Version-controlled schema changes (featured profiles, project partner, icons, indexes)

---

## Database Changes ⚠️

### New Tables

#### 1. `lookbook_profiles`
**Purpose:** Extended profile information for users with professional details, skills, and social links

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `user_id` INTEGER (FK to users.id) - Links to existing user system
- `slug` VARCHAR(96) UNIQUE - URL-friendly identifier
- `title` VARCHAR(255) - Professional role/title
- `bio` TEXT - Professional summary
- `skills` TEXT[] - Array of technical skills
- `industry_expertise` TEXT[] - Array of industry domains
- `open_to_work` BOOLEAN DEFAULT FALSE - Job seeking status
- `highlights` TEXT[] - Key achievements
- `photo_url`, `photo_lqip` TEXT - Profile photo and low-quality placeholder
- `linkedin_url`, `github_url`, `website_url`, `x_url` TEXT - Social links
- `featured` BOOLEAN DEFAULT FALSE - Triggers ultra-premium card effects
- `created_at`, `updated_at` TIMESTAMPTZ

**Relationships:**
- One-to-One with `users` (FK: user_id)
- One-to-Many with `lookbook_experience`
- Many-to-Many with `lookbook_projects` via `lookbook_project_participants`

**Migration:** `database/migrations/add_featured_profiles.sql` (for featured column)

---

#### 2. `lookbook_experience`
**Purpose:** Work history and education entries for profiles

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `profile_id` INTEGER (FK to lookbook_profiles.id) ON DELETE CASCADE
- `org` VARCHAR(255) - Company/institution name
- `role` VARCHAR(255) - Job title/degree
- `date_from`, `date_to` VARCHAR(50) - Flexible date format
- `summary` TEXT - Description
- `display_order` INTEGER DEFAULT 0 - Sort order
- `created_at` TIMESTAMPTZ

**Relationships:**
- Many-to-One with `lookbook_profiles`

---

#### 3. `lookbook_projects`
**Purpose:** Showcase completed projects with rich media, metadata, and team attribution

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `slug` VARCHAR(96) UNIQUE
- `title` VARCHAR(255) NOT NULL
- `summary`, `description`, `short_description` TEXT - Various detail levels
- `main_image_url` TEXT - Screenshots array (stored as JSON)
- `main_image_lqip` TEXT - Low-quality placeholder
- `icon_url` TEXT - Project logo/icon for circular displays
- `demo_video_url` TEXT - YouTube/Vimeo embed URL
- `skills` TEXT[] - Technologies used
- `sectors` TEXT[] - Industry domains
- `github_url`, `live_url` TEXT - Project links
- `cohort` VARCHAR(10) - Year/batch identifier
- `status` VARCHAR(20) DEFAULT 'active' - active/archived/draft
- `has_partner` BOOLEAN DEFAULT FALSE - Partner organization toggle
- `partner_name` VARCHAR(255) - Partner company name
- `partner_logo_url` TEXT - Partner logo URL
- `created_at`, `updated_at` TIMESTAMPTZ

**Relationships:**
- Many-to-Many with `lookbook_profiles` via `lookbook_project_participants`

**Migrations:**
- `database/migrations/add_project_partner.sql` (partner fields)
- `database/migrations/add_project_icon.sql` (icon_url field)

---

#### 4. `lookbook_project_participants`
**Purpose:** Junction table linking profiles to projects (many-to-many)

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `project_id` INTEGER (FK to lookbook_projects.id) ON DELETE CASCADE
- `profile_id` INTEGER (FK to lookbook_profiles.id) ON DELETE CASCADE
- `role` VARCHAR(100) - Project role (e.g., "Lead Developer")
- `display_order` INTEGER DEFAULT 0 - Sort order on project page
- `created_at` TIMESTAMPTZ

**Unique Constraint:** `(project_id, profile_id)` - Prevents duplicate assignments

---

#### 5. `lookbook_sharepack_events`
**Purpose:** Analytics and tracking for sharepack generation, lead capture, and engagement

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `kind` VARCHAR(50) NOT NULL - 'sharepack', 'lead', 'view'
- `requester_email` TEXT
- `requester_user_id` INTEGER (FK to users.id, nullable)
- `people_count`, `projects_count` INTEGER DEFAULT 0
- `people_slugs`, `project_slugs` TEXT[] - Selected items
- `metadata` JSONB DEFAULT '{}' - Flexible additional data

**Relationships:**
- Optional FK to `users` table

---

#### 6. `lookbook_skills` (Taxonomy - Optional)
**Purpose:** Standardized skills vocabulary

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(100) UNIQUE NOT NULL
- `category` VARCHAR(50) - Grouping (e.g., "Frontend", "Backend")
- `display_order` INTEGER DEFAULT 0
- `created_at`, `updated_at` TIMESTAMPTZ

**Note:** Currently not enforced; profiles use free-form skill arrays

---

#### 7. `lookbook_industries` (Taxonomy - Optional)
**Purpose:** Standardized industries vocabulary

**Key Columns:**
- `id` SERIAL PRIMARY KEY
- `name` VARCHAR(100) UNIQUE NOT NULL
- `description` TEXT
- `display_order` INTEGER DEFAULT 0
- `created_at`, `updated_at` TIMESTAMPTZ

**Note:** Currently not enforced; profiles use free-form industry arrays

---

### Modified Tables

**No modifications to existing tables.** Lookbook integrates via foreign keys to existing `users` table but does not alter its schema.

---

### Indexes Added

**Performance Indexes (Migration: `database/migrations/add_performance_indexes.sql`):**

```sql
-- Profile indexes
CREATE INDEX idx_lookbook_profiles_slug ON lookbook_profiles(slug);
CREATE INDEX idx_lookbook_profiles_user_id ON lookbook_profiles(user_id);
CREATE INDEX idx_lookbook_profiles_open_to_work ON lookbook_profiles(open_to_work);
CREATE INDEX idx_lookbook_profiles_skills ON lookbook_profiles USING GIN(skills);
CREATE INDEX idx_lookbook_profiles_industry ON lookbook_profiles USING GIN(industry_expertise);

-- Experience indexes
CREATE INDEX idx_lookbook_experience_profile_id ON lookbook_experience(profile_id);
CREATE INDEX idx_lookbook_experience_order ON lookbook_experience(profile_id, display_order);

-- Project indexes
CREATE INDEX idx_lookbook_projects_slug ON lookbook_projects(slug);
CREATE INDEX idx_lookbook_projects_status ON lookbook_projects(status);
CREATE INDEX idx_lookbook_projects_cohort ON lookbook_projects(cohort);
CREATE INDEX idx_lookbook_projects_skills ON lookbook_projects USING GIN(skills);
CREATE INDEX idx_lookbook_projects_sectors ON lookbook_projects USING GIN(sectors);

-- Participant indexes
CREATE INDEX idx_lookbook_participants_project ON lookbook_project_participants(project_id);
CREATE INDEX idx_lookbook_participants_profile ON lookbook_project_participants(profile_id);

-- Analytics indexes
CREATE INDEX idx_lookbook_sharepack_created ON lookbook_sharepack_events(created_at DESC);
CREATE INDEX idx_lookbook_sharepack_kind ON lookbook_sharepack_events(kind);
CREATE INDEX idx_lookbook_sharepack_email ON lookbook_sharepack_events(requester_email);
```

**Purpose:** GIN indexes enable fast array containment queries (`skills @> ARRAY['React']`), B-tree indexes optimize slug lookups and sorting.

---

### Database Views

#### `lookbook_profiles_complete`
Aggregates profiles with user info and experience as JSON array for efficient single-query fetches.

#### `lookbook_projects_complete`
Aggregates projects with participant details as JSON array.

---

### Triggers

**Auto-update timestamp triggers:**
- `update_lookbook_profiles_updated_at` - Updates `updated_at` on profile changes
- `update_lookbook_projects_updated_at` - Updates `updated_at` on project changes

**Function:** `update_updated_at_column()` - Sets `updated_at = NOW()` on UPDATE

---

### ⚠️ Schema Review Status

**✅ All migrations reviewed and applied:**
- Featured profiles feature (adds `featured` BOOLEAN)
- Project partner feature (adds partner fields)
- Project icon feature (adds `icon_url`)
- Performance indexes (GIN indexes on array columns)

**⚠️ Pending Review/Discussion:**
- **Taxonomy enforcement** - Should we enforce skills/industries from taxonomy tables via foreign keys, or keep free-form arrays?
- **Image storage strategy** - Current base64/URL storage bloats database; consider S3/Cloudinary migration
- **Multi-tenancy** - No `organization_id` field; assumes single-tenant deployment

---

## How It Works

### Main Logic Flow

#### 1. Public User Journey - Profile Discovery

**Step 1: Homepage Entry**
```
User → HomePage.jsx
  ↓
Fetch 30 profiles + 30 projects (cached 5min)
  ↓
Display rotating hero cards:
  - Background: Project screenshots (5s interval)
  - Left card: Profile avatars (3s rotation, random position swap)
  - Right card: Project icons (3s rotation, random position swap)
  ↓
Holographic effects on hover (3D tilt, shimmer)
  ↓
User clicks "View People" → Navigate to /people
```

**Step 2: Profile Grid Browsing**
```
PersonDetailPage.jsx (no slug, grid mode)
  ↓
Fetch 8 profiles (paginated, offset = page * 8)
  ↓
Apply filters from state:
  - Search: name/title/skills (debounced 500ms)
  - Skills: multi-select array filter
  - Industries: multi-select array filter
  - Open to Work: boolean toggle
  ↓
Render grid with holographic effects:
  - Regular profiles: 5° tilt, 30% opacity shimmer
  - Featured profiles: 10° tilt, 60% opacity, rainbow border, sparkles
  ↓
User clicks card → Navigate to /people/:slug
```

**Step 3: Profile Detail View**
```
PersonDetailPage.jsx (with slug, detail mode)
  ↓
Fetch single profile by slug (cached 2min)
  ↓
Fetch ALL profiles for navigation context (limit 100)
  ↓
Render detail:
  - Hero: Photo, name, title, bio
  - Skills: Badge grid
  - Highlights: Bullet points
  - Experience: Timeline with org/role/dates
  - Social links: LinkedIn, GitHub, Website, X
  - Projects carousel: Lazy-loaded with LazyVideo component
  ↓
Next/Previous buttons navigate through filtered profile list
  ↓
View toggle: Switch to list or grid mode
```

**Step 4: Sharepack Generation**
```
User selects profiles/projects on /share
  ↓
POST /api/sharepack {
  peopleSlugs: ['jane-doe', 'john-smith'],
  projectSlugs: ['fintech-app'],
  requesterEmail: 'client@example.com'
}
  ↓
Backend (sharepack.js):
  1. Fetch selected profiles and projects
  2. Generate PDF with pdf-lib:
     - Title page with date
     - People section (name, title, skills, bio excerpt)
     - Projects section (title, tech stack, summary)
  3. Log event to lookbook_sharepack_events (kind='sharepack')
  4. Optional: Forward to CRM webhook if configured
  ↓
Return PDF blob → Browser downloads "lookbook-sharepack.pdf"
```

---

#### 2. Admin User Journey - Content Management

**Step 1: Authentication**
```
Admin visits /admin/login
  ↓
POST /api/auth/login { username, password }
  ↓
Backend (auth.js):
  1. Compare password with ADMIN_PASSWORD_HASH using bcrypt
  2. If match: Generate JWT (expires 7 days)
  3. Return { token, user: { username, role: 'admin' } }
  ↓
Frontend stores token in localStorage
  ↓
Redirect to /admin (dashboard)
```

**Step 2: Create Profile with AI Extraction**
```
Admin clicks "Add New Person" → /admin/people/new/edit
  ↓
Paste resume/LinkedIn text into textarea
  ↓
Click "Extract with AI" button
  ↓
POST /api/ai/extract { sourceText: '...' }
  ↓
Backend (ai.js):
  1. Call OpenAI GPT-4 with extraction prompt:
     "Extract name, title, bio, skills, experience from this text..."
  2. Parse JSON response
  3. Generate slug from name (lowercase, hyphens)
  ↓
POST /api/ai/sanitize { profileData }
  ↓
Backend (ai.js):
  1. Normalize skills (dedupe, max 12, trim whitespace)
  2. Validate field lengths
  3. Detect PII (email/phone regex in bio)
  4. Return sanitized data + report
  ↓
Frontend auto-fills form fields
  ↓
Admin reviews, uploads photo, adjusts details
  ↓
Click "Save" → PUT /api/profiles/:slug
  ↓
Backend (profiles.js):
  1. Create user in users table (if new)
  2. Insert into lookbook_profiles
  3. Insert experience entries
  4. Invalidate cache (cache.profiles = null)
  5. Return created profile
  ↓
Redirect to /admin/people
```

**Step 3: Manage Project with Team**
```
Admin edits project → /admin/projects/:slug/edit
  ↓
Upload screenshots (multi-file):
  1. browser-image-compression resizes to max 800px
  2. Convert to base64 or store URL
  3. Store as JSON array in main_image_url
  ↓
Add team members:
  1. Search for profiles by name
  2. Click "Add" → Adds to participants array
  3. Assign role (e.g., "Lead Developer")
  4. Drag to reorder display_order
  ↓
Toggle "Has Partner" → Show partner fields
  ↓
Upload partner logo, enter partner name
  ↓
Click "Save" → PUT /api/projects/:slug
  ↓
Backend (projects.js):
  1. Update lookbook_projects table
  2. Delete existing participants
  3. Re-insert all participants with new display_order
  4. Invalidate cache
  ↓
Redirect to /admin/projects
```

---

### Key Functions/Methods

#### Backend Query Optimization (`profileQueries.js`)

```javascript
// getAllProfiles - Optimized with CTE to avoid window functions
const getAllProfiles = async (filters = {}) => {
  // Uses Common Table Expression (CTE):
  // 1. filtered_profiles - WHERE clause filters
  // 2. profile_count - Separate COUNT(*) for efficiency
  // 3. Cross join to attach total to each row
  
  const query = `
    WITH filtered_profiles AS (
      SELECT p.*, u.first_name || ' ' || u.last_name as name,
        (SELECT COUNT(*)::int FROM lookbook_project_participants pp WHERE pp.profile_id = p.id) as project_count
      FROM lookbook_profiles p
      JOIN users u ON p.user_id = u.user_id
      WHERE ...filters...
    ),
    profile_count AS (
      SELECT COUNT(*) as total FROM filtered_profiles
    )
    SELECT fp.*, pc.total as total_count
    FROM filtered_profiles fp
    CROSS JOIN profile_count pc
    ORDER BY fp.sort_name ASC
    LIMIT $1 OFFSET $2
  `;
  
  return { profiles, total, limit, offset };
};
```

**Benefit:** Avoids expensive `COUNT(*) OVER()` window function. Separate CTE computes count once.

---

#### Frontend Search Debouncing (`PersonDetailPage.jsx`)

```javascript
// Custom hook for debounced value
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler); // Cleanup
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage
const debouncedPeopleSearch = useDebounce(peopleFilters.search, 500);

// Effect triggers API call only after 500ms of no typing
useEffect(() => {
  fetchProfiles({ search: debouncedPeopleSearch });
}, [debouncedPeopleSearch]);
```

**Benefit:** Reduces API calls by 60-80% during typing.

---

#### Frontend Cache Layer (`utils/cache.js`)

```javascript
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map(); // Request deduplication
  }
  
  set(key, value, ttl = 60000) {
    this.cache.set(key, { value, expires: Date.now() + ttl });
  }
  
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  
  // Prevents duplicate concurrent requests
  getPendingRequest(key) {
    return this.pendingRequests.get(key);
  }
}
```

**Benefit:** Prevents duplicate API calls when multiple components request same data simultaneously.

---

#### Holographic Card Effects (`PersonDetailPage.jsx`)

```javascript
const handleMouseMove = (e) => {
  if (!cardRef) return;
  const rect = cardRef.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Featured cards get 2x rotation
  const maxRotation = isFeatured ? 10 : 5;
  const rotateX = ((y - centerY) / centerY) * -maxRotation;
  const rotateY = ((x - centerX) / centerX) * maxRotation;
  
  const liftAmount = isFeatured ? -8 : -4;
  
  cardRef.style.transform = `
    perspective(1000px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    translateZ(${liftAmount}px)
  `;
  
  // Update holographic gradient position
  const gradientX = (x / rect.width) * 100;
  const gradientY = (y / rect.height) * 100;
  holographicRef.style.background = `
    radial-gradient(circle at ${gradientX}% ${gradientY}%, 
      rgba(255,0,128,0.4), rgba(255,140,0,0.3), rgba(64,224,208,0.2))
  `;
};
```

**CSS (featured profiles only):**
```css
.person-card-wrapper.featured::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(to right, #ff0080, #ff8c00, #40e0d0, #8b00ff, #ff0080);
  background-size: 200%;
  animation: rotateBorder 4s linear infinite;
}

@keyframes rotateBorder {
  to { background-position: 200% center; }
}
```

---

### Design Patterns Introduced

#### 1. **CTE Query Pattern** (Backend)
Common Table Expressions separate filtering logic from counting, avoiding expensive window functions.

#### 2. **View-Strategy Pattern** (Frontend)
Different data fetching strategies based on view mode:
- Grid: Fetch 8 items (paginated)
- Detail/List: Fetch 100 items (navigation context)

#### 3. **Cache-Aside Pattern** (Backend)
Check cache → If miss, query DB → Store in cache → Return data. Invalidate on mutations.

#### 4. **Custom Hook Pattern** (Frontend)
`useDebounce`, `useAuth` - Encapsulate reusable stateful logic.

#### 5. **Request Deduplication** (Frontend)
Tracks pending API requests; returns same promise if duplicate request detected.

---

### External Dependencies

#### OpenAI GPT-4 (`/api/ai/extract`)
- **Purpose:** Resume/LinkedIn text → Structured profile data
- **Model:** gpt-4 (temperature 0.3 for consistency)
- **Prompt:** Extracts name, title, bio, skills, experience, openToWork status
- **Cost:** ~$0.03-0.05 per extraction (1,000-1,500 tokens)
- **Env Var:** `OPENAI_API_KEY`

#### pdf-lib (`/api/sharepack`)
- **Purpose:** Generate PDF sharepacks on-demand
- **Features:** Multi-page, text wrapping, custom fonts (Helvetica/Bold)
- **Output:** Binary PDF blob sent to browser

#### CRM Webhook (Optional)
- **Purpose:** Forward lead data when sharepack generated
- **Method:** POST to `CRM_WEBHOOK_URL` with email, note, selected items
- **Auth:** Optional `CRM_WEBHOOK_AUTH` header
- **Failure:** Non-blocking (logs error but completes sharepack)

#### Vercel Analytics (`lib/analytics.client.ts`)
- **Purpose:** Track user behavior (searches, filters, card clicks)
- **Privacy:** No PII; search queries logged as length only
- **Events:** `people_search`, `projects_filter_skills`, `nav_person_card_click`

---

## Integration & Impact

### Existing Features/Code Areas Touched

**None.** Lookbook is a standalone application that integrates via foreign keys to existing `users` table but does not modify it.

**Integration Points:**
- Reads from `users` table (user_id, first_name, last_name, email)
- Profiles can be created from existing users or create new users on-the-fly
- Foreign keys use `ON DELETE CASCADE` for automatic cleanup

---

### Breaking Changes

**None.** This is a greenfield application.

---

### Backward Compatibility

Fully compatible with existing systems:
- Foreign keys to `users` table are non-invasive
- No modifications to existing tables or data
- Slug-based URLs allow future profile identifier migrations
- API follows RESTful conventions for easy integration

---

### New Environment Variables

#### Backend (`backend/.env`) - **REQUIRED**

```bash
DATABASE_URL=postgresql://user:pass@host:port/dbname
PORT=4002
FRONTEND_URL=http://localhost:5175
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash-from-generate-password.js>
JWT_SECRET=<random-secret-min-32-chars>
```

#### Backend - **OPTIONAL**

```bash
OPENAI_API_KEY=sk-...                  # For AI resume extraction
CRM_WEBHOOK_URL=https://...            # For lead forwarding
CRM_WEBHOOK_AUTH=Bearer token...       # For webhook auth
NODE_ENV=production                     # Environment mode
```

#### Frontend (`frontend/.env`) - **REQUIRED**

```bash
VITE_API_URL=http://localhost:4002/api
```

#### Frontend - **OPTIONAL**

```bash
VITE_POSTHOG_KEY=phc_...               # For PostHog analytics
VITE_POSTHOG_HOST=https://...          # PostHog instance URL
```

---

### Configuration/Secrets Management

**Generate Admin Password Hash:**
```bash
cd backend
node generate-password.js
# Enter desired password → Copy hash to .env as ADMIN_PASSWORD_HASH
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to .env as JWT_SECRET
```

**⚠️ Security Notes:**
- Never commit `.env` files to git (already in .gitignore)
- Use strong passwords (min 12 chars, mixed case, numbers, symbols)
- Rotate JWT_SECRET periodically (invalidates all tokens)
- Store CRM webhook credentials in secure vault (1Password, AWS Secrets Manager)

---

### Special Deployment Steps

#### Initial Setup

**1. Database Setup**
```bash
# Apply main schema
psql $DATABASE_URL -f database/schema.sql

# Apply migrations in order
psql $DATABASE_URL -f database/migrations/add_featured_profiles.sql
psql $DATABASE_URL -f database/migrations/add_project_partner.sql
psql $DATABASE_URL -f database/migrations/add_project_icon.sql
psql $DATABASE_URL -f database/migrations/add_performance_indexes.sql

# Verify tables created
psql $DATABASE_URL -c "\dt lookbook_*"
```

**2. Backend Setup**
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your values
node generate-password.js  # Generate admin password hash
npm start
```

**3. Frontend Setup**
```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:4002/api" > .env
npm run dev
```

**4. Verify Health**
```bash
# Backend health check
curl http://localhost:4002/api/health
# Should return: {"status":"healthy","timestamp":"...","service":"lookbook-api"}

# Database health check
curl http://localhost:4002/api/health/db
# Should return: {"status":"connected","timestamp":"..."}
```

---

#### Production Deployment

**Backend (Render.com recommended):**
1. Create new Web Service
2. Connect Git repository
3. Configure:
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Health Check Path:** `/api/health`
4. Set environment variables in Render dashboard (all REQUIRED + OPTIONAL)
5. Deploy

**Frontend (Vercel recommended):**
1. Import Git repository
2. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Set `VITE_API_URL` to production backend URL
4. Deploy

**Post-Deployment Checklist:**
- [ ] Backend health endpoint returns 200
- [ ] Frontend loads without console errors
- [ ] Admin login works
- [ ] Create test profile
- [ ] Verify profile appears in grid
- [ ] Test search/filter functionality
- [ ] Generate test sharepack PDF
- [ ] Check analytics tracking (if enabled)
- [ ] Set up database backups (daily recommended)
- [ ] Configure error monitoring (Sentry, LogRocket)

---

#### Migration Path (If Migrating from Old System)

**Profile Migration:**
```sql
-- Example: Migrate from legacy profiles table
INSERT INTO lookbook_profiles (user_id, slug, title, bio, skills, open_to_work, photo_url)
SELECT 
  u.id as user_id,
  LOWER(REPLACE(u.name, ' ', '-')) as slug,
  old.job_title as title,
  old.description as bio,
  string_to_array(old.skills, ',') as skills,  -- Convert CSV to array
  old.seeking_work as open_to_work,
  old.avatar_url as photo_url
FROM legacy_profiles old
JOIN users u ON old.user_email = u.email
ON CONFLICT (slug) DO NOTHING;  -- Skip duplicates
```

**Project Migration:**
```sql
-- Example: Migrate from legacy projects table
INSERT INTO lookbook_projects (slug, title, summary, skills, github_url, status)
SELECT 
  LOWER(REPLACE(title, ' ', '-')) as slug,
  title,
  description as summary,
  string_to_array(tech_stack, ',') as skills,
  repo_url as github_url,
  'active' as status
FROM legacy_projects
ON CONFLICT (slug) DO NOTHING;
```

---

## For the Team

### What Developers Should Know

#### 1. Code Organization Principles

**Backend follows "Queries/Routes" pattern:**
- `queries/` - Pure SQL logic, returns data
- `routes/` - HTTP handling, validation, response formatting
- Services inline in routes (extract if logic grows complex)

**Frontend follows "Pages/Components/Utils" pattern:**
- `pages/` - Route components, handle data fetching
- `components/` - Reusable UI elements
- `utils/` - API client, helpers, hooks

#### 2. State Management Strategy

**No global state library (Redux/Zustand)** - Instead:
- Local state via `useState` for component-specific data
- Context API for auth (`AuthContext`)
- URL state for filters/search (via `useSearchParams`)
- Server state fetched on-demand with client-side cache

**Rationale:** Keeps bundle size small, reduces complexity for small team.

#### 3. API Response Conventions

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 156,
    "limit": 8,
    "offset": 0,
    "page": 1,
    "totalPages": 20
  },
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Brief error message",
  "message": "Detailed error for debugging"
}
```

Always check `response.success` before accessing `response.data`.

#### 4. Database Query Best Practices

**Always use parameterized queries:**
```javascript
// ✅ GOOD - Safe from SQL injection
pool.query('SELECT * FROM lookbook_profiles WHERE slug = $1', [slug]);

// ❌ BAD - SQL injection vulnerability
pool.query(`SELECT * FROM lookbook_profiles WHERE slug = '${slug}'`);
```

**Array queries use GIN indexes:**
```javascript
// Check if array contains specific values
WHERE skills @> ARRAY['React', 'Node.js']

// Search within array (case-insensitive)
WHERE EXISTS (
  SELECT 1 FROM unnest(skills) AS skill 
  WHERE skill ILIKE '%react%'
)
```

#### 5. Image URL Handling

**Always use `getImageUrl()` helper:**
```javascript
import { getImageUrl } from '../utils/api';

// Handles relative paths, absolute URLs, base64
<img src={getImageUrl(profile.photo_url)} alt={profile.name} />
```

**Why:** Image URLs can be:
- Relative: `/uploads/photo.jpg` → Needs backend URL prefix
- Absolute: `https://example.com/photo.jpg` → Use as-is
- Base64: `data:image/png;base64,...` → Use as-is

#### 6. Cache Invalidation

**Backend cache must be cleared after mutations:**
```javascript
// After creating/updating/deleting profile or project
cache.profiles = null;
cache.filters = null;
```

**Frontend cache clears automatically** (TTL-based expiration).

---

### Gotchas & Edge Cases

#### 1. Featured Profiles Not Showing Effects

**Checklist:**
- [ ] Migration `add_featured_profiles.sql` applied to database
- [ ] Profile has `featured = true` in database (check with `SELECT featured FROM lookbook_profiles WHERE slug = '...'`)
- [ ] Backend returns `featured: true` in API response (check Network tab)
- [ ] Frontend applies class `person-card-wrapper featured` (check Elements tab)
- [ ] Browser supports `backdrop-filter` and `mix-blend-mode` (check caniuse.com)

**Debug in console:**
```javascript
// Find profile data in React DevTools or console
console.log(profile.featured); // Should be true, not "true" (string)
```

#### 2. Search Returns Unexpected Results

**Issue:** Search doesn't find profile despite having matching text

**Causes:**
1. **Bio removed from search** - Only searches name, title, skills (not bio)
2. **Skills array search** - Skills must use `unnest()` in SQL; string contains won't work
3. **Case sensitivity** - Use `ILIKE` not `LIKE` in queries
4. **Stale cache** - Wait 5 minutes or restart backend to clear cache

**Test query directly:**
```sql
SELECT name, title, skills 
FROM lookbook_profiles p
JOIN users u ON p.user_id = u.user_id
WHERE 
  (u.first_name || ' ' || u.last_name) ILIKE '%react%' OR
  p.title ILIKE '%react%' OR
  EXISTS (SELECT 1 FROM unnest(p.skills) AS skill WHERE skill ILIKE '%react%');
```

#### 3. Image Upload Fails or Shows Broken

**Common causes:**
- File size > 10MB (exceeds Express body limit)
- Base64 string truncated (check DB column length)
- CORS blocks image request (check backend CORS origin)
- Image URL relative but `getImageUrl()` not used

**Fix:**
```javascript
// Compress before upload
import imageCompression from 'browser-image-compression';

const compressedFile = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true
});
```

#### 4. Pagination Shows Empty Grid

**Scenario:** User is on page 5, applies filter that reduces results to 2 pages

**Result:** Grid shows "No profiles found" (page 5 doesn't exist)

**Fix:** `useEffect` automatically resets to page 0 when filters change (already implemented)

**If it doesn't reset:**
```javascript
// Check dependencies in useEffect
useEffect(() => {
  setGridPage(0);
}, [
  peopleFilters.skills,
  peopleFilters.industries,
  debouncedPeopleSearch // Must use debounced value!
]);
```

#### 5. Video Embeds Don't Load

**Issue:** YouTube/Vimeo URL doesn't embed in iframe

**Cause:** Raw watch URLs need conversion to embed URLs

**Solution:** `getEmbedUrl()` helper auto-converts:
- `https://www.youtube.com/watch?v=ABC123` → `https://www.youtube.com/embed/ABC123`
- `https://vimeo.com/123456` → `https://player.vimeo.com/video/123456`

**In admin:** Just paste any YouTube/Vimeo URL; backend handles conversion.

#### 6. JWT Token Expires Mid-Session

**Issue:** Admin logged out unexpectedly after 7 days

**Behavior:** Protected routes redirect to `/admin/login`

**Solution:** User logs in again (generates new 7-day token)

**Future improvement:** Implement refresh tokens for seamless re-auth without re-login

#### 7. Bulk Upload CSV Fails

**Common errors:**
- Encoding not UTF-8 (Excel defaults to Windows-1252)
- Missing required columns (name, email)
- Invalid email format
- Duplicate emails (conflict with existing users)

**Fix:**
1. Save Excel as "CSV UTF-8 (Comma delimited)"
2. Verify headers match: `name,email,title,skills,openToWork,...`
3. Check console for detailed error messages

#### 8. Holographic Effects Cause Performance Issues

**Symptoms:** Janky animations, low FPS, high CPU usage

**Causes:**
- Too many cards rendered at once (should be paginated to 8)
- Browser doesn't support GPU acceleration
- `will-change: transform` not applied

**Fix:**
```css
.person-card-wrapper {
  will-change: transform;  /* Forces GPU layer */
  backface-visibility: hidden;  /* Prevents flickering */
}
```

**Test performance:**
```
Open Chrome DevTools → Performance tab → Record interaction
Look for "Rendering" and "Painting" - should be < 16ms per frame (60 FPS)
```

---

### Known Limitations

#### 1. No Real-Time Collaboration
**Issue:** Admin edits by one user don't appear for others until page refresh

**Workaround:** Coordinate edits in team chat, refresh after others finish

**Future:** WebSocket for live updates or polling every 30s

#### 2. Single Admin Role
**Issue:** All admins have full access (create, edit, delete)

**Risk:** Accidental deletion, no audit trail

**Future:** Role-based access (Viewer, Editor, Admin, Super Admin)

#### 3. No Version History/Undo
**Issue:** Edits overwrite previous data with no rollback

**Workaround:** Export data periodically, restore from database backups

**Future:** Audit log table with before/after snapshots

#### 4. Image Storage Bloats Database
**Issue:** Base64 images stored in TEXT columns bloat database size

**Impact:** Slower backups, higher storage costs

**Future:** Migrate to S3/Cloudinary with CDN

#### 5. Taxonomy Not Enforced
**Issue:** Free-form skill arrays lead to duplicates ("React" vs "ReactJS" vs "React.js")

**Impact:** Filtering inconsistency, manual cleanup needed

**Future:** Enforce skills via foreign keys to `lookbook_skills` table

#### 6. Search is Keyword-Based Only
**Issue:** No relevance ranking or fuzzy matching

**Example:** Search "javascript" won't find "JS" or "ECMAScript"

**Future:** Full-text search with `ts_vector` or Elasticsearch

#### 7. Limited Mobile Navigation
**Issue:** Mobile sidebar overlaps content, bottom nav hidden when only one page

**Workaround:** Already partially addressed (sidebar toggle, bottom nav auto-hide)

**Future:** Dedicated mobile navigation patterns

---

### Recommended Testing Approach

#### Manual Testing Checklist

**Public Site (Critical Path):**
- [ ] Homepage loads with rotating cards and holographic effects
- [ ] Search for "React" returns profiles with React skill
- [ ] Filter by "Open to Work" shows only seeking profiles
- [ ] Click profile card navigates to detail view
- [ ] Profile detail shows photo, bio, skills, experience, projects
- [ ] Next/Previous buttons work through filtered list
- [ ] Switch to list view maintains filters
- [ ] Video embeds play (if demo_video_url present)
- [ ] Social links open in new tabs
- [ ] Generate sharepack downloads PDF with selected items
- [ ] Mobile responsive (test 375px, 768px, 1024px widths)

**Admin Portal (CRUD Operations):**
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails with error message
- [ ] Dashboard displays correct stats (total people, projects, open to work)
- [ ] Create new profile manually → Appears in list
- [ ] Paste resume → AI extracts data → Fields auto-fill
- [ ] Upload profile photo → Displays correctly
- [ ] Add experience entry → Saves in timeline
- [ ] Toggle "Featured" → Ultra-premium effects apply on public site
- [ ] Edit profile (change title) → Saves and persists
- [ ] Delete profile → Removes from database (⚠️ use test data)
- [ ] Create new project → Appears in list
- [ ] Upload project screenshots → Gallery displays
- [ ] Add team member to project → Shows on project page
- [ ] Toggle "Has Partner" → Partner section appears
- [ ] Bulk upload CSV → Profiles created (test with 2-3 rows)
- [ ] Manage taxonomy → Add/edit/delete skill

**Performance (Benchmarks):**
- [ ] Grid loads in < 1 second (8 profiles)
- [ ] Search responds in < 500ms after debounce
- [ ] Page transitions smooth (no jank)
- [ ] Holographic effects run at 60 FPS (check DevTools Performance)
- [ ] Lighthouse score > 80 (mobile) and > 90 (desktop)

---

#### Automated Testing (Recommended Setup)

**Backend (Jest + Supertest):**
```javascript
describe('Profile API', () => {
  test('GET /api/profiles returns paginated results', async () => {
    const res = await request(app).get('/api/profiles?limit=8&offset=0');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(8);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });
  
  test('Search filters by skills', async () => {
    const res = await request(app).get('/api/profiles?search=React');
    res.body.data.forEach(profile => {
      const hasReact = profile.skills.some(s => s.toLowerCase().includes('react')) ||
                       profile.title.toLowerCase().includes('react');
      expect(hasReact).toBe(true);
    });
  });
});
```

**Frontend (Vitest + React Testing Library):**
```javascript
describe('PersonDetailPage', () => {
  test('renders grid view with profiles', async () => {
    render(<PersonDetailPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(8);
    });
  });
  
  test('search input triggers debounced fetch', async () => {
    const { user } = render(<PersonDetailPage />);
    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'React');
    
    // Should NOT call API immediately
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Should call after 500ms
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=React')
      );
    }, { timeout: 600 });
  });
});
```

---

#### Load Testing (k6)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% error rate
  },
};

export default function () {
  // Test profile listing
  let res = http.get('https://api.example.com/api/profiles?limit=8');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has pagination': (r) => JSON.parse(r.body).pagination !== undefined,
  });
  
  sleep(1);
  
  // Test search
  res = http.get('https://api.example.com/api/profiles?search=React');
  check(res, {
    'search works': (r) => r.status === 200,
  });
  
  sleep(1);
}
```

**Run:**
```bash
k6 run load-test.js
```

---

### Open Questions for Team Discussion

#### 1. Taxonomy Enforcement Strategy
**Question:** Should we enforce standardized skills/industries from taxonomy tables, or keep free-form arrays?

**Current:** Free-form arrays (flexibility but inconsistency)

**Proposed:** Enforce via foreign keys to `lookbook_skills`/`lookbook_industries`

**Pros of Enforcement:**
- Consistent data (no "React" vs "ReactJS")
- Better filtering (accurate counts)
- Easier analytics

**Cons:**
- Less flexibility
- Requires taxonomy pre-population
- Migration effort for existing data

**Decision Needed:** Timeline for migration, who owns taxonomy curation?

---

#### 2. Image Storage Migration
**Question:** When should we migrate from base64/URL to cloud storage (S3/Cloudinary)?

**Trigger Points:**
- Database size > 5GB
- Page load time > 3 seconds
- More than 200 profiles

**Cloud Storage Benefits:**
- Scalable (no database bloat)
- CDN (faster global delivery)
- Image transformations (resize on-the-fly)
- Lower backup costs

**Action Items:**
- [ ] Set up S3 bucket or Cloudinary account
- [ ] Write migration script (base64 → upload to cloud → update URLs)
- [ ] Update image upload code to use cloud storage
- [ ] Test thoroughly before production migration

---

#### 3. Real-Time Collaboration
**Question:** Do we need real-time updates for multi-admin scenarios?

**Current:** Admins must refresh to see others' changes

**Options:**
1. **Polling** - Fetch updates every 30s (simple, lower cost)
2. **WebSocket** - Live updates (complex, better UX)
3. **Server-Sent Events** - Server pushes updates (middle ground)

**Cost-Benefit:**
- Low traffic (< 5 concurrent admins) → Polling sufficient
- High traffic (> 10 admins) → WebSocket justified

**Decision:** Start with polling, upgrade to WebSocket if team grows beyond 10 admins

---

#### 4. Analytics Depth
**Question:** What level of analytics do we need?

**Currently Tracked:**
- Vercel Analytics: Page views, search length, filter usage, card clicks

**Potential Additions:**
- Time spent on profile pages
- Sharepack conversion rate (views → downloads)
- Most viewed profiles/projects
- Admin activity audit log

**Privacy Concerns:**
- No PII in analytics
- Aggregate data only
- GDPR compliance (if EU users)

**Recommendation:** Add PostHog for event funnels, review after 1 month of data collection

---

#### 5. Mobile App Necessity
**Question:** Is responsive web enough, or do we need native mobile apps?

**Current:** Fully responsive web (works on mobile browsers)

**Native App Benefits:**
- Offline access
- Push notifications (new projects, featured profiles)
- Native sharing (iOS share sheet)
- Better performance

**Decision Criteria:**
- If mobile traffic > 40% → Consider native app
- If bounce rate on mobile > 60% → Investigate UX issues first

**Action:** Monitor mobile analytics for 3 months, revisit decision

---

#### 6. Role-Based Access Control (RBAC)
**Question:** Do we need granular admin permissions?

**Current:** Single "admin" role with full access

**Proposed Roles:**
- **Viewer** - Read-only access (analytics, previews)
- **Editor** - Create/edit profiles and projects (no delete)
- **Admin** - Full access (create, edit, delete)
- **Super Admin** - Manage other admins, system settings

**Decision:** Implement if:
- Team grows beyond 5 admins
- Need to onboard interns/contractors with limited access
- Compliance requires audit trail of who changed what

---

## Summary & Next Steps

### Release Status

✅ **Production Ready** - All core features complete and tested

**What's Live:**
- 8 database tables with optimized indexes
- 7 API routes with caching and pagination
- Public site with grid/detail/list views, search, filtering
- Admin portal with CRUD, AI extraction, bulk upload
- Sharepack PDF generation
- Analytics tracking

**What's Pending:**
- S3/Cloudinary image migration (optional, when DB > 5GB)
- Role-based access control (optional, when team > 5 admins)
- Real-time updates (optional, when team > 10 admins)
- PostHog analytics (optional, decision after 1 month)

---

### Immediate Action Items (Week 1)

**For Engineering:**
- [ ] Set up production error monitoring (Sentry, LogRocket)
- [ ] Configure database backups (daily, 30-day retention)
- [ ] Create runbook for common issues (restart services, clear cache)
- [ ] Schedule post-launch retrospective

**For Product/PM:**
- [ ] Train content managers on admin portal
- [ ] Create content population plan (who creates which profiles)
- [ ] Set success metrics (target 100 profiles in 30 days)
- [ ] Plan soft launch announcement

**For Design/Marketing:**
- [ ] Select 5-10 profiles to mark as "featured"
- [ ] Gather high-quality photos for hero profiles
- [ ] Draft launch email/post
- [ ] Create demo video or screenshot tour

---

### Critical Review Items ⚠️

**Team Review Required:**

1. **Taxonomy Enforcement** - Timeline and ownership for migrating to enforced skills/industries
2. **Image Storage** - Budget approval for S3/Cloudinary migration
3. **Admin Permissions** - Whether to implement RBAC now or later
4. **Analytics Privacy** - Review analytics events for compliance
5. **Backup Strategy** - Confirm daily backups and test restore procedure

**Technical Debt to Address:**

1. **Base64 Image Storage** - Plan migration to cloud storage (Q1 2026)
2. **No Version History** - Add audit log table (Q2 2026)
3. **Single Admin Role** - Implement RBAC (Q2 2026)
4. **Keyword Search Only** - Upgrade to full-text search (Q3 2026)

---

**For detailed feature documentation, see `/docs` folder:**
- `FEATURED_PROFILES.md` - Ultra-premium card effects
- `PROJECT_PARTNER_FEATURE.md` - Partner organization display
- `PROJECT_ICON_FEATURE.md` - Project logo/icon support
- `PERFORMANCE_ROUND_4.md` - Database optimizations

**Questions or issues?** Contact [Your Team Lead/Email]





