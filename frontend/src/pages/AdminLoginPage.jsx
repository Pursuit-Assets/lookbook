import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expired = searchParams.get('expired') === '1';
  const redirectParam = searchParams.get('redirect');

  // Surface a clear message when the user was bounced here by an expired session.
  useEffect(() => {
    if (expired) {
      setError('Your session expired. Please sign in again.');
    }
  }, [expired]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(credentials.username, credentials.password);
      if (success) {
        toast.success('Welcome back!', {
          description: 'Successfully logged in to admin portal'
        });
        // Return the user to where they were bounced from, if it's a safe in-app path.
        const safeRedirect = redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
          ? decodeURIComponent(redirectParam)
          : '/admin';
        navigate(safeRedirect);
      } else {
        setError('Invalid username or password');
        toast.error('Login failed', {
          description: 'Invalid username or password'
        });
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to login. Please try again.';
      setError(errorMessage);
      toast.error('Login failed', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{backgroundColor: '#e3e3e3'}}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src="/pursuit-wordmark.png" 
            alt="Pursuit" 
            className="h-10"
          />
          <div>
            <div className="font-semibold text-xl">Lookbook</div>
            <div className="text-sm text-gray-600">Admin Portal</div>
          </div>
        </div>

        <Card className="border-2 border-white shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{backgroundColor: '#4242ea'}}>
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Sign in to access the admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11"
                style={{backgroundColor: '#4242ea'}}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a href="/people" className="text-sm text-gray-600 hover:text-gray-900">
                ← Back to Lookbook
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-xs text-gray-600">
          Built with ♥ by Pursuit + AI
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;

