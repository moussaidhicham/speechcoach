'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Plus, Play, CheckCircle2, TrendingUp, Clock, Video, BarChart3, Eye, Sparkles, ArrowRight
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { authService } from '@/services/auth.service';
import { videoService } from '@/services/video.service';
import { OnboardingWizard } from '@/features/auth/onboarding-wizard';
import { SessionHistory } from '@/types/analytics';
import { UserProfile } from '@/types/auth';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [history, setHistory] = React.useState<SessionHistory[]>([]);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showWizard, setShowWizard] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const [historyData, profileData] = await Promise.all([
          videoService.getHistory(),
          authService.getProfile()
        ]);
        setHistory(historyData);
        setProfile(profileData);
        
        if (!profileData.full_name || !profileData.current_goal) {
          setShowWizard(true);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleWizardComplete = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setShowWizard(false);
    toast.success(`Bienvenue, ${updatedProfile.full_name?.split(' ')[0]} !`);
  };

  const completedSessions = history.filter(h => h.status === 'completed');
  const avgScore = completedSessions.length > 0 
    ? Math.round(completedSessions.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / completedSessions.length)
    : 0;
  
  const maxScore = completedSessions.length > 0
    ? Math.max(...completedSessions.map(s => s.overall_score || 0))
    : 0;

  const totalTimeSeconds = history.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

  const chartData = completedSessions
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(session => ({
      date: mounted ? new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '',
      score: session.overall_score || 0,
      wpm: session.wpm || 0,
    }));

  const lastSession = completedSessions[completedSessions.length - 1];

  return (
    <div className="flex min-h-screen bg-muted/20 relative" suppressHydrationWarning>
      <AnimatePresence>
        {showWizard && (
          <OnboardingWizard onComplete={handleWizardComplete} />
        )}
      </AnimatePresence>

      <Sidebar />

      <main className="flex-1 flex flex-col">
        <Header 
          title="Dashboard" 
          subtitle={`Bienvenue, ${profile?.full_name || user?.email}`}
        >
          <Link href="/studio" className={buttonVariants({ size: "sm" })}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle Analyse
          </Link>
        </Header>

        <div className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard label="Score Moyen" value={`${avgScore}%`} subValue="Sur les vidéos complétées" icon={TrendingUp} iconColor="text-emerald-500" />
            <StatCard label="Analyses Totales" value={history.length.toString()} subValue="Vidéos uploadées" icon={Video} iconColor="text-primary" />
            <StatCard label="Score Max" value={`${maxScore}%`} subValue="Meilleure performance" icon={CheckCircle2} iconColor="text-primary" />
            <StatCard label="Temps Coaché" value={`${totalTimeMinutes}m`} subValue="Total d'entraînement" icon={Clock} iconColor="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Progression des Scores</CardTitle>
                  <CardDescription>Évolution de votre performance globale au fil du temps.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState /> }
                </div>
              </CardContent>
            </Card>

            <RecentAnalyses history={history} />
          </div>
          
          <Recommendations lastSession={lastSession} />
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, iconColor }: any) {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
      </CardContent>
    </Card>
  );
}

function RecentAnalyses({ history }: { history: SessionHistory[] }) {
  return (
    <Card className="border-none shadow-md flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Dernières Analyses</CardTitle>
        <CardDescription>Vos sessions les plus récentes.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        {history.length > 0 ? history.slice(-5).reverse().map((item) => (
          <Link key={item.session_id} href={item.status === 'completed' ? `/report/${item.session_id}` : '#'}>
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("p-2 rounded-lg shrink-0", 
                  item.status === 'failed' ? 'bg-destructive/10 text-destructive' 
                  : item.status === 'pending' || item.status === 'processing' ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-primary/10 text-primary'
                )}>
                  {item.status === 'failed' ? <Play className="w-4 h-4" /> : <Play className="w-4 h-4 fill-primary" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">#{item.session_id.split('-')[0]}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className={cn("shrink-0", item.status === 'completed' ? "bg-emerald-50 text-emerald-700" : "")}>
                {item.status === 'completed' ? `${item.overall_score}%` : item.status}
              </Badge>
            </div>
          </Link>
        )) : <p className="text-center opacity-40 py-8">Aucun historique</p>}
        <Link href="/history" className={cn(buttonVariants({ variant: "ghost" }), "w-full text-xs mt-auto")}>
          Voir tout l'historique <ArrowRight className="w-3 h-3 ml-2" />
        </Link>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30 rounded-xl border border-dashed gap-4 p-8">
      <BarChart3 className="w-8 h-8 opacity-20" />
      <p className="text-sm font-medium">Pas encore assez de données.</p>
      <Link href="/studio"><Button variant="outline" size="sm">Faire ma première analyse</Button></Link>
    </div>
  );
}

function Recommendations({ lastSession }: { lastSession?: SessionHistory }) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Conseils de votre Coach</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TipCard 
          title="Mise au point sur le regard" 
          icon={Eye} 
          color="primary"
          content={lastSession && (lastSession.overall_score || 0) < 70 
            ? "Vos dernières sessions montrent une baisse du contact visuel. Pensez à lever le regard !"
            : "Excellent maintien du contact visuel lors de votre dernière séance."}
        />
        <TipCard 
          title="Analyse du débit vocal" 
          icon={BarChart3} 
          color="amber"
          content={lastSession && (lastSession.wpm || 0) > 160
            ? "Votre débit est un peu rapide. Essayez de marquer plus de pauses."
            : "Votre rythme de parole est idéal."}
        />
      </div>
    </div>
  );
}

function TipCard({ title, icon: Icon, color, content }: any) {
  return (
    <Card className={cn("border-none shadow-md bg-gradient-to-br relative overflow-hidden group", color === 'primary' ? "from-primary/5" : "from-amber-500/5")}>
       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
         <Icon className={cn("w-16 h-16", color === 'primary' ? "text-primary" : "text-amber-500")} />
      </div>
      <CardContent className="p-6 flex gap-4 relative z-10">
        <div className={cn("p-3 rounded-full h-fit", color === 'primary' ? "bg-primary/10" : "bg-amber-500/10")}>
          <Icon className={cn("w-6 h-6", color === 'primary' ? "text-primary" : "text-amber-500")} />
        </div>
        <div>
          <h3 className="font-bold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
