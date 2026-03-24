import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProgressProvider } from './contexts/LoadingProgressContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load main user-facing pages (code splitting)
const HomePage = lazy(() => import('./pages/HomePage'));
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const SharePage = lazy(() => import('./pages/SharePage'));

// Lazy load admin pages (less frequently accessed)
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminPeoplePage = lazy(() => import('./pages/AdminPeoplePage'));
const AdminProjectsPage = lazy(() => import('./pages/AdminProjectsPage'));
const AdminPersonEditPage = lazy(() => import('./pages/AdminPersonEditPage'));
const AdminProjectEditPage = lazy(() => import('./pages/AdminProjectEditPage'));
const AdminBulkUploadPage = lazy(() => import('./pages/AdminBulkUploadPage'));
const AdminTaxonomyPage = lazy(() => import('./pages/AdminTaxonomyPage'));
const AdminInitiativesPage = lazy(() => import('./pages/AdminInitiativesPage'));

// Loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#4242ea]"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <LoadingProgressProvider>
        <Toaster position="top-right" richColors />
        <div className="app">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/people" element={<PersonDetailPage />} />
              <Route path="/people/:slug" element={<PersonDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/filter/:filterSlug" element={<ProjectsPage />} />
              <Route path="/projects/:slug" element={<ProjectDetailPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/share" element={<SharePage />} />
              
              {/* Admin Login */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              
              {/* Protected Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/admin/people" element={<ProtectedRoute><AdminPeoplePage /></ProtectedRoute>} />
              <Route path="/admin/people/:slug/edit" element={<ProtectedRoute><AdminPersonEditPage /></ProtectedRoute>} />
              <Route path="/admin/projects" element={<ProtectedRoute><AdminProjectsPage /></ProtectedRoute>} />
              <Route path="/admin/projects/:slug/edit" element={<ProtectedRoute><AdminProjectEditPage /></ProtectedRoute>} />
              <Route path="/admin/bulk-upload" element={<ProtectedRoute><AdminBulkUploadPage /></ProtectedRoute>} />
              <Route path="/admin/taxonomy" element={<ProtectedRoute><AdminTaxonomyPage /></ProtectedRoute>} />
              <Route path="/admin/initiatives" element={<ProtectedRoute><AdminInitiativesPage /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </div>
      </LoadingProgressProvider>
    </AuthProvider>
  );
}

export default App;

