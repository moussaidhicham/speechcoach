import api from '@/lib/api';
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

    const { data } = await api.post<{ session_id: string }>('/video/upload', formData, {
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
    const { data } = await api.get<StatusResponse>(`/tracker/status/${sessionId}`);
    return data;
  },

  async getHistory(): Promise<SessionHistory[]> {
    const { data } = await api.get<SessionHistory[]>('/tracker/history');
    return data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/tracker/dashboard-summary');
    return data;
  },

  async getResult(sessionId: string): Promise<ReportResult> {
    const { data } = await api.get<ReportResult>(`/tracker/result/${sessionId}`);
    return data;
  },

  async getMarkdownExport(sessionId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/tracker/report/${sessionId}/markdown`, {
      responseType: 'blob',
    });
    return data;
  },

  async getPdfExport(sessionId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/tracker/report/${sessionId}/pdf`, {
      responseType: 'blob',
    });
    return data;
  },

  async getPrintExport(sessionId: string): Promise<string> {
    const { data } = await api.get<string>(`/tracker/report/${sessionId}/print`, {
      responseType: 'text',
    });
    return data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/tracker/session/${sessionId}`);
  },

  async updateSession(sessionId: string, updates: { title: string }): Promise<void> {
    await api.patch(`/tracker/session/${sessionId}`, updates);
  },
};
