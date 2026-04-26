import api from '@/lib/api';
import { VIDEO_ENDPOINTS, TRACKER_ENDPOINTS } from '@/constants/api';
import { DashboardSummary, ReportResult, SessionHistory, SessionStatus, StatusResponse } from '@/types/analytics';

export const videoService = {
  async uploadVideo(
    file: File,
    deviceType: 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone' = 'unknown',
    language: string = 'auto',
    onProgress?: (percent: number) => void,
  ): Promise<{ session_id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('device_type', deviceType);
    formData.append('language', language);

    const { data } = await api.post<{ session_id: string }>(VIDEO_ENDPOINTS.UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          onProgress(percentCompleted);
        }
      },
    });
    return data;
  },

  async getStatus(sessionId: string): Promise<StatusResponse> {
    const { data } = await api.get<StatusResponse>(TRACKER_ENDPOINTS.STATUS(sessionId));
    return data;
  },

  async getHistory(): Promise<SessionHistory[]> {
    const { data } = await api.get<SessionHistory[]>(TRACKER_ENDPOINTS.HISTORY);
    return data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>(TRACKER_ENDPOINTS.DASHBOARD_SUMMARY);
    return data;
  },

  async getResult(sessionId: string): Promise<ReportResult> {
    const { data } = await api.get<ReportResult>(TRACKER_ENDPOINTS.RESULT(sessionId));
    return data;
  },

  async getMarkdownExport(sessionId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(TRACKER_ENDPOINTS.REPORT_MARKDOWN(sessionId), {
      responseType: 'blob',
    });
    return data;
  },

  async getPdfExport(sessionId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(TRACKER_ENDPOINTS.REPORT_PDF(sessionId), {
      responseType: 'blob',
    });
    return data;
  },

  async getPrintExport(sessionId: string): Promise<string> {
    const { data } = await api.get<string>(TRACKER_ENDPOINTS.REPORT_PRINT(sessionId), {
      responseType: 'text',
    });
    return data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(TRACKER_ENDPOINTS.SESSION_DELETE(sessionId));
  },

  async updateSession(sessionId: string, updates: { title: string }): Promise<void> {
    await api.patch(TRACKER_ENDPOINTS.SESSION_UPDATE(sessionId), updates);
  },
};
