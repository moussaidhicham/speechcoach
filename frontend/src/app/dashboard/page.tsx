'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Video,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/context/auth-context';
import { EnhancedOnboardingWizard } from '@/features/auth/enhanced-onboarding-wizard';
import { formatReportDate } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { videoService } from '@/services/video.service';
import {
  DashboardCoachingSnapshot,
  DashboardSummary,
  ReportResult,
  SessionHistory,
} from '@/types/analytics';
import { UserProfile } from '@/types/auth';

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  icon: React.ComponentType<{ className?: string }>;
}

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);
  const [dashboardSummary, setDashboardSummary] = React.useState<DashboardSummary | null>(null);
  const [latestReport, setLatestReport] = React.useState<ReportResult | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [showWizard, setShowWizard] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setLatestReport(null);
    try {
      const [summaryData, profileData] = await Promise.all([
        videoService.getDashboardSummary(),
        authService.getProfile(),
      ]);
      setDashboardSummary(summaryData);
      setProfile(profileData);

      // Fetch full report for latest session to ensure exercise data consistency
      // This is optional - if it fails, we'll use the summary data
      if (summaryData.recent_sessions.length > 0) {
        try {
          const latestSessionId = summaryData.recent_sessions[0].session_id;
          const reportData = await videoService.getResult(latestSessionId);
          setLatestReport(reportData);
        } catch (reportError) {
          console.error('Failed to fetch latest report (using summary data instead):', reportError);
          // Continue without report data - the dashboard will use summary data
        }
      }

      if (!profileData.full_name || !profileData.current_goal) setShowWizard(true);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (token) fetchData().catch(() => undefined);
  }, [fetchData, token]);

  const handleWizardComplete = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setShowWizard(false);
    toast.success(`Bienvenue, ${updatedProfile.full_name?.split(' ')[0] || 'coach'} !`);
  };

  const handleWizardSkip = () => {
    setShowWizard(false);
    toast.info('Vous pourrez compléter votre profil plus tard dans les paramètres.');
  };

  const hasNoSessions = !isLoading && (dashboardSummary?.total_sessions || 0) === 0;

  const chartData = (dashboardSummary?.progress_chart || []).map((point) => ({
    date: new Date(point.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    score: point.score,
    wpm: point.wpm,
  }));

  const recentSessions = dashboardSummary?.recent_sessions || [];

  return (
    <AppShell
      title="Tableau de bord"
      subtitle={
        isMounted
          ? `Bienvenue, ${profile?.full_name || user?.email || 'coach'}`
          : 'Chargement...'
      }
      actions={
        <Link href="/studio" className={buttonVariants({ size: 'sm' })}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nouvelle analyse
        </Link>
      }
      maxWidth="7xl"
    >
      <div suppressHydrationWarning className="w-full">
      <AnimatePresence>
        {showWizard ? (
          <EnhancedOnboardingWizard
            onComplete={handleWizardComplete}
            onSkip={handleWizardSkip}
          />
        ) : null}
      </AnimatePresence>

      <div className="space-y-8">

        {/* ————————————————————————————————— Hero banner ———————————————————————————————————————————————————————————————————————————————— */}
        <section className="surface-mixed rounded-3xl border border-border/60 p-7 lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex-1 space-y-1.5">
              <h1 className="font-display text-4xl font-medium tracking-tight">
                {isLoading ? (
                  <Skeleton className="h-10 w-64" />
                ) : (
                  `Salut, ${profile?.full_name?.split(' ')[0] || 'Coach'} !`
                )}
              </h1>
              <p className="text-muted-foreground">
                Votre vue synthèse pour suivre vos progrès de prise de parole.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Dernier rapport', recentSessions[0]?.title || (hasNoSessions ? 'En attente' : 'Aucune session')],
                ['Priorité', dashboardSummary?.latest_coaching?.primary_focus || (hasNoSessions ? 'Prêt à commencer' : 'Lancez une analyse')],
                ['Total sessions', `${dashboardSummary?.total_sessions || 0} sessions`],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-2xl border border-border/60 bg-background/95 px-4 py-5 shadow-sm flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {label}
                  </div>
                  <div
                    className="mt-2 text-sm font-medium leading-normal text-foreground truncate"
                    title={value}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/studio"
            className="surface-violet rounded-2xl border border-border/60 px-5 py-5 shadow-sm transition-colors hover:bg-secondary/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Prochaine étape</div>
                <div className="mt-1 font-display text-2xl font-medium">Lancer une nouvelle session</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ouvrez le studio et enregistrez une répétition de 60 à 90 secondes.
                </p>
              </div>
              <Plus className="h-5 w-5 text-primary" />
            </div>
          </Link>
          <Link
            href="/history"
            className="surface-teal rounded-2xl border border-border/60 px-5 py-5 shadow-sm transition-colors hover:bg-secondary/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Continuité</div>
                <div className="mt-1 font-display text-2xl font-medium">Relire vos dernières sessions</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Comparez vos scores et vérifiez vos progrès avant la prochaine prise.
                </p>
              </div>
              <History className="h-5 w-5 text-primary" />
            </div>
          </Link>
        </section>

        {/* ————————————————————————————————— Error state ———————————————————————————————————————————————————————————————————————————————— */}
        {isError && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-display text-lg font-medium">
                  Le dashboard ne s'est pas charge correctement
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Nous n'avons pas pu recuperer vos statistiques ou votre profil.
                  Vous pouvez relancer le chargement sans quitter la page.
                </p>
              </div>
              <Button onClick={() => fetchData()} className="shrink-0">
                Recharger
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ————————————————————————————————— Zero State ———————————————————————————————————————————————————————————————————————————————— */}
        {hasNoSessions ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-8 rounded-3xl border border-dashed border-border/60 bg-secondary/20 p-12 text-center lg:p-24">
             <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                <Sparkles className="relative h-16 w-16 text-primary" />
             </div>
             <div className="max-w-xl space-y-4">
               <h2 className="font-display text-4xl font-medium">Prêt pour votre première session ?</h2>
               <p className="text-lg text-muted-foreground leading-relaxed">
                 Lancez une première répétition de 60 secondes pour obtenir un rapport structuré,
                 une priorité claire et un plan d action concret.
               </p>
             </div>
             <Link href="/studio">
               <Button size="lg" className="px-8 h-12 text-base">
                 Commencer l'expérience
                 <ArrowRight className="ml-2 h-5 w-5" />
               </Button>
             </Link>
          </div>
        ) : (
          <>
            {/* ————————————————————————————————— Stat cards ———————————————————————————————————————————————————————————————————————————————— */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight">Vue d'ensemble</h2>
                <p className="text-sm text-muted-foreground">
                  Indicateurs clés de vos sessions récentes.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))
              ) : (
                <>
                  <StatCard
                    label="Score moyen"
                    value={`${dashboardSummary?.average_score || 0}%`}
                    subValue="Sur les vidéos terminées"
                    icon={TrendingUp}
                  />
                  <StatCard
                    label="Analyses totales"
                    value={`${dashboardSummary?.total_sessions || 0}`}
                    subValue="Sessions enregistrées"
                    icon={Video}
                  />
                  <StatCard
                    label="Score max"
                    value={`${dashboardSummary?.best_score || 0}%`}
                    subValue="Meilleure performance"
                    icon={CheckCircle2}
                  />
                  <StatCard
                    label="Temps pratique"
                    value={`${dashboardSummary?.total_practice_minutes || 0} min`}
                    subValue="Temps d'entraînement cumulé"
                    icon={Clock}
                  />
                </>
              )}
            </div>

            {/* ————————————————————————————————— Chart + recent sessions ———————————————————————————————————————————————————————————————————————————————— */}
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
              <Card className="lg:col-span-2 border-border/60 shadow-sm">
                <CardHeader>
                  <CardTitle>Progression des scores</CardTitle>
                  <CardDescription>Évolution de votre performance globale au fil des analyses.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="dashboardScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid hsl(var(--border))',
                              background: 'hsl(var(--card))',
                              boxShadow: '0 8px 24px -8px hsl(var(--foreground)/0.12)',
                              fontSize: '12px',
                            }}
                          />
                          <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#dashboardScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </CardContent>
              </Card>

              <RecentAnalyses recentSessions={recentSessions} />
            </div>

            {/* ————————————————————————————————— Coach recommendations ———————————————————————————————————————————————————————————————————————————————— */}
            <Recommendations
              latestCoaching={dashboardSummary?.latest_coaching || null}
              latestReport={latestReport}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
    </AppShell>
  );
}

/* ————————————————————————————————— StatCard ———————————————————————————————————————————————————————————————————————————————— */

function StatCard({ label, value, subValue, icon: Icon }: StatCardProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="px-6 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="font-display text-3xl font-medium text-foreground">{value}</div>
        <p className="mt-1.5 text-xs text-muted-foreground">{subValue}</p>
      </CardContent>
    </Card>
  );
}

/* ————————————————————————————————— RecentAnalyses ———————————————————————————————————————————————————————————————————————————————— */

function RecentAnalyses({ recentSessions }: { recentSessions: SessionHistory[] }) {
  const statusFr: Record<string, string> = {
    completed: 'Terminé',
    processing: 'En cours',
    pending: 'En attente',
    failed: 'Échec',
  };

  return (
    <Card className="flex flex-col border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Dernieres analyses</CardTitle>
        <CardDescription>Acces rapide a vos sessions les plus recentes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2.5">
        {recentSessions.length > 0 ? (
          recentSessions.map((item) => (
            <Link
              key={item.session_id}
              href={item.status === 'completed' ? `/report/${item.session_id}` : '/history'}
              className="rounded-xl border border-border/60 bg-background/70 px-4 py-3.5 transition-colors hover:bg-secondary/60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.title || `Session ${item.session_id.slice(0, 8)}`}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    item.status === 'completed' && 'bg-primary/10 text-primary'
                  )}
                >
                  {item.status === 'completed' ? `${item.overall_score}%` : statusFr[item.status] || item.status}
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun historique pour le moment.
          </p>
        )}
        <Link
          href="/history"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-auto w-full')}
        >
          Voir tout l'historique
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

/* ————————————————————————————————— EmptyState ———————————————————————————————————————————————————————————————————————————————— */

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 bg-secondary/30 p-8 text-center">
      <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Pas encore assez de donnees.</p>
      <Link href="/studio">
        <Button variant="outline" size="sm">
          Faire ma premiere analyse
        </Button>
      </Link>
    </div>
  );
}

/* ————————————————————————————————— Recommendations ———————————————————————————————————————————————————————————————————————————————— */

function Recommendations({
  latestCoaching,
  latestReport,
  isLoading,
}: {
  latestCoaching: DashboardCoachingSnapshot | null;
  latestReport: ReportResult | null;
  isLoading: boolean;
}) {
  const sectionHeader = (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">Coaching Expert</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stratégie de progression et retours de votre dernière session.
        </p>
      </div>
      {latestReport && !isLoading && (
        <Link
          href={`/report/${latestReport.session.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "hidden sm:flex")}
        >
          Voir le rapport
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      )}
      {!latestReport && latestCoaching && !isLoading && (
        <Link
          href={`/report/${latestCoaching.session_id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "hidden sm:flex")}
        >
          Voir le rapport
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {sectionHeader}
        <Skeleton className="h-[180px] rounded-3xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[280px] rounded-3xl" />
          <Skeleton className="h-[280px] rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!latestReport && !latestCoaching) {
    return (
      <div className="space-y-6">
        {sectionHeader}
        <Card className="border-dashed bg-secondary/20">
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Sparkles className="h-8 w-8 text-primary/40" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Analysez votre première vidéo pour débloquer votre plan d'action personnalisé.
            </p>
            <Link href="/studio">
              <Button size="sm">Lancer l'analyse</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!latestReport && latestCoaching) {
    return (
      <div className="space-y-6">
        {sectionHeader}

        <Card className="overflow-hidden border-border/60 shadow-sm surface-mixed">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="flex flex-1 flex-col justify-center p-8">
                <div className="mb-4 flex items-center gap-3">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest">
                    Diagnostic
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                    Session: {latestCoaching.title || `Session ${latestCoaching.session_id.slice(0, 8)}`}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-medium tracking-tight text-foreground leading-[1.2]">
                  {latestCoaching.headline || "Prêt pour la prochaine étape."}
                </h3>
                <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground/90 max-w-2xl">
                  {latestCoaching.narrative}
                </p>
              </div>

              <div className="flex w-full flex-col items-center justify-center border-t border-border/40 bg-secondary/15 p-8 md:w-[220px] md:border-l md:border-t-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                  Score Global
                </div>
                <div className="mt-2 font-display text-6xl font-medium text-primary">
                  {latestCoaching.overall_score}
                </div>
                <div className="mt-2 text-xs font-semibold text-primary/60 uppercase tracking-widest">/ 100</div>
                <Progress value={latestCoaching.overall_score} className="mt-6 h-1 w-full max-w-[120px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          <Card className="flex flex-col border-border/60 shadow-sm surface-violet">
            <CardHeader className="border-b border-border/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Plan d'action</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6 sm:p-8">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {latestCoaching.next_practice_title || "Entraînement ciblé"}
                </p>
                {latestCoaching.next_practice_step && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {latestCoaching.next_practice_step}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm surface-peach">
            <CardHeader className="border-b border-border/40 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Focus</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Axe prioritaire
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {latestCoaching.priority_focus || latestCoaching.primary_focus || 'Progression générale'}
                </div>
              </div>
              {latestCoaching.encouragement && (
                <div className="rounded-2xl border border-border/50 bg-background/60 p-4 text-sm leading-relaxed text-muted-foreground">
                  {latestCoaching.encouragement}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const report = latestReport!;

  return (
    <div className="space-y-6">
      {sectionHeader}

      {/* 1. Diagnostic Global */}
      <Card className="overflow-hidden border-border/60 shadow-sm surface-mixed">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className="flex flex-1 flex-col justify-center p-8">
              <div className="mb-4 flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest">
                  Diagnostic
                </Badge>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  Session: {report.session.title || `Session ${report.session.id.slice(0, 8)}`}
                </span>
              </div>
              <h3 className="font-display text-2xl font-medium tracking-tight text-foreground leading-[1.2]">
                {report.summary.headline || "Prêt pour la prochaine étape."}
              </h3>
              <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground/90 max-w-2xl">
                {report.summary.narrative}
              </p>
            </div>

            <div className="flex w-full flex-col items-center justify-center border-t border-border/40 bg-secondary/15 p-8 md:w-[220px] md:border-l md:border-t-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
                Score Global
              </div>
              <div className="mt-2 font-display text-6xl font-medium text-primary">
                {report.summary.overall_score}
              </div>
              <div className="mt-2 text-xs font-semibold text-primary/60 uppercase tracking-widest">/ 100</div>
              <Progress value={report.summary.overall_score} className="mt-6 h-1 w-full max-w-[120px]" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* 2. Plan d'Action - Version Épurée */}
        <Card className="flex flex-col border-border/60 shadow-sm surface-violet">
          <CardHeader className="border-b border-border/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Plan d'action</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-6 sm:p-8">
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <h4 className="font-display text-xl font-medium text-foreground">
                {report.exercise_recommendation?.title || report.training_plan.days[0]?.title || 'Entraînement ciblé'}
              </h4>
              <div className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-widest">
                Conseillé
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                // Get steps from exercise_recommendation or training_plan
                const rawSteps = report.exercise_recommendation?.steps || report.training_plan.days[0]?.items || [];
                const steps = rawSteps.flatMap(s => s.split(/ \| /))
                  .map(s => s.trim())
                  .filter(s => s.length > 0);

                if (steps.length === 0) {
                  return (
                    <p className="text-[15px] leading-relaxed text-foreground/80">
                      {report.exercise_recommendation?.summary || 'Appliquez les conseils prioritaires lors de votre prochaine prise.'}
                    </p>
                  );
                }

                return steps.map((step, idx) => (
                  <div key={idx} className="group flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-display text-sm font-bold transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                      {idx + 1}
                    </div>
                    <div className="pt-1">
                      <p className="text-[15px] leading-relaxed text-foreground/80 group-hover:text-foreground">
                        {step.trim().replace(/^\w/, (c) => c.toUpperCase())}
                        {!step.trim().endsWith('.') && '.'}
                      </p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>

        {/* 3. Sidebar: Priorité & Mot du Coach */}
        <div className="flex flex-col gap-6">
          <Card className="border-border/60 bg-background/50 text-card-foreground surface-teal">
            <CardContent className="p-6">
              <div>
                <div className="text-sm font-semibold text-primary mb-2">Priorité de travail</div>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {report.summary.priority_focus || report.training_plan.focus_primary || 'Progression générale'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative flex-1 overflow-hidden border-border/60 shadow-sm surface-mixed">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary">L'avis du Coach Expert</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              <div className="mt-2 flex-1">
                <p className="text-[15px] italic leading-relaxed text-muted-foreground relative z-10 px-2 line-clamp-6">
                  {report.summary.encouragement || "Chaque session est une étape vers votre aisance naturelle. Continuez ainsi !"}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3 border-t border-border/40 pt-5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground leading-none">Assistant SpeechCoach</div>
                  <div className="mt-1 text-[10px] font-bold text-primary/60 uppercase tracking-widest">Diagnostic IA</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}





