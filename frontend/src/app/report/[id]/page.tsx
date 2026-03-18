'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Share2, RefreshCw,
    Mic, TrendingUp, AlertCircle, 
    MessageSquare, Eye, User, Video, Pause, AlertTriangle,
    CheckCircle, Download, FileText, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '@/context/auth-context';
import { videoService } from '@/services/video.service';
import { AnalysisResult } from '@/types/analytics';
import { cn } from '@/lib/utils';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';
import api from '@/lib/api';

// Internal types for the page
interface UIAnalysisResult extends AnalysisResult {
  title: string;
  presence_score: number;
  pause_count: number;
  filler_count: number;
  face_presence_ratio: number;
  feedback_text: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: any; 
  video_url: string;
}

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [result, setResult] = useState<UIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }

    const fetchResult = async () => {
      try {
        const data = await videoService.getResult(id as string);
        let processedRecs = data.recommendations;
        if (typeof data.recommendations === 'string') {
          try {
            processedRecs = JSON.parse(data.recommendations);
          } catch (e) {
            processedRecs = [];
          }
        }
        
        setResult({
          ...data,
          recommendations: processedRecs
        } as any);

        // Check if feedback is needed
        try {
          const { data: feedbackData } = await api.get('/feedback/platform/check');
          setShowFeedback(!feedbackData.has_feedback);
        } catch (e) {
          console.error("Failed to check feedback status:", e);
        }
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger les résultats.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [id, token, authLoading, router]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportMarkdown = () => {
    if (!result) return;
    
    const content = `# Rapport de Coaching SpeechCoach
## Session : ${result.title || id}
**Score Global : ${result.overall_score}%**

### Bilan Global
${result.feedback_text}

### Points Forts
${result.strengths?.map(s => `- ${s}`).join('\n')}

### Axes d'Amélioration
${result.weaknesses?.map(w => `- ${w}`).join('\n')}

### Détail des Métriques
- Débit Vocal : ${result.wpm} WPM
- Pauses : ${result.pause_count || 0}
- Hésitations : ${result.filler_count || 0}
- Contact Visuel : ${result.eye_contact_ratio}%
- Présence Visage : ${result.face_presence_ratio}%

### Recommandations du Coach
${Array.isArray(result.recommendations) 
  ? result.recommendations.map((r: any) => `#### ${r.category}\n${r.message}`).join('\n\n')
  : 'Continuez vos efforts !'}

---
Généré par SpeechCoach - Votre partenaire en expression orale.
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
    toast.success("Rapport exporté en Markdown !");
  };

  const handleExportPDF = () => {
    setIsExportOpen(false);
    setTimeout(() => window.print(), 100);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-muted/20">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-6">Rapport introuvable</h2>
        <Link href="/dashboard" className={cn(buttonVariants(), "no-print")}>Retour au Dashboard</Link>
      </div>
    );
  }

  const radarData = [
    { subject: 'Voix', A: result.voice_score, fullMark: 100 },
    { subject: 'Posture', A: result.body_language_score, fullMark: 100 },
    { subject: 'Scène', A: result.scene_score, fullMark: 100 },
    { subject: 'Regard', A: result.eye_contact_ratio, fullMark: 100 },
    { subject: 'Présence', A: result.presence_score || 0, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-muted/20 pb-20 print-container">
      {/* Web Header (Hidden on Print) */}
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b no-print">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/history" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Historique
            </Link>
            <div className="flex flex-col">
              <span className="font-bold text-lg truncate">{result.title || "Analyse Vidéo"}</span>
              <span className="text-[10px] text-muted-foreground font-mono">ID: {(id as string).slice(0, 8)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative" ref={dropdownRef}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="transition-all active:scale-95"
              >
                <Download className="w-4 h-4 mr-2" /> Exporter <ChevronDown className={cn("ml-1 w-3 h-3 transition-transform duration-200", isExportOpen && "rotate-180")} />
              </Button>
              
              <AnimatePresence>
                {isExportOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-2xl p-1 z-50 overflow-hidden"
                  >
                    <button 
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span>Format PDF</span>
                        <span className="text-[10px] text-gray-400 font-normal">Idéal pour l'impression</span>
                      </div>
                    </button>
                    <button 
                      onClick={handleExportMarkdown}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary rounded-lg transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span>Format Markdown</span>
                        <span className="text-[10px] text-gray-400 font-normal">Idéal pour vos notes (.md)</span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="outline" size="sm" className="hidden sm:flex transition-all active:scale-95">
              <Share2 className="w-4 h-4 mr-2" /> Partager
            </Button>
          </div>
        </div>
      </header>

      {/* Print-Only Header */}
      <div className="hidden print-only py-8 border-b mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">SpeechCoach</h1>
            <p className="text-sm text-muted-foreground">Rapport d'analyse et de coaching personnalisé</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{result.title || "Analyse Vidéo"}</p>
            <p className="text-xs font-mono">Session ID: {id}</p>
            <p className="text-xs text-muted-foreground">Date: {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 pt-28 space-y-8 print:p-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-xl overflow-hidden bg-black aspect-video flex items-center justify-center group relative no-print">
               {result.video_url ? (
                 <video 
                   src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${result.video_url}`} 
                   controls 
                   className="w-full h-full object-contain"
                 />
               ) : (
                 <div className="text-white/40 flex flex-col items-center gap-4">
                   <Video className="w-12 h-12 opacity-20" />
                   <p className="text-sm">Vidéo non disponible</p>
                 </div>
               )}
            </Card>
            <HeroSection result={result} radarData={radarData} />
          </div>
          
          <div className="space-y-8">
            <Card className="border-none shadow-xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground print-card">
              <CardContent className="pt-8 pb-8 flex flex-col items-center">
                <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" className="opacity-20" />
                    <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="8" 
                      strokeDasharray={440} strokeDashoffset={440 - (440 * result.overall_score) / 100} strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold">{result.overall_score}%</span>
                    <span className="text-xs opacity-80 uppercase tracking-widest">Score global</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold">{result.overall_score >= 80 ? "Bravo ! 🏆" : "Bel effort ! 📈"}</h2>
              </CardContent>
            </Card>
            <MetricsGrid result={result} />
          </div>
        </div>

        <FeedbackSection result={result} />
        
        {showFeedback && (
          <div className="pt-8 border-t no-print max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-6 text-center">Comment s'est passée votre expérience aujourd'hui ?</h3>
            <FeedbackForm onSubmitted={() => setTimeout(() => setShowFeedback(false), 2000)} />
          </div>
        )}
      </main>
    </div>
  );
}

function HeroSection({ result, radarData }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <Card className="border-none shadow-xl print-card">
        <CardHeader>
          <CardTitle>Détail des métriques</CardTitle>
          <CardDescription>Points forts et axes d'amélioration.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-8 items-center">
          <div className="h-[220px] w-full max-w-[260px] no-print">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid opacity={0.2} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
                <Radar name="Performance" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-4">
            <ScoreRow label="Voix" value={result.voice_score} icon={<Mic />} />
            <ScoreRow label="Corps" value={result.body_language_score} icon={<User />} />
            <ScoreRow label="Regard" value={result.eye_contact_ratio} icon={<Eye />} />
            <ScoreRow label="Présence" value={result.presence_score || 0} icon={<Video />} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ScoreRow({ label, value, icon }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">{React.cloneElement(icon, { className: "w-4 h-4" })} {label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function MetricsGrid({ result }: any) {
  const stats = [
    { label: 'Débit vocal', value: `${result.wpm} WPM`, icon: <Mic className="text-primary" /> },
    { label: 'Pauses', value: result.pause_count || 0, icon: <Pause className="text-amber-500" /> },
    { label: 'Hésitations', value: result.filler_count || 0, icon: <AlertTriangle className="text-orange-500" /> },
    { label: 'Visage', value: `${result.face_presence_ratio || 0}%`, icon: <User className="text-blue-500" /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 print-break-before">
      {stats.map((s, i) => (
        <Card key={i} className="border-none shadow-md print-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-muted">{s.icon}</div>
              <div>
                <div className="text-2xl font-extrabold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FeedbackSection({ result }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2 border-none shadow-lg print-card">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Bilan IA</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <p className="text-muted-foreground leading-relaxed">{result.feedback_text || "Analyse en attente de texte..."}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <h4 className="font-bold text-emerald-600 mb-3 uppercase text-xs">Forces</h4>
              {result.strengths?.map((s: string, i: number) => <div key={i} className="flex items-start gap-2 text-sm mb-1"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{s}</div>)}
            </div>
            <div>
              <h4 className="font-bold text-amber-600 mb-3 uppercase text-xs">Améliorations</h4>
              {result.weaknesses?.map((w: string, i: number) => <div key={i} className="flex items-start gap-2 text-sm mb-1"><TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />{w}</div>)}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-none shadow-md print-card">
        <CardHeader><CardTitle className="text-sm">Conseils Coach</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Array.isArray(result.recommendations) ? result.recommendations.map((rec: any, i: number) => (
            <div key={i} className="pb-3 border-b last:border-0">
               <div className="flex items-center gap-2 font-bold text-sm text-primary mb-1">{rec.category}</div>
               <p className="text-xs text-muted-foreground">{rec.message}</p>
            </div>
          )) : <p className="text-xs text-muted-foreground">Continuez vos efforts !</p>}
        </CardContent>
      </Card>
    </div>
  );
}
