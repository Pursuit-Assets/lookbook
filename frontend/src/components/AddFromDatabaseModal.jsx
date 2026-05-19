import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { profilesAPI } from '../utils/api';
import { Input } from '@/components/ui/input';

function AddFromDatabaseModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('');
  const [results, setResults] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const cohortsLoadedRef = useRef(false);

  // On open: reset and do initial fetch
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setSelectedCohort('');
    setResults([]);
    setError(null);
    cohortsLoadedRef.current = false;
    fetchUsers({});
  }, [isOpen]);

  // Debounced re-fetch on search/cohort change
  useEffect(() => {
    if (!isOpen) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const filters = { limit: 25 };
      if (searchQuery) filters.search = searchQuery;
      if (selectedCohort) filters.cohort = selectedCohort;
      fetchUsers(filters);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedCohort, isOpen]);

  const fetchUsers = async (filters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await profilesAPI.getAvailableUsers(filters);
      const data = res.data;
      setResults(data.users || data.data || []);
      // Only capture cohorts from the initial unfiltered fetch
      if (!cohortsLoadedRef.current && data.cohorts) {
        setCohorts(data.cohorts.filter(Boolean).sort());
        cohortsLoadedRef.current = true;
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    const params = new URLSearchParams({
      userId: user.user_id,
      firstName: user.first_name,
      lastName: user.last_name,
    });
    navigate(`/admin/people/new/edit?${params.toString()}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh', animation: 'modalIn 0.25s ease-out forwards' }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 shrink-0"
          style={{ background: 'linear-gradient(to right, #4242ea, #3535d1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Add from Database</h2>
              <p className="text-white/70 text-sm mt-0.5">Users without a profile yet</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {cohorts.length > 0 && (
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-ring w-40"
              >
                <option value="">All cohorts</option>
                {cohorts.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No users found without profiles
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((user) => {
                const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <li key={user.user_id}>
                    <button
                      onClick={() => handleSelect(user)}
                      className="w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                        {initials || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {user.full_name || `${user.first_name} ${user.last_name}`}
                        </div>
                        <div className="text-sm text-gray-500 truncate flex items-center gap-2">
                          <span>{user.email}</span>
                          {user.cohort && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              {user.cohort}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddFromDatabaseModal;
