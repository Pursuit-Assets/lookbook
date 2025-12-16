import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profilesAPI, projectsAPI } from '../utils/api';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, TrendingUp, Clock, Tags, Rocket } from 'lucide-react';

function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalPeople: 0,
    totalProjects: 0,
    openToWork: 0,
    recentlyUpdated: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [peopleRes, projectsRes] = await Promise.all([
        profilesAPI.getAll({ limit: 100 }),
        projectsAPI.getAll({ limit: 100 })
      ]);

      const people = peopleRes.data || [];
      const projects = projectsRes.data || [];

      setStats({
        totalPeople: people.length,
        totalProjects: projects.length,
        openToWork: people.filter(p => p.open_to_work).length,
        recentlyUpdated: [...people.slice(0, 5)]
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total People</p>
                  <p className="text-3xl font-bold">{stats.totalPeople}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Projects</p>
                  <p className="text-3xl font-bold">{stats.totalProjects}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Open to Work</p>
                  <p className="text-3xl font-bold">{stats.openToWork}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Last Updated</p>
                  <p className="text-lg font-semibold">Just now</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                People Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage team member profiles, add new people, and update their information.
              </p>
              <div className="space-y-2">
                <Link
                  to="/admin/people"
                  className="block px-4 py-2 text-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  View All People
                </Link>
                <Link
                  to="/admin/people/new/edit"
                  className="block px-4 py-2 text-center rounded-md text-white hover:opacity-90 transition-opacity"
                  style={{backgroundColor: '#4242ea'}}
                >
                  Add New Person
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Project Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage projects, add new ones, and update project details and media.
              </p>
              <div className="space-y-2">
                <Link
                  to="/admin/projects"
                  className="block px-4 py-2 text-center rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  View All Projects
                </Link>
                <Link
                  to="/admin/projects/new/edit"
                  className="block px-4 py-2 text-center rounded-md text-white hover:opacity-90 transition-opacity"
                  style={{backgroundColor: '#4242ea'}}
                >
                  Add New Project
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="w-5 h-5" />
                Skills & Industries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage the standardized taxonomy of skills and industries used throughout the platform.
              </p>
              <div className="space-y-2">
                <Link
                  to="/admin/taxonomy"
                  className="block px-4 py-2 text-center rounded-md text-white hover:opacity-90 transition-opacity"
                  style={{backgroundColor: '#4242ea'}}
                >
                  Manage Taxonomy
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Initiatives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Manage project initiatives like SMB cohorts and Demo Days to group and filter projects.
              </p>
              <div className="space-y-2">
                <Link
                  to="/admin/initiatives"
                  className="block px-4 py-2 text-center rounded-md text-white hover:opacity-90 transition-opacity"
                  style={{backgroundColor: '#4242ea'}}
                >
                  Manage Initiatives
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboardPage;

