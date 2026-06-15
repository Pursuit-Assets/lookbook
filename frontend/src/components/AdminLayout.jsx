import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, Briefcase, Home, Upload, LogOut, Tags, Rocket, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-white border border-gray-200 shadow-sm"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Overlay backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 fixed h-full z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/pursuit-wordmark.png"
              alt="Pursuit"
              className="h-8"
            />
            <div className="flex-1">
              <div className="font-semibold text-base">Lookbook</div>
              <div className="text-xs text-gray-500">Admin</div>
            </div>
            <button
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
              onClick={closeSidebar}
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <Link
              to="/admin"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/admin/people"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive('/admin/people')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>People</span>
            </Link>

            <Link
              to="/admin/projects"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive('/admin/projects')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span>Projects</span>
            </Link>

            <Link
              to="/admin/initiatives"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive('/admin/initiatives')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Rocket className="w-5 h-5" />
              <span>Initiatives</span>
            </Link>

            <Link
              to="/admin/taxonomy"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive('/admin/taxonomy')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Tags className="w-5 h-5" />
              <span>Skills & Industries</span>
            </Link>

            <Link
              to="/admin/bulk-upload"
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive('/admin/bulk-upload')
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>Bulk Upload</span>
            </Link>
          </nav>
        </div>

        {/* User info and Logout */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200">
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  {user.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{user.username}</div>
                  <div className="text-xs text-gray-500">Admin</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-4 space-y-2">
            <Link
              to="/people"
              onClick={closeSidebar}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-50"
            >
              ← Back to Public Site
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 transition-colors rounded-md hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;

