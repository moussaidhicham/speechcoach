/**
 * API endpoint constants.
 * All API URLs should be imported from this module.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Auth endpoints (not migrated to /api/v1 - uses fastapi-users)
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/jwt/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/jwt/logout',
  VERIFY: '/auth/verify',
  VERIFY_TOKEN: '/auth/verify-token',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  REQUEST_VERIFY: '/auth/request-verify',
  ME: '/auth/me',
  USERS_ME: '/auth/users/me',
  STATUS: '/auth/status',
  CHANGE_PASSWORD: '/auth/change-password',
} as const;

// User endpoints (migrated to /api/v1)
export const USER_ENDPOINTS = {
  PROFILE: '/api/v1/user/profile',
  ACCOUNT: '/api/v1/user/account',
} as const;

// Video endpoints (migrated to /api/v1)
export const VIDEO_ENDPOINTS = {
  UPLOAD: '/api/v1/video/upload',
} as const;

// Tracker/Status endpoints (migrated to /api/v1)
export const TRACKER_ENDPOINTS = {
  STATUS: (sessionId: string) => `/api/v1/tracker/status/${sessionId}`,
  RESULT: (sessionId: string) => `/api/v1/tracker/result/${sessionId}`,
  HISTORY: '/api/v1/tracker/history',
  DASHBOARD_SUMMARY: '/api/v1/tracker/dashboard-summary',
  REPORT_MARKDOWN: (sessionId: string) => `/api/v1/tracker/report/${sessionId}/markdown`,
  REPORT_PDF: (sessionId: string) => `/api/v1/tracker/report/${sessionId}/pdf`,
  REPORT_PRINT: (sessionId: string) => `/api/v1/tracker/report/${sessionId}/print`,
  SESSION_DELETE: (sessionId: string) => `/api/v1/tracker/session/${sessionId}`,
  SESSION_UPDATE: (sessionId: string) => `/api/v1/tracker/session/${sessionId}`,
} as const;

// Feedback endpoints (migrated to /api/v1)
export const FEEDBACK_ENDPOINTS = {
  PLATFORM: '/api/v1/feedback/platform',
  PLATFORM_MINE: '/api/v1/feedback/platform/mine',
  PLATFORM_CHECK: '/api/v1/feedback/platform/check',
  PLATFORM_STATS: '/api/v1/feedback/platform/stats',
  PLATFORM_ALL: '/api/v1/feedback/platform/all',
  PLATFORM_UPDATE: (feedbackId: string) => `/api/v1/feedback/platform/${feedbackId}`,
  PLATFORM_DELETE: (feedbackId: string) => `/api/v1/feedback/platform/${feedbackId}`,
} as const;

// Storage endpoints (static files - not migrated)
export const STORAGE_ENDPOINTS = {
  BASE: '/storage',
  UPLOADS: '/storage/uploads',
  AVATARS: '/storage/avatars',
} as const;
