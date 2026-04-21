'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  Lock,
  RefreshCw,
  ShieldCheck,
  StopCircle,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { authService } from '@/services/auth.service';
import { videoService } from '@/services/video.service';
import { SessionStatus } from '@/types/analytics';
import { cn } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────────────── */

type StudioMode     = 'selection' | 'upload' | 'record' | 'processing';
type RecordingState = 'idle' | 'capturing' | 'review';
type DeviceType = 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone';
type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'error';

interface SessionInfo {
  id:                  string;
  status:              SessionStatus;
  currentStep?:        string | null;
  progressPercent?:    number;
  durationSeconds?:    number | null;
  processingStartedAt?: string | null;
}

interface SelectionModeProps {
  onUpload:     () => void;
  onRecord:     () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface UploadModeProps {
  file:        File;
  deviceType:  DeviceType;
  defaultDeviceType: DeviceType;
  onDeviceTypeChange: (value: DeviceType) => void;
  language:    string;
  defaultLanguage: string;
  onLanguageChange: (value: string) => void;
  isUploading: boolean;
  progress:    number;
  onCancel:    () => void;
  onStart:     () => Promise<void>;
}

interface RecordModeProps {
  recordingState:   RecordingState;
  permissionStatus: PermissionStatus;
  isSecure:         boolean;
  videoRef:         React.RefObject<HTMLVideoElement | null>;
  timer:            number;
  formatTime:       (seconds: number) => string;
  previewUrl:       string | null;
  onStart:          () => Promise<void>;
  onStop:           () => void;
  onReview:         () => void;
  onRetry:          () => void;
  onCancel:         () => void;
  onRequestAccess:  () => Promise<void>;
}

interface ProcessingModeProps {
  sessionInfo:   SessionInfo;
  statusMessage: string;
  displayProgress: number;
  estimatedSeconds: number | null;
  onRetry:       () => void;
}

/* ─── Animation preset ───────────────────────────────────────────────── */

const panelAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as any },
};

/* ─── Helper Functions for Time Estimation --------------------------- */

const STORAGE_KEY = 'speechcoach_processing_history';

interface ProcessingHistory {
  durationSeconds: number;
  processingTimeSeconds: number;
  timestamp: number;
}

function getHistoricalEstimate(durationSeconds: number): number | null {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEY);
    if (!historyJson) return null;

    const history: ProcessingHistory[] = JSON.parse(historyJson);

    // Filter to recent entries (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(h => h.timestamp > thirtyDaysAgo);

    if (recentHistory.length === 0) return null;

    // Find entries with similar duration (±10 seconds)
    const similarEntries = recentHistory.filter(
      h => Math.abs(h.durationSeconds - durationSeconds) <= 10
    );

    if (similarEntries.length === 0) return null;

    // Calculate average processing time for similar videos
    const avgTime = similarEntries.reduce((sum, h) => sum + h.processingTimeSeconds, 0) / similarEntries.length;

    // Add 10% buffer for variability
    return Math.round(avgTime * 1.1);
  } catch (error) {
    console.error('Error reading processing history:', error);
    return null;
  }
}

function saveProcessingHistory(durationSeconds: number, processingTimeSeconds: number): void {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEY);
    const history: ProcessingHistory[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new entry
    history.push({
      durationSeconds,
      processingTimeSeconds,
      timestamp: Date.now(),
    });

    // Keep only last 50 entries
    const trimmedHistory = history.slice(-50);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error saving processing history:', error);
  }
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function StudioPage() {
  const [mode, setMode] = React.useState<StudioMode>('selection');
  const [file, setFile] = React.useState<File | null>(null);
  const [deviceType, setDeviceType] = React.useState<DeviceType>('unknown');
  const [defaultDeviceType, setDefaultDeviceType] = React.useState<DeviceType>('unknown');
  const [language, setLanguage] = React.useState<string>('auto');
  const [defaultLanguage, setDefaultLanguage] = React.useState<string>('auto');
  const [isUploading, setIsUploading] = React.useState(false);
  const [sessionInfo, setSessionInfo] = React.useState<SessionInfo | null>(null);
  const [statusMessage, setStatusMessage] = React.useState('Téléversement préparé');
  const [progress, setProgress] = React.useState(0);
  const [displayProgress, setDisplayProgress] = React.useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = React.useState<number | null>(null);
  const [recordingState, setRecordingState] = React.useState<RecordingState>('idle');
  const [recordedChunks, setRecordedChunks] = React.useState<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [timer, setTimer] = React.useState(0);
  const [permissionStatus, setPermissionStatus] = React.useState<PermissionStatus>('prompt');
  const [isSecure, setIsSecure] = React.useState(true);

  const videoRef           = React.useRef<HTMLVideoElement>(null);
  const mediaRecorderRef   = React.useRef<MediaRecorder | null>(null);
  const streamRef          = React.useRef<MediaStream | null>(null);
  const pollingRef         = React.useRef<number | null>(null);
  const shouldOpenReviewRef = React.useRef(true);

  const clearPolling = React.useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const stopLiveStream = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const revokePreview = React.useCallback(() => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
  }, [previewUrl]);

  const resetRecording = React.useCallback(() => {
    shouldOpenReviewRef.current = true;
    setRecordingState('idle');
    setRecordedChunks([]);
    setTimer(0);
    revokePreview();
  }, [revokePreview]);

  React.useEffect(() => {
    if (recordingState !== 'capturing') return;
    const id = window.setInterval(() => setTimer((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [recordingState]);

  React.useEffect(() => {
    return () => {
      clearPolling();
      shouldOpenReviewRef.current = false;
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      stopLiveStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearPolling, previewUrl, stopLiveStream]);

  React.useEffect(() => {
    let mounted = true;
    authService
      .getProfile()
      .then((profile) => {
        if (!mounted) return;
        const preferred = profile.preferred_device_type;
        const resolvedDefault: DeviceType =
          preferred && preferred !== 'auto' && preferred !== 'unknown'
            ? preferred
            : 'unknown';
        setDefaultDeviceType(resolvedDefault);
        setDeviceType(resolvedDefault);
        
        const prefLang = profile.preferred_language || 'auto';
        setDefaultLanguage(prefLang);
        setLanguage(prefLang);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSecure(window.isSecureContext);
      
      // Attempt to check if permission was already granted (if supported)
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'camera' as any })
          .then((result) => {
            if (result.state === 'granted') {
              setPermissionStatus('granted');
            }
          })
          .catch(() => undefined);
      }
    }
  }, []);

  React.useEffect(() => {
    if (recordingState === 'review' && recordedChunks.length > 0) {
      setPreviewUrl(URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' })));
    }
  }, [recordedChunks, recordingState]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!allowed.includes(selected.type) && !selected.name.endsWith('.webm')) {
      toast.error('Format non supporté. Utilisez MP4, WebM, MOV ou MKV.');
      e.target.value = '';
      return;
    }
    setProgress(0);
    setStatusMessage('Téléversement préparé');
    setFile(selected);
    setMode('upload');
  };

  const startPolling = React.useCallback((sessionId: string) => {
    clearPolling();
    pollingRef.current = window.setInterval(async () => {
      try {
        const data = await videoService.getStatus(sessionId);
        setSessionInfo({ 
          id: sessionId, 
          status: data.status,
          currentStep: data.current_step,
          progressPercent: data.progress_percent || 0,
          durationSeconds: data.duration_seconds,
          processingStartedAt: data.processing_started_at
        });
        
        // Initial estimate logic based on actual timing data
        setEstimatedSeconds((prev) => {
          if (prev !== null) return prev;

          const dur = data.duration_seconds || 30;

          // Check if we have historical data from localStorage
          const historicalEstimate = getHistoricalEstimate(dur);
          if (historicalEstimate) {
            return historicalEstimate;
          }

          // Fallback: Use timing data from logs
          // Hot run (cached): ~73s for 30s video
          // Cold run (first-time): ~237s for 30s video
          // Assume hot run (cached) as default since most users will have cached models
          // Formula: 40s (base) + 1.1 * duration
          const baseTime = 40;
          const durationMultiplier = 1.1;
          const estimate = Math.round(baseTime + (dur * durationMultiplier));

          // Cap at reasonable values
          return Math.min(300, Math.max(60, estimate));
        });

        setStatusMessage(
          data.status === 'pending'    ? "Fichier reçu. Mise en file d'attente..." :
          data.status === 'processing' ? (data.current_step || 'Analyse en cours...') :
          data.status === 'completed'  ? (data.progress_percent && data.progress_percent < 100 ? data.current_step || 'Enrichissement IA en cours...' : 'Prêt !') :
                                         'Une erreur est survenue.'
        );

        if ((data.status === 'completed' && (!data.progress_percent || data.progress_percent >= 100)) || data.status === 'failed') {
          clearPolling();
          if (data.status === 'completed') {
            toast.success('Analyse et enrichissement terminés.');
            setDisplayProgress(100);
            setEstimatedSeconds(0);

            // Save processing history for better future estimates
            if (sessionInfo.processingStartedAt && sessionInfo.durationSeconds) {
              const start = new Date(sessionInfo.processingStartedAt).getTime();
              const now = Date.now();
              const processingTime = Math.round((now - start) / 1000);
              saveProcessingHistory(sessionInfo.durationSeconds, processingTime);
            }
          }
          else toast.error("L'analyse a échoué.");
        }
      } catch (err) { console.error('Polling failed:', err); }
    }, 2000);
  }, [clearPolling]);

  // Progressive "fake" movement to avoid stagnation
  React.useEffect(() => {
    if (mode !== 'processing' || !sessionInfo || (sessionInfo.status !== 'processing' && sessionInfo.status !== 'pending' && !(sessionInfo.status === 'completed' && sessionInfo.progressPercent && sessionInfo.progressPercent < 100))) {
        if (sessionInfo?.status === 'completed' && (!sessionInfo?.progressPercent || sessionInfo?.progressPercent >= 100)) {
            setDisplayProgress(100);
        }
        return;
    };
    
    const interval = window.setInterval(() => {
      setDisplayProgress((prev) => {
        const target = sessionInfo.progressPercent || 0;
        // If we lag behind the real progress, catch up
        if (prev < target) return prev + Math.max(0.2, (target - prev) * 0.1); 
        
        // Dynamic "Glide" limit: 
        // Allow the bar to move further if we are in the later stages
        const glideBuffer = target >= 75 ? 23 : 8; // LLM phase allows more gliding
        const maxGlide = Math.min(99, target + glideBuffer);

        if (prev < maxGlide) {
            // Slower movement as we reach the end of the phase
            const step = target >= 75 ? 0.04 : 0.08;
            return prev + step;
        }
        return prev;
      });
      
      setEstimatedSeconds((prev) => {
        if (prev === null || prev <= 0) return prev;

        // Adaptive Calibration: Recalculate remaining based on elapsed time
        if (sessionInfo.processingStartedAt && sessionInfo.progressPercent && sessionInfo.progressPercent > 5) {
            const start = new Date(sessionInfo.processingStartedAt).getTime();
            const now = Date.now();
            const elapsed = (now - start) / 1000;
            const progress = sessionInfo.progressPercent;

            // Total estimated work remaining
            let computedRemaining = prev;

            // Only calibrate if we have enough progress to be statistically semi-reliable (e.g. > 5%)
            if (progress > 5 && progress < 100) {
                const start = new Date(sessionInfo.processingStartedAt).getTime();
                const now = Date.now();
                const elapsed = (now - start) / 1000;

                // Sanity check on elapsed: if it's negative or huge, skip
                if (elapsed > 0 && elapsed < 3600) {
                    if (progress < 75) {
                        // Main processing phase (0-75%)
                        // Use velocity-based estimation for more accuracy
                        const velocity = elapsed / progress; // seconds per percentage point
                        // Cap velocity to reasonable range based on actual data
                        // Hot run: ~71s for 75% = 0.95s per %
                        // Cold run: ~209s for 75% = 2.79s per %
                        const safeVelocity = Math.min(3.0, Math.max(0.5, velocity));
                        computedRemaining = safeVelocity * (75 - progress) + 3; // 3s for enrichment
                    } else {
                        // Enrichment phase (75-100%)
                        // Based on actual timing: 75-90% ~0.5s, 90-95% ~2s, 95-100% ~0.2s
                        const aiProgress = (progress - 75) / 25;
                        if (progress < 90) {
                            // RAG initialization phase
                            computedRemaining = Math.max(2, 3 * (1 - aiProgress));
                        } else if (progress < 95) {
                            // LLM coaching phase
                            computedRemaining = Math.max(1, 2 * (1 - aiProgress));
                        } else {
                            // Finalization phase
                            computedRemaining = Math.max(0.5, 1 * (1 - aiProgress));
                        }
                    }
                }
            }

            // More conservative smoothing to prevent jumps
            // Use higher weight on current value (0.9) and lower on computed (0.1)
            const rawSmoothed = Math.round(prev * 0.9 + computedRemaining * 0.1);

            // Prevent sudden drops - only decrease if computed is significantly lower
            if (rawSmoothed < prev * 0.8) {
                // Don't allow sudden drops below 80% of current value
                return Math.max(Math.round(prev * 0.8), rawSmoothed);
            }

            // Cap maximum value
            const smoothed = Math.min(300, rawSmoothed);

            // Time Stretching: ensure we don't hit 0 too early
            if (smoothed < 5 && displayProgress < 98) {
                return Math.random() > 0.5 ? prev - 0.5 : prev;
            }
            return smoothed;
        }

        return prev - 1;
      });
    }, 1000);
    
    return () => window.clearInterval(interval);
  }, [mode, sessionInfo]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setStatusMessage('Envoi du fichier en cours');
    try {
      const res = await videoService.uploadVideo(
        file, 
        deviceType === 'unknown' ? 'laptop_desktop' : deviceType,
        language,
        (p) => setProgress(p)
      );
      setSessionInfo({ id: res.session_id, status: 'pending' });
      setStatusMessage('Fichier reçu. Analyse lancée.');
      setMode('processing');
      toast.success('Vidéo envoyée, analyse lancée.');
      startPolling(res.session_id);
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'envoi.");
      setStatusMessage('Le téléversement a échoué.');
    } finally { setIsUploading(false); }
  };

  const requestPermissions = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionStatus('error');
        toast.error("Capacités média non supportées sur ce navigateur/contexte.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionStatus('granted');
      toast.success('Caméra et micro activés.');
    } catch (err: any) {
      console.error('Permission request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        toast.error('Accès refusé par le navigateur.');
      } else {
        setPermissionStatus('error');
        toast.error('Erreur d\'accès média.');
      }
    }
  };

  const startRecording = async () => {
    try {
      revokePreview();
      setRecordedChunks([]);
      setTimer(0);

      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }, audio: true,
        });
        streamRef.current = stream;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
        .find((v) => MediaRecorder.isTypeSupported(v)) || '';
      
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data?.size > 0) setRecordedChunks((p) => [...p, e.data]); };
      rec.onstop = () => {
        stopLiveStream();
        if (shouldOpenReviewRef.current) setRecordingState('review');
        shouldOpenReviewRef.current = true;
      };
      rec.start(1000);
      setRecordingState('capturing');
    } catch (err) {
      console.error('Recording start failed:', err);
      toast.error('Impossible de démarrer l\'enregistrement.');
      setPermissionStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      shouldOpenReviewRef.current = true;
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    shouldOpenReviewRef.current = false;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    else stopLiveStream();
    resetRecording();
    setMode('selection');
  };

  const retryRecording = () => { 
    shouldOpenReviewRef.current = false; 
    resetRecording(); 
    // If we have permission, restart the stream for preview
    if (permissionStatus === 'granted') {
      requestPermissions().catch(() => undefined);
    }
  };

  const saveRecording = () => {
    if (!recordedChunks.length) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    setFile(new File([blob], `speechcoach_${Date.now()}.webm`, { type: 'video/webm' }));
    resetRecording();
    setMode('upload');
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <AppShell
      title="Studio d'analyse"
      subtitle="Préparez, capturez puis lancez une analyse claire et guidée."
      actions={
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Studio actif
        </Badge>
      }
      maxWidth="5xl"
    >
      <div className="space-y-7">

        {/* ── Studio banner ─────────────────────────────────────────── */}
        <section className="surface-violet relative overflow-hidden rounded-3xl border border-border/60 p-7 text-foreground lg:p-9">
          <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/10">
                Studio
              </Badge>
              <h2 className="font-display max-w-md text-3xl font-medium leading-snug">
                Préparez votre prise de parole avant l'analyse.
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Vérifiez votre cadre, importez une vidéo ou enregistrez-vous,
                puis lancez l'analyse.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Préparation', 'Cadre, lumière, micro'],
                ['Capture',     'Import ou webcam'],
                ['Lecture',     'Traitement puis rapport'],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/60 bg-background/90 p-4"
                >
                  <div className="text-sm font-medium text-foreground">{title}</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Step guide ────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {[
            ['1. Préparation',     'Vérifiez votre cadre, votre lumière et votre micro avant de commencer.'],
            ['2. Capture ou import', 'Importez un fichier ou utilisez la webcam pour produire une session nette.'],
            ['3. Analyse',         'Patientez pendant le traitement et ouvrez ensuite votre rapport structuré.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
              <div className="text-sm font-medium text-foreground">{title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        {/* ── Mode panel ────────────────────────────────────────────── */}
        <main className="min-h-[460px]">
          <AnimatePresence mode="wait">
            {mode === 'selection' && (
              <SelectionMode
                onUpload={() => document.getElementById('file-upload')?.click()}
                onRecord={() => setMode('record')}
                onFileChange={handleFileChange}
              />
            )}
            {mode === 'upload' && file && (
              <UploadMode
                file={file}
                deviceType={deviceType}
                defaultDeviceType={defaultDeviceType}
                onDeviceTypeChange={setDeviceType}
                language={language}
                defaultLanguage={defaultLanguage}
                onLanguageChange={setLanguage}
                isUploading={isUploading}
                progress={progress}
                onCancel={() => {
                  setFile(null);
                  setProgress(0);
                  setStatusMessage('Téléversement préparé');
                  setMode('selection');
                }}
                onStart={handleUpload}
              />
            )}
            {mode === 'record' && (
              <RecordMode
                recordingState={recordingState}
                permissionStatus={permissionStatus}
                isSecure={isSecure}
                videoRef={videoRef}
                timer={timer}
                formatTime={formatTime}
                previewUrl={previewUrl}
                onStart={startRecording}
                onStop={stopRecording}
                onReview={saveRecording}
                onRetry={retryRecording}
                onCancel={cancelRecording}
                onRequestAccess={requestPermissions}
              />
            )}
            {mode === 'processing' && sessionInfo && (
              <ProcessingMode
                sessionInfo={sessionInfo}
                statusMessage={statusMessage}
                displayProgress={displayProgress}
                estimatedSeconds={estimatedSeconds}
                onRetry={() => {
                  clearPolling();
                  setSessionInfo(null);
                  setFile(null);
                  setProgress(0);
                  setDisplayProgress(0);
                  setEstimatedSeconds(null);
                  setStatusMessage('Téléversement préparé');
                  setMode('selection');
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </AppShell>
  );
}

/* ─── SelectionMode ──────────────────────────────────────────────────── */

function SelectionMode({ onUpload, onRecord, onFileChange }: SelectionModeProps) {
  return (
    <motion.div
      key="selection"
      {...panelAnim}
      className="grid grid-cols-1 gap-5 md:grid-cols-2"
    >
      {[
        {
          id:          'upload',
          icon:        Upload,
          title:       'Importer une vidéo',
          description: 'Formats acceptés : MP4, WebM, MOV ou MKV.',
          helpId:      'studio-upload-help',
          onClick:     onUpload,
        },
        {
          id:          'record',
          icon:        Camera,
          title:       'Enregistrer en direct',
          description: 'Lancez la webcam, vérifiez votre cadre puis enregistrez.',
          helpId:      'studio-record-help',
          onClick:     onRecord,
        },
      ].map(({ id, icon: Icon, title, description, helpId, onClick }) => (
        <button
          key={id}
          type="button"
          className="group text-left"
          onClick={onClick}
          aria-describedby={helpId}
        >
          <Card className="h-full cursor-pointer border-dashed transition-colors hover:border-primary/40 hover:bg-secondary/40">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-2xl font-medium">{title}</h3>
              <p id={helpId} className="mt-2.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </CardContent>
          </Card>
        </button>
      ))}

      <input
        id="file-upload"
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
        className="hidden"
        onChange={onFileChange}
      />
    </motion.div>
  );
}

/* ─── UploadMode ─────────────────────────────────────────────────────── */

function UploadMode({
  file,
  deviceType,
  defaultDeviceType,
  onDeviceTypeChange,
  language,
  defaultLanguage,
  onLanguageChange,
  isUploading,
  progress,
  onCancel,
  onStart,
}: UploadModeProps) {
  return (
    <motion.div
      key="upload"
      {...panelAnim}
      className="mx-auto w-full max-w-2xl"
    >
      <Card>
        <CardHeader>
          <CardTitle>Vérification avant envoi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-7 pb-7">
          {/* File info */}
          <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Assurez-vous que la vidéo montre clairement votre visage, vos épaules et votre voix.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Type Selection */}
            <div className="group space-y-2 rounded-2xl border border-border/60 bg-background/70 p-5 transition-colors hover:border-primary/20">
              <label htmlFor="device-type" className="text-sm font-medium tracking-tight opacity-90">
                Configuration de capture
              </label>
              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                Calibre l'IA pour la détection du regard, de la posture et des gestes selon votre appareil.
              </p>
              <select
                id="device-type"
                value={deviceType}
                onChange={(e) => onDeviceTypeChange(e.target.value as DeviceType)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
              >
                <option value="unknown">Indéterminé</option>
                <option value="laptop_desktop">Laptop / Desktop</option>
                <option value="tablet">Tablette</option>
                <option value="smartphone">Smartphone / Portrait</option>
              </select>
            </div>

            {/* Language Selection */}
            <div className="group space-y-2 rounded-2xl border border-border/60 bg-background/70 p-5 transition-colors hover:border-primary/20">
              <label htmlFor="language-choice" className="text-sm font-medium tracking-tight opacity-90">
                Langue du discours
              </label>
              <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                Choisir la langue permet d'accélérer l'analyse en sautant l'étape de détection automatique.
              </p>
              <select
                id="language-choice"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/20"
              >
                <option value="auto">Auto (Détection)</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">Arabe</option>
              </select>
            </div>
          </div>

          {!isUploading ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={onStart}>
                Démarrer l'analyse
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Envoi de la vidéo</span>
                <span className="font-mono font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── RecordMode ─────────────────────────────────────────────────────── */

function RecordMode({
  recordingState,
  permissionStatus,
  isSecure,
  videoRef,
  timer,
  formatTime,
  previewUrl,
  onStart,
  onStop,
  onReview,
  onRetry,
  onCancel,
  onRequestAccess,
}: RecordModeProps) {
  const isPrompt  = permissionStatus === 'prompt';
  const isDenied  = permissionStatus === 'denied';
  const isGranted = permissionStatus === 'granted';

  return (
    <motion.div
      key="record"
      {...panelAnim}
      className="space-y-4"
    >
      {/* Video viewport */}
      <Card className="overflow-hidden border-border/60 bg-transparent">
        <CardContent className="relative aspect-video p-0">
          {isGranted ? (
            <>
              {recordingState !== 'review' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                  aria-label="Aperçu caméra en direct"
                />
              ) : previewUrl ? (
                <video
                  src={previewUrl}
                  autoPlay
                  controls
                  className="h-full w-full object-contain"
                  aria-label="Aperçu de la vidéo enregistrée"
                />
              ) : null}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-secondary/20 p-8 text-center">
              {isPrompt && (
                <div className="max-w-xs space-y-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-medium">Caméra et micro</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      SpeechCoach a besoin d'accéder à votre matériel pour enregistrer votre prise de parole.
                    </p>
                  </div>
                  {!isSecure && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left text-xs leading-relaxed text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        HTTPS requis : l'accès caméra est souvent bloqué en HTTP sur mobile. 
                        Utilisez <strong>localhost</strong> ou <strong>HTTPS</strong>.
                      </span>
                    </div>
                  )}
                  <Button onClick={onRequestAccess} className="w-full">
                    Autoriser l'accès
                  </Button>
                </div>
              )}

              {isDenied && (
                <div className="max-w-xs space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <Lock className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-medium text-destructive">Accès restreint</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      L'accès à la caméra a été refusé. Veuillez le réactiver dans les paramètres de votre navigateur.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                    Réactualiser la page
                  </Button>
                </div>
              )}

              {permissionStatus === 'error' && (
                <div className="max-w-xs space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-medium text-destructive">Erreur d'accès</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Impossible d'activer la caméra. {!isSecure ? "Le navigateur bloque l'accès car vous êtes sur une connexion non-sécurisée (HTTP)." : "Vérifiez vos paramètres matériel."}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" onClick={onRequestAccess} className="w-full text-xs">
                      Réessayer
                    </Button>
                    <Button variant="secondary" onClick={onCancel} className="w-full text-xs">
                      Retour à la sélection (Import fichier)
                    </Button>
                  </div>
                  {!isSecure && (
                    <p className="text-[10px] text-muted-foreground">
                      Conseil : Pour utiliser la caméra sur mobile, utilisez HTTPS ou une adresse localhost.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REC indicator */}
          {recordingState === 'capturing' && (
            <div className="absolute left-4 top-4 flex items-center gap-2.5 rounded-full bg-destructive px-3.5 py-1.5 text-xs font-medium text-destructive-foreground">
              <span className="h-2 w-2 rounded-full bg-white" />
              {formatTime(timer)}
            </div>
          )}

          {/* Quit button */}
          <div className="absolute right-4 top-4">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Quitter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">État de capture</div>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {!isGranted                     && 'En attente des permissions...'}
              {isGranted && recordingState === 'idle'      && 'Vérifiez votre cadre puis commencez.'}
              {isGranted && recordingState === 'capturing' && 'Enregistrement en cours. Gardez le regard vers la caméra.'}
              {isGranted && recordingState === 'review'    && 'Relisez la capture ou sauvegardez-la pour analyse.'}
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            {isGranted && (
              <>
                {recordingState === 'idle' && (
                  <Button size="default" onClick={onStart}>
                    <Video className="mr-1.5 h-4 w-4" />
                    Démarrer
                  </Button>
                )}
                {recordingState === 'capturing' && (
                  <Button size="default" variant="destructive" onClick={onStop}>
                    <StopCircle className="mr-1.5 h-4 w-4" />
                    Arrêter
                  </Button>
                )}
                {recordingState === 'review' && (
                  <>
                    <Button variant="outline" onClick={onRetry}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Refaire
                    </Button>
                    <Button onClick={onReview}>
                      Analyser
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── ProcessingMode ─────────────────────────────────────────────────── */

function ProcessingMode({ 
  sessionInfo, 
  statusMessage, 
  displayProgress, 
  estimatedSeconds, 
  onRetry 
}: ProcessingModeProps) {
  const isDone    = sessionInfo.status === 'completed' && (sessionInfo.progressPercent === 100 || !sessionInfo.progressPercent);
  const isFailed  = sessionInfo.status === 'failed';
  const realProgress = sessionInfo.progressPercent || 0;
  
  const isReportReady = sessionInfo.status === 'completed' || realProgress >= 75;

  const stages = [
    { id: 'audio', label: 'Audio & Transcription', threshold: 0 },
    { id: 'vision', label: 'Analyse Visuelle', threshold: 30 },
    { id: 'llm',    label: 'Synthèse Intelligente', threshold: 75 },
  ];

  return (
    <motion.div key="processing" {...panelAnim} className="mx-auto max-w-2xl">
      <Card className="overflow-hidden border-border/50 bg-card/50 shadow-xl backdrop-blur-md">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            
            {/* Left: Progressive Scanner */}
            <div className="flex flex-col items-center justify-center border-b border-border/40 p-10 md:w-[280px] md:border-b-0 md:border-r">
              <div className="relative mb-6 h-32 w-32">
                {/* Clean Track */}
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="2" className="text-secondary/20" />
                  <motion.circle
                    cx="50" cy="50" r="46"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="289"
                    animate={{ strokeDashoffset: 289 - (289 * displayProgress) / 100 }}
                    transition={{ duration: 0.5, ease: "linear" }}
                    className={cn("transition-colors duration-500", isDone ? "text-emerald-500" : "text-primary")}
                    style={{ strokeLinecap: 'round' }}
                  />
                </svg>

                {/* Surgical Scanner (Thin spinning line) */}
                {!isDone && !isFailed && (
                  <motion.div
                    className="absolute inset-0 origin-center p-1"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  >
                    <div className="h-1/2 w-[1px] bg-gradient-to-t from-primary/60 to-transparent" />
                  </motion.div>
                )}

                {/* Center Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   {isDone ? (
                     <Check className="h-8 w-8 text-emerald-500" />
                   ) : isFailed ? (
                     <X className="h-8 w-8 text-destructive" />
                   ) : (
                     <span className="text-2xl font-semibold tracking-tight">{Math.round(displayProgress)}%</span>
                   )}
                </div>
              </div>

              {/* Estimate */}
              {!isDone && !isFailed && estimatedSeconds !== null && estimatedSeconds > 0 && (
                <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
                   Environ {estimatedSeconds}s restantes
                </div>
              )}
            </div>

            {/* Right: Pipeline Details */}
            <div className="flex-1 space-y-8 p-8 md:p-10">
              <div className="space-y-1">
                <h3 className="text-xl font-medium">Traitement en cours</h3>
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
              </div>

              <div className="space-y-6">
                {stages.map((stage, idx) => {
                  const isActive = realProgress >= stage.threshold && realProgress < (stages[idx + 1]?.threshold || 101) && !isDone;
                  const isCompleted = isDone || realProgress >= (stages[idx + 1]?.threshold || 101);
                  
                  return (
                    <div key={stage.id} className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-500",
                        isCompleted ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" :
                        isActive    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]" :
                                      "border-border bg-secondary/50 text-muted-foreground"
                      )}>
                        {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>
                      <div className={cn("transition-opacity duration-500", !isActive && !isCompleted && "opacity-40")}>
                        <div className="text-sm font-medium">{stage.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="pt-4">
                {isReportReady && !isFailed ? (
                  <Link
                    href={`/report/${sessionInfo.id}`}
                    className={cn(buttonVariants({ size: 'default' }), "w-full shadow-lg shadow-primary/10")}
                  >
                    Voir le rapport
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : isFailed ? (
                  <Button variant="outline" className="w-full" onClick={onRetry}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                     <span className="flex h-1 w-1 animate-ping rounded-full bg-primary" />
                     Analyse des paramètres vocaux et visuels...
                  </div>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
