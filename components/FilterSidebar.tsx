'use client';

import Link from 'next/link';
import { useState } from 'react';
import ContactModal from './ContactModal';

export type FilterState = {
  industries: string[];
  hasOpenToWork: boolean;
};

type FilterSidebarProps = {
  currentPage?: 'projects' | 'people';
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
};

export default function FilterSidebar({
  currentPage = 'people',
  filters = { industries: [], hasOpenToWork: false },
  onFilterChange
}: FilterSidebarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const handleIndustryChange = (industry: string, checked: boolean) => {
    if (!onFilterChange) return;

    const newIndustries = checked
      ? [...filters.industries, industry]
      : filters.industries.filter(i => i !== industry);

    onFilterChange({ ...filters, industries: newIndustries });
  };

  const handleOpenToWorkChange = (checked: boolean) => {
    if (!onFilterChange) return;
    onFilterChange({ ...filters, hasOpenToWork: checked });
  };

  const FilterContent = () => (
    <>
      {/* Tab Navigation - Above the panel (Desktop Only) */}
      <div className="hidden lg:flex items-center gap-0 relative z-10" style={{ marginBottom: '-2px' }}>
        <Link
          href="/projects"
          className={`flex-1 text-center px-6 py-4 text-sm font-bold transition-all ${
            currentPage === 'projects'
              ? 'bg-[#E8E8E8] text-blue-600 border-l-2 border-r-2 border-t-2 border-white rounded-tl-3xl rounded-tr-3xl'
              : 'bg-transparent text-gray-500 hover:text-gray-700 border-l-2 border-t-2 border-white rounded-tl-3xl rounded-tr-3xl'
          }`}
        >
          PROJECTS
        </Link>
        <Link
          href="/"
          className={`flex-1 text-center px-6 py-4 text-sm font-bold transition-all ${
            currentPage === 'people'
              ? 'bg-[#E8E8E8] text-blue-600 border-l-2 border-r-2 border-t-2 border-white rounded-tl-3xl rounded-tr-3xl'
              : 'bg-transparent text-gray-500 hover:text-gray-700 border-r-2 border-t-2 border-white rounded-tl-3xl rounded-tr-3xl'
          }`}
        >
          PEOPLE
        </Link>
      </div>

      {/* Sidebar Panel */}
      <aside className={`bg-[#E8E8E8] lg:rounded-b-3xl lg:border-l-2 lg:border-r-2 lg:border-b-2 lg:border-t-2 border-white lg:shadow-lg overflow-y-auto w-full relative ${
        currentPage === 'people' ? 'lg:rounded-tl-lg' : ''
      }`}>
      {/* Cover panels top corners to prevent double border (Desktop Only) */}
      {currentPage === 'people' && (
        <>
          <div className="hidden lg:block absolute top-[-2px] left-0 right-1/2 mr-1 h-0 border-t-2 border-white z-20"></div>
          <div className="hidden lg:block absolute top-[-2px] right-[-2px] w-[2px] h-[4px] bg-white z-20"></div>
          <div className="hidden lg:block absolute top-[-2px] left-[-2px] w-[12px] h-[12px] bg-[#E8E8E8] rounded-tl-xl z-10"></div>
        </>
      )}
      {currentPage === 'projects' && (
        <>
          <div className="hidden lg:block absolute top-[-2px] right-0 left-1/2 ml-1 h-0 border-t-2 border-white z-20"></div>
          <div className="hidden lg:block absolute top-[-2px] left-[-2px] w-[2px] h-[4px] bg-white z-20"></div>
        </>
      )}
      <div className="px-6 pt-6">

      {/* Cohort Section */}
      <div className="mb-6 pb-6 border-b border-white">
        <h2 className="mb-4 text-base font-bold text-gray-900">Cohort</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">March '25: AI-Native</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">11.0: Web</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">10.0: Web</span>
          </label>
        </div>
      </div>

      {/* Industry Expertise Section */}
      <div className="mb-6 pb-6 border-b border-white">
        <h2 className="mb-4 text-base font-bold text-gray-900">Industry</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.industries.length === 0}
              onChange={(e) => {
                if (e.target.checked && onFilterChange) {
                  onFilterChange({ ...filters, industries: [] });
                }
              }}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">All</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.industries.includes('Consumer')}
              onChange={(e) => handleIndustryChange('Consumer', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Consumer</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.industries.includes('Fintech')}
              onChange={(e) => handleIndustryChange('Fintech', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Fintech</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.industries.includes('Healthcare')}
              onChange={(e) => handleIndustryChange('Healthcare', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Healthcare</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.industries.includes('Real Estate')}
              onChange={(e) => handleIndustryChange('Real Estate', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Real Estate</span>
          </label>
        </div>
      </div>

      {/* Additional Filters Section */}
      <div className="mb-6">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Has Demo Video</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Open to Relocate</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hasOpenToWork}
              onChange={(e) => handleOpenToWorkChange(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Open to Work</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Freelance</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">NYC-based</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-700">Remote Only</span>
          </label>
        </div>
      </div>

      {/* Contact Button */}
      <div className="mt-12 pt-8 pb-8 border-t border-white">
        <button
          onClick={() => setContactModalOpen(true)}
          className="contact-button w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Get in Touch
          </span>
          {/* Animated shine effect */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
        </button>
        <p className="mt-3 text-xs text-center text-neutral-500">
          For hiring, resumes & partnerships
        </p>
      </div>

      </div>
      </aside>
    </>
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open filters"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          
          {/* Drawer */}
          <div className="relative ml-auto w-full max-w-sm bg-[#E8E8E8] h-full overflow-y-auto">
            {/* Close Button */}
            <div className="sticky top-0 bg-[#E8E8E8] border-b-2 border-white px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold">Filters</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                aria-label="Close filters"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <FilterContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0 m-4 self-start w-64">
        <FilterContent />
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </>
  );
}
