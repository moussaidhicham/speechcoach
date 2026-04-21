'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Menu,
  Mic,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
  X,
} from 'lucide-react';

import { LandingUserMenu } from '@/components/layout/landing-user-menu';
import { AvatarCustom } from '@/components/ui/avatar-custom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface FeedbackItem {
  id: string;
  rating: number;
  comments: string | null;
  user_profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface FeedbackStats {
  average_rating: number;
  total_reviews: number;
}

const analysisPillars = [
  {
    title: 'Voix et rythme',
    description: 'Débit (120-160 mots/min), pauses, hésitations et répétitions avec objectifs clairs.',
    icon: Mic,
  },
  {
    title: 'Présence visuelle',
    description: 'Contact visuel (>70%), visibilité des mains (>60%) et stabilité dans le cadre (>80%).',
    icon: Camera,
  },
  {
    title: 'Plan de progression',
    description: 'Score global, points forts/à améliorer, exercice concret et export pour la suite.',
    icon: ClipboardList,
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Préparer la prise',
    description: 'Vous démarrez dans le studio avec les vérifications utiles.',
  },
  {
    step: '02',
    title: 'Analyser la session',
    description: 'Le pipeline calcule les métriques audio et visuelles en un flux unique.',
  },
  {
    step: '03',
    title: 'Agir dès la session suivante',
    description: 'Vous repartez avec un bilan clair et un objectif pédagogique prioritaire.',
  },
];

const useCases = [
  'Soutenances académiques et présentations de mémoire',
  'Entretiens oraux et concours',
  'Pitch produit et démonstrations',
  'Pratique individuelle avec historique des progrès',
];

const trustItems = [
  'Mesures objectives: débit, pauses, contact visuel, visibilité des mains et qualité vidéo',
  'Rapport détaillé avec score global, points forts/à améliorer et exercices concrets',
  'Historique de sessions pour suivre votre progression dans le temps',
];

const proofHighlights = [
  ['142', 'mots/min'],
  ['52%', 'contact visuel'],
  ['68%', 'mains visibles'],
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { href: '#produit', label: 'Produit' },
    { href: '#process', label: 'Comment ça marche' },
    { href: '#cas-usage', label: 'Cas usage' },
    { href: '#output', label: 'Résultats' },
    { href: '#testimonials', label: 'Avis' },
  ] as const;

  React.useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.removeProperty('overflow');
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-[200] isolate border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mic className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-medium">SpeechCoach</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-3 py-2 transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <LandingUserMenu />
              <Link href="/studio" className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex lg:hidden')}>
                Analyser
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}
              >
                Connexion
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                Créer un compte
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            aria-label={mobileOpen ? 'Fermer menu' : 'Ouvrir menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="landing-mobile-nav" className="border-t border-border/60 bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {navItems.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="block rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary/60"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default function LandingPage() {
  const { token } = useAuth();
  const [isMounted, setIsMounted] = React.useState(false);
  const [feedbacks, setFeedbacks] = React.useState<FeedbackItem[]>([]);
  const [stats, setStats] = React.useState<FeedbackStats | null>(null);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = React.useState(true);

  React.useEffect(() => {
    setIsMounted(true);
    const loadFeedbackData = async () => {
      try {
        const [feedbackRes, statsRes] = await Promise.all([
          api.get('/feedback/platform/all'),
          api.get('/feedback/platform/stats'),
        ]);
        setFeedbacks(feedbackRes.data.slice(0, 6));
        setStats(statsRes.data);
      } catch (error) {
        console.error('Landing feedback fetch failed:', error);
      } finally {
        setIsLoadingFeedbacks(false);
      }
    };
    loadFeedbackData();
  }, []);

  const isAuthenticated = Boolean(token);

  return (
    <div className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
      <LandingNav isAuthenticated={isMounted && isAuthenticated} />

      <main>
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/40 via-background to-background">
          <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 bg-primary/10 text-primary">
                SpeechCoach Method
              </Badge>
              <h1 className="font-display text-5xl font-medium leading-tight text-foreground sm:text-6xl">
                Transformez chaque prise de parole en progression mesurable.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                De la capture au plan d action, SpeechCoach vous aide à comprendre vite ce qui fonctionne,
                ce qui doit évoluer et ce que vous devez appliquer dès la prochaine répétition.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={isAuthenticated ? '/studio' : '/register'} className={cn(buttonVariants({ size: 'lg' }))}>
                  {isAuthenticated ? 'Nouvelle analyse' : 'Commencer une analyse'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="#produit" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                  Voir un exemple de rapport
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  ['Vision unifiée', 'Web, PDF, Markdown alignés'],
                  ['Axes clairs', 'Voix, présence, gestes, cadrage'],
                  ['Action immédiate', 'Priorité et exercice ciblé'],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-2xl border border-border/60 bg-card px-4 py-4 shadow-sm">
                    <div className="text-sm font-medium">{title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="flex items-center">
              <div className="w-full rounded-3xl border border-border/60 bg-card p-6 shadow-[0_16px_48px_-24px_hsl(var(--foreground)/0.3)]">
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="outline">Aperçu rapport</Badge>
                  <span className="text-xs text-muted-foreground">Session de démonstration</span>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background p-5">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Score global</div>
                  <div className="mt-2 font-display text-5xl leading-none">78</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Présentation convenable. Priorité: réduire les hésitations et améliorer le contact visuel.
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    ['Point fort', 'Débit optimal (142 mots/min) et structure cohérente'],
                    ['Point à corriger', 'Contact visuel à 52% (objectif: >70%)'],
                    ['Action recommandée', 'Exercice: 3 prises courtes en fixant la caméra'],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border/60 bg-background px-4 py-3">
                      <div className="text-xs font-medium text-muted-foreground">{k}</div>
                      <div className="mt-1 text-sm">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Visualisation parallèle vidéo et rapport
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {proofHighlights.map(([value, label]) => (
                    <div key={label} className="rounded-xl border border-border/60 bg-background px-3 py-2">
                      <div className="font-display text-xl leading-none">{value}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="produit" className="py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Ce que le produit mesure
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Des métriques objectives pour une progression mesurable.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Chaque session analyse votre voix, votre présence visuelle et vos gestes avec des cibles claires et des recommandations actionnables.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {analysisPillars.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'rounded-xl border border-border/60 p-6 shadow-sm',
                    i === 0 ? 'surface-violet' : i === 1 ? 'surface-teal' : 'surface-amber'
                  )}
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-medium">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="process" className="border-y border-border/60 bg-card/20 py-20">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
            <motion.div {...fadeUp(0)}>
              <Badge variant="secondary" className="mb-4 bg-accent text-accent-foreground">
                Comment ça marche
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Un parcours simple, orienté action.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Vous savez quoi faire à chaque étape, sans jargon technique ni surcharge.
              </p>
              <div className="surface-mixed mt-8 rounded-xl border border-border/60 p-6 shadow-sm">
                <div className="mb-3 text-sm font-medium">Conçu pour</div>
                <div className="space-y-2">
                  {useCases.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3 text-sm">
                      <Users className="h-4 w-4 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="space-y-4">
              {journeySteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  {...fadeUp(i * 0.06)}
                  className={cn(
                    'rounded-xl border border-border/60 p-6 shadow-sm',
                    i === 0 ? 'surface-teal' : i === 1 ? 'surface-violet' : 'surface-amber'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm text-primary">
                      {step.step}
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-medium">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="cas-usage" className="py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Fiabilité et cohérence
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Des mesures objectives et un historique pour suivre votre progression.
              </h2>
            </motion.div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {trustItems.map((item, i) => (
                <motion.div
                  key={item}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'rounded-xl border border-border/60 px-5 py-5 text-sm leading-relaxed shadow-sm',
                    i === 0 ? 'surface-violet' : i === 1 ? 'surface-teal' : 'surface-amber'
                  )}
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {i === 0 ? <BarChart3 className="h-4 w-4" /> : i === 1 ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  {item}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="output" className="py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary">
                Ce que vous obtenez
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Un rapport complet, prêt à l'action.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Chaque session génère un rapport structuré avec des métriques précises et des recommandations personnalisées.
              </p>
            </motion.div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: BarChart3,
                  title: 'Score global',
                  description: 'Note sur 100 avec verdict automatique (Excellent, Bon, À améliorer)',
                },
                {
                  icon: CheckCircle2,
                  title: 'Points forts',
                  description: 'Liste de vos atouts détectés automatiquement',
                },
                {
                  icon: ArrowRight,
                  title: 'Axes de progression',
                  description: 'Éléments à corriger en priorité',
                },
                {
                  icon: Target,
                  title: 'Exercice recommandé',
                  description: 'Plan d\'action concret pour la prochaine répétition',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'rounded-xl border border-border/60 p-5 shadow-sm',
                    i === 0 ? 'surface-violet' : i === 1 ? 'surface-teal' : i === 2 ? 'surface-amber' : 'surface-mixed'
                  )}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeUp(0.2)} className="mt-8 rounded-2xl border border-border/60 bg-secondary/30 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-display text-lg font-medium">Export multi-format</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Chaque rapport peut être exporté en PDF, Markdown ou copié dans le presse-papiers pour partage académique ou professionnel.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="testimonials" className="border-y border-border/60 py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <motion.div {...fadeUp(0)} className="mb-12 max-w-2xl">
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                Ce que disent les utilisateurs
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Retours authentiques de personnes qui utilisent SpeechCoach.
              </p>
            </motion.div>

            {/* Stats banner - simplified */}
            {stats && (
              <motion.div
                {...fadeUp(0.05)}
                className="mb-10 grid grid-cols-3 gap-4 rounded-xl border border-border/40 bg-secondary/30 p-6"
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {stats.average_rating.toFixed(1)}/5
                  </div>
                  <div className="text-xs text-muted-foreground">Note moyenne</div>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {Math.round((stats.average_rating / 5) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="text-2xl font-semibold text-foreground">
                    {stats.total_reviews}
                  </div>
                  <div className="text-xs text-muted-foreground">Avis</div>
                </div>
              </motion.div>
            )}

            {/* Review cards */}
            <div className="grid gap-5 md:grid-cols-3">
              {isLoadingFeedbacks ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-52 animate-pulse rounded-2xl border border-border/60 bg-card" />
                ))
              ) : feedbacks.length > 0 ? (
                feedbacks.slice(0, 3).map((item, i) => {
                  const name = item.user_profile?.full_name || 'Utilisateur anonyme';
                  const initials = name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const gradients = [
                    'from-violet-500 to-purple-600',
                    'from-sky-500 to-blue-600',
                    'from-emerald-500 to-teal-600',
                  ];
                  return (
                    <motion.div
                      key={item.id}
                      {...fadeUp(i * 0.07)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-md"
                    >
                      {/* Decorative large quote */}
                      <div className="pointer-events-none absolute right-4 top-3 font-serif text-8xl leading-none text-primary/8 select-none">
                        &ldquo;
                      </div>

                      <div>
                        <RatingStars rating={item.rating} editable={false} size="sm" />
                        <p className="relative mt-4 text-sm leading-relaxed text-foreground/80">
                          {item.comments || 'Analyse claire, recommandations précises et progression visible dès les premières sessions.'}
                        </p>
                      </div>

                      <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-4">
                        {item.user_profile?.avatar_url ? (
                          <AvatarCustom
                            src={item.user_profile.avatar_url}
                            name={name}
                            size="sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white',
                              gradients[i % gradients.length]
                            )}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{name}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Avis vérifié
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-border/70 bg-card px-6 py-14 text-center text-sm text-muted-foreground">
                  Les premiers avis apparaîtront ici.
                </div>
              )}
            </div>

            {/* View all reviews link */}
            {feedbacks.length > 0 && (
              <motion.div
                {...fadeUp(0.25)}
                className="mt-8 flex items-center justify-center gap-3"
              >
                <Link
                  href="/public-feedback"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  Voir tous les avis
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {token && (
                  <Link
                    href="/settings?tab=feedback"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}
                  >
                    Donner mon avis
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.65)] sm:px-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <Badge variant="secondary" className="mb-4 bg-white/15 text-primary-foreground">
                    Prêt à vous entraîner
                  </Badge>
                  <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
                    Passez de la répétition au progrès visible.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
                    Lancez une session, obtenez un retour cohérent et appliquez une action concrète dès aujourd hui.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:min-w-56">
                  <Link href={isAuthenticated ? '/studio' : '/register'} className={cn(buttonVariants({ size: 'lg' }), 'bg-background text-foreground hover:bg-background/90')}>
                    {isAuthenticated ? 'Ouvrir le studio' : 'Créer un compte'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-lg font-medium">SpeechCoach</div>
                <div className="text-xs text-muted-foreground">Coaching oral avec lecture de performance</div>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Une plateforme pensée pour progresser avec des preuves utiles, des actions claires et des exports partageables.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <Link href="#produit" className="transition-colors hover:text-foreground">Produit</Link>
            <Link href="#process" className="transition-colors hover:text-foreground">Méthode</Link>
            <Link href="#output" className="transition-colors hover:text-foreground">Résultats</Link>
            <Link href="#testimonials" className="transition-colors hover:text-foreground">Avis</Link>
            <span className="text-muted-foreground/60">SpeechCoach 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
