/**
 * Custom hook for video upload operations.
 */

import { useState, useCallback } from 'react';
import { videoService } from '@/services/video.service';
import { SessionStatus, StatusResponse } from '@/types/analytics';

interface UseVideoUploadReturn {
  isUploading: boolean;
  uploadProgress: number;
  sessionId: string | null;
  error: string | null;
  uploadVideo: (
    file: File,
    deviceType?: 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone',
    language?: string
  ) => Promise<string | null>;
  resetUpload: () => void;
}

export function useVideoUpload(): UseVideoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadVideo = useCallback(async (
    file: File,
    deviceType: 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone' = 'unknown',
    language: string = 'auto'
  ): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSessionId(null);

    try {
      const result = await videoService.uploadVideo(
        file,
        deviceType,
        language,
        (percent) => {
          setUploadProgress(percent);
        }
      );

      setSessionId(result.session_id);
      return result.session_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    isUploading,
    uploadProgress,
    sessionId,
    error,
    uploadVideo,
    resetUpload,
  };
}
