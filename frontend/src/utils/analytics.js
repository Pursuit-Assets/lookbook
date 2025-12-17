// PostHog Analytics Setup and Utilities
import posthog from 'posthog-js';

// Initialize PostHog (call this once in your app)
export const initAnalytics = () => {
  // Only initialize if we have a PostHog API key
  const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will not be tracked.');
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    // Enable session recordings
    session_recording: {
      recordCrossOriginIframes: false,
      maskAllInputs: true, // Privacy: mask all input fields
      maskTextSelector: '.sensitive', // Add 'sensitive' class to mask specific elements
    },
    // Automatically capture pageviews and clicks
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    // Performance
    loaded: (posthog) => {
      // PostHog loaded successfully
    },
  });
};

// Custom event tracking helpers
export const analytics = {
  // Track page view (called automatically, but can be called manually)
  pageView: (pageName, properties = {}) => {
    if (posthog.__loaded) {
      posthog.capture('$pageview', {
        page_name: pageName,
        ...properties,
      });
    }
  },

  // Track when a filter is applied
  filterApplied: (filterType, filterValue, viewMode) => {
    if (posthog.__loaded) {
      posthog.capture('Filter Applied', {
        filter_type: filterType, // 'skill', 'sector', 'cohort', etc.
        filter_value: filterValue,
        view_mode: viewMode, // 'people' or 'projects'
      });
    }
  },

  // Track when a project is viewed
  projectViewed: (projectSlug, projectTitle, skills, sectors) => {
    if (posthog.__loaded) {
      posthog.capture('Project Viewed', {
        project_slug: projectSlug,
        project_title: projectTitle,
        skills: skills,
        sectors: sectors,
      });
    }
  },

  // Track when a person profile is viewed
  personViewed: (personSlug, personName, skills) => {
    if (posthog.__loaded) {
      posthog.capture('Person Viewed', {
        person_slug: personSlug,
        person_name: personName,
        skills: skills,
      });
    }
  },

  // Track navigation actions
  navigation: (action, from, to) => {
    if (posthog.__loaded) {
      posthog.capture('Navigation', {
        action: action, // 'next', 'previous', 'tab_switch', etc.
        from: from,
        to: to,
      });
    }
  },

  // Track when layout view changes
  layoutChanged: (newLayout, viewMode) => {
    if (posthog.__loaded) {
      posthog.capture('Layout Changed', {
        layout: newLayout, // 'grid' or 'list'
        view_mode: viewMode, // 'people' or 'projects'
      });
    }
  },

  // Track search queries
  searched: (query, viewMode, resultCount) => {
    if (posthog.__loaded) {
      posthog.capture('Search Performed', {
        query: query,
        view_mode: viewMode,
        result_count: resultCount,
      });
    }
  },

  // Track clicks on external links
  externalLinkClicked: (linkType, url, context) => {
    if (posthog.__loaded) {
      posthog.capture('External Link Clicked', {
        link_type: linkType, // 'github', 'live_url', 'linkedin', etc.
        url: url,
        context: context, // where the link was clicked from
      });
    }
  },

  // Track partner logo clicks
  partnerLogoClicked: (projectSlug, partnerName) => {
    if (posthog.__loaded) {
      posthog.capture('Partner Logo Clicked', {
        project_slug: projectSlug,
        partner_name: partnerName,
      });
    }
  },

  // Track video plays
  videoPlayed: (projectSlug, videoUrl) => {
    if (posthog.__loaded) {
      posthog.capture('Video Played', {
        project_slug: projectSlug,
        video_url: videoUrl,
      });
    }
  },

  // Generic custom event
  track: (eventName, properties = {}) => {
    if (posthog.__loaded) {
      posthog.capture(eventName, properties);
    }
  },

  // Identify a user (optional - for logged-in users)
  identify: (userId, userProperties = {}) => {
    if (posthog.__loaded) {
      posthog.identify(userId, userProperties);
    }
  },

  // Reset user identity (on logout)
  reset: () => {
    if (posthog.__loaded) {
      posthog.reset();
    }
  },
};

export default analytics;

