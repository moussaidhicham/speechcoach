/**
 * Route path constants.
 * All route paths should be imported from this module.
 */

export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // Protected routes
  DASHBOARD: '/dashboard',
  STUDIO: '/studio',
  HISTORY: '/history',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding',

  // Public feedback
  PUBLIC_FEEDBACK: '/public-feedback',

  // Report routes
  REPORT: (id: string) => `/report/${id}`,
} as const;
