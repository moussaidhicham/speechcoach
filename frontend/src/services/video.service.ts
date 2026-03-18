import api from '@/lib/api';
import { SessionHistory, SessionStatus, AnalysisResult } from '@/types/analytics';

export const videoService = {
  async uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<{ session_id: string }> {
    const formData = new FormData();
    formData.append('file', file);

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

  async getStatus(sessionId: string): Promise<{ status: SessionStatus }> {
    const { data } = await api.get<{ status: SessionStatus }>(`/tracker/status/${sessionId}`);
    return data;
  },

  async getHistory(): Promise<SessionHistory[]> {
    const { data } = await api.get<SessionHistory[]>('/tracker/history');
    return data;
  },

  async getResult(sessionId: string): Promise<AnalysisResult> {
    const { data } = await api.get<AnalysisResult>(`/tracker/result/${sessionId}`);
    return data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/tracker/session/${sessionId}`);
  },

  async updateSession(sessionId: string, updates: { title: string }): Promise<void> {
    await api.patch(`/tracker/session/${sessionId}`, updates);
  },
};
