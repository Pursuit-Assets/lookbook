import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount and validate the token with the server.
  // Presence of a token in localStorage is not enough — it may be expired, which
  // would let the UI show an authenticated state while protected API calls 401.
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem('adminToken');
      const storedUser = localStorage.getItem('adminUser');

      if (!token || !storedUser) {
        setLoading(false);
        return;
      }

      try {
        // Optimistically restore from storage so the UI doesn't flash logged-out.
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        if (!cancelled) setLoading(false);
        return;
      }

      // Validate the token against the server; clear the session if it's invalid/expired.
      try {
        const data = await api.get('/auth/verify');
        if (cancelled) return;
        if (data?.success && data.user) {
          setUser(data.user);
        } else {
          throw new Error('Invalid verify response');
        }
      } catch (error) {
        if (cancelled) return;
        console.warn('Stored admin token is invalid or expired; clearing session.');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username, password) => {
    try {
      const data = await api.post('/auth/login', {
        username,
        password,
      });

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        setUser(data.user);
        return true;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

