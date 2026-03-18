'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Camera, RefreshCw, X, Check, Loader2, Play, 
  Video, StopCircle, Mic, ArrowLeft, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { videoService } from '@/services/video.service';
import { SessionStatus } from '@/types/analytics';

export default function StudioPage() {
  const [mode, setMode] = useState<'selection' | 'upload' | 'record' | 'processing'>('selection');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{id: string, status: SessionStatus} | null>(null);
  const [progress, setProgress] = useState(0);
  
  // Recording State
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<'idle' | 'capturing' | 'review'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
      if (!allowedTypes.includes(selected.type) && !selected.name.endsWith('.webm')) {
        toast.error("Format non supporté. Utilisez MP4, WebM ou MOV.");
        return;
      }
      setFile(selected);
      setMode('upload');
    }
  };

  // Upload Logic
  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { session_id } = await videoService.uploadVideo(file, (p) => setProgress(p));
      setSessionInfo({ id: session_id, status: 'pending' });
      setMode('processing');
      toast.success("Vidéo envoyée !");
      startPolling(session_id);
    } catch (error: any) {
      console.error(error);
      toast.error("Échec de l'envoi.");
    } finally {
      setIsUploading(false);
    }
  };

  // Polling logic
  const startPolling = (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const { status } = await videoService.getStatus(sessionId);
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          setSessionInfo({ id: sessionId, status });
          if (status === 'completed') toast.success("Analyse terminée !");
          else toast.error("L'analyse a échoué.");
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
  };

  // Camera Logic
  const startRecording = async () => {
    try {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setRecordedChunks([]);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
      };

      mediaRecorder.onstop = () => {
        setRecordingState('review');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setRecordingState('capturing');
      setTimer(0);
    } catch (err) {
      toast.error("Caméra non accessible.");
      setMode('selection');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  useEffect(() => {
    if (recordingState === 'review' && recordedChunks.length > 0) {
      const url = URL.createObjectURL(new Blob(recordedChunks, { type: 'video/webm' }));
      setPreviewUrl(url);
    }
  }, [recordingState, recordedChunks]);

  const saveRecording = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    setFile(new File([blob], `speechcoach_${Date.now()}.webm`, { type: 'video/webm' }));
    setMode('upload');
    setRecordingState('idle');
    setRecordedChunks([]);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    let interval: any;
    if (recordingState === 'capturing') interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [recordingState]);

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Header title="Studio d'Enregistrement">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Link>
        <Badge variant="secondary" className="bg-primary/5 text-primary">IA Coach</Badge>
      </Header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {mode === 'selection' && <SelectionMode onUpload={() => document.getElementById('file-upload')?.click()} onRecord={() => setMode('record')} onFileChange={handleFileChange} />}
            {mode === 'upload' && file && <UploadMode file={file} isUploading={isUploading} progress={progress} onCancel={() => {setFile(null); setMode('selection');}} onStart={handleUpload} />}
            {mode === 'record' && <RecordMode recordingState={recordingState} videoRef={videoRef} timer={timer} formatTime={formatTime} previewUrl={previewUrl} onStart={startRecording} onStop={stopRecording} onReview={saveRecording} onRetry={() => {setRecordingState('idle'); setRecordedChunks([]); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null);}} onCancel={() => setMode('selection')} />}
            {mode === 'processing' && sessionInfo && <ProcessingMode status={sessionInfo.status} id={sessionInfo.id} onRetry={() => setMode('selection')} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Sub-components for cleaner structure
function SelectionMode({ onUpload, onRecord, onFileChange }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="border-2 border-dashed border-primary/20 hover:border-primary/50 cursor-pointer group" onClick={onUpload}>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all"><Upload /></div>
          <h3 className="text-xl font-bold mb-2">Uploader une vidéo</h3>
          <p className="text-muted-foreground text-sm">MP4, WebM ou MOV.</p>
          <input id="file-upload" type="file" accept="video/mp4,video/webm" className="hidden" onChange={onFileChange} />
        </CardContent>
      </Card>
      <Card className="border-2 border-dashed border-primary/20 hover:border-primary/50 cursor-pointer group" onClick={onRecord}>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all"><Camera /></div>
          <h3 className="text-xl font-bold mb-2">Enregistrer en direct</h3>
          <p className="text-muted-foreground text-sm">Utilisez votre webcam.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UploadMode({ file, isUploading, progress, onCancel, onStart }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl mx-auto">
      <Card className="border-none shadow-2xl overflow-hidden">
        <div className="aspect-video bg-muted flex flex-col items-center justify-center p-8">
           <Video className="w-16 h-16 text-primary mb-4 opacity-20" />
           <div className="text-lg font-bold truncate max-w-md">{file.name}</div>
        </div>
        <CardContent className="p-8">
          {!isUploading ? (
             <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={onCancel}>Annuler</Button>
                <Button className="flex-1" onClick={onStart}>Démarrer l'Analyse</Button>
             </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium"><span>Uploading...</span><span>{progress}%</span></div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RecordMode({ recordingState, videoRef, timer, formatTime, previewUrl, onStart, onStop, onReview, onRetry, onCancel }: any) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
       <Card className="bg-black relative aspect-video overflow-hidden shadow-2xl">
          {recordingState !== 'review' ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain transform -scale-x-100" />
          ) : (
             previewUrl && <video src={previewUrl} autoPlay controls className="w-full h-full object-contain" />
          )}
          {recordingState === 'capturing' && (
            <div className="absolute top-6 left-6 flex items-center gap-3 px-5 py-2 bg-destructive/90 rounded-full text-white text-sm font-bold animate-pulse z-20">
               <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" /> 
               <span className="font-mono">{formatTime(timer)}</span> 
            </div>
          )}
       </Card>
       <Card className="bg-card shadow-xl">
          <CardContent className="p-4 flex items-center justify-center relative min-h-[100px]">
              {recordingState === 'idle' && <Button size="lg" className="rounded-full w-20 h-20 bg-destructive border-4 border-white" onClick={onStart} />}
              {recordingState === 'capturing' && <Button size="lg" className="rounded-full w-20 h-20 bg-white border-4 border-destructive" onClick={onStop}><StopCircle className="w-10 h-10 text-destructive" /></Button>}
              {recordingState === 'review' && (
                <div className="flex gap-6 w-full max-w-md">
                   <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={onRetry}><RefreshCw className="mr-2" /> Retry</Button>
                   <Button className="flex-1 h-14 rounded-2xl" onClick={onReview}>Analyze <ArrowRight className="ml-2" /></Button>
                </div>
              )}
              <Button variant="ghost" size="icon" className="absolute right-6 rounded-full" onClick={onCancel}><X /></Button>
          </CardContent>
       </Card>
    </motion.div>
  );
}

function ProcessingMode({ status, id, onRetry }: any) {
  const isDone = status === 'completed';
  const isFailed = status === 'failed';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          {isDone ? <Check className="text-emerald-500 w-12 h-12" /> : isFailed ? <X className="text-destructive w-12 h-12" /> : <RefreshCw className="text-primary w-12 h-12 animate-spin" />}
        </div>
        <h2 className="text-3xl font-extrabold mb-4">{isDone ? "Terminé !" : isFailed ? "Erreur" : "Analyse en cours..."}</h2>
        {isDone ? (
           <Link href={`/report/${id}`} className={cn(buttonVariants({ size: "lg" }), "h-14 px-10")}>Voir le rapport <ArrowRight className="ml-2" /></Link>
        ) : isFailed ? (
           <Button variant="outline" size="lg" onClick={onRetry}>Réessayer</Button>
        ) : <p className="text-muted-foreground">Votre coach IA écoute attentivement...</p>}
    </motion.div>
  );
}
