/**
 * Custom hook for analytics and session data.
 */

import { useState, useCallback, useEffect } from 'react';
import { videoService } from '@/services/video.service';
import {
  DashboardSummary,
  SessionHistory,
  StatusResponse,
  ReportResult,
} from '@/types/analytics';

interface UseAnalyticsReturn {
  dashboardSummary: DashboardSummary | null;
  sessionHistory: SessionHistory[];
  isLoading: boolean;
  error: string | null;
  fetchDashboardSummary: () => Promise<void>;
  fetchSessionHistory: () => Promise<void>;
  getSessionStatus: (sessionId: string) => Promise<StatusResponse | null>;
  getSessionResult: (sessionId: string) => Promise<ReportResult | null>;
  refreshAll: () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summary = await videoService.getDashboardSummary();
      setDashboardSummary(summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard summary';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSessionHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const history = await videoService.getHistory();
      setSessionHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch session history';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSessionStatus = useCallback(async (sessionId: string): Promise<StatusResponse | null> => {
    try {
      const status = await videoService.getStatus(sessionId);
      return status;
    } catch (err) {
      console.error('Failed to fetch session status:', err);
      return null;
    }
  }, []);

  const getSessionResult = useCallback(async (sessionId: string): Promise<ReportResult | null> => {
    try {
      const result = await videoService.getResult(sessionId);
      return result;
    } catch (err) {
      console.error('Failed to fetch session result:', err);
      return null;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchDashboardSummary(),
      fetchSessionHistory(),
    ]);
  }, [fetchDashboardSummary, fetchSessionHistory]);

  return {
    dashboardSummary,
    sessionHistory,
    isLoading,
    error,
    fetchDashboardSummary,
    fetchSessionHistory,
    getSessionStatus,
    getSessionResult,
    refreshAll,
  };
}
