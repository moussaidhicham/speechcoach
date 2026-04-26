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

import { LandingUserMenu } from '@/components/layout/LandingUserMenu';
import { AvatarCustom } from '@/components/ui/AvatarCustom';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { FEEDBACK_ENDPOINTS } from '@/constants/api';
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
    surface: 'surface-violet',
    shadow: 'shadow-soft-primary',
  },
  {
    title: 'Présence visuelle',
    description: 'Contact visuel (>70%), visibilité des mains (>60%) et stabilité dans le cadre (>80%).',
    icon: Camera,
    surface: 'surface-teal',
    shadow: 'shadow-soft-teal',
  },
  {
    title: 'Plan de progression',
    description: 'Score global, points forts/à améliorer, exercice concret et export pour la suite.',
    icon: ClipboardList,
    surface: 'surface-amber',
    shadow: 'shadow-soft-amber',
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Préparer la prise',
    description: 'Vous démarrez dans le studio avec les vérifications utiles.',
    surface: 'surface-teal',
  },
  {
    step: '02',
    title: 'Analyser la session',
    description: 'Le pipeline calcule les métriques audio et visuelles en un flux unique.',
    surface: 'surface-violet',
  },
  {
    step: '03',
    title: 'Agir dès la session suivante',
    description: 'Vous repartez avec un bilan clair et un objectif pédagogique prioritaire.',
    surface: 'surface-amber',
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
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay },
});

const cardHover = {
  whileHover: { 
    y: -4, 
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } 
  },
};

const buttonHover = {
  whileHover: { 
    scale: 1.02, 
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } 
  },
  whileTap: { scale: 0.98 },
};

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
    <header className="nav-glass sticky top-0 z-[200] isolate">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft-primary transition-transform duration-300 group-hover:scale-105">
            <Mic className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-medium">SpeechCoach</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl px-4 py-2 transition-all duration-300 hover:bg-primary/5 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <LandingUserMenu />
              <Link href="/studio" className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex lg:hidden rounded-xl')}>
                Analyser
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex rounded-xl')}
              >
                Connexion
              </Link>
              <motion.div {...buttonHover}>
                <Link href="/register" className={cn(buttonVariants({ size: 'sm' }), 'rounded-xl btn-glow')}>
                  Créer un compte
                </Link>
              </motion.div>
            </>
          )}

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 hover:bg-primary/5 hover:text-foreground lg:hidden"
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
        <div id="landing-mobile-nav" className="border-t border-border/40 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {navItems.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-primary/5"
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
          api.get(FEEDBACK_ENDPOINTS.PLATFORM_ALL),
          api.get(FEEDBACK_ENDPOINTS.PLATFORM_STATS),
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
    <div className="organic-bg min-h-screen bg-background text-foreground" suppressHydrationWarning>
      {/* Floating accent blobs */}
      <div className="blob-accent-1" />
      <div className="blob-accent-2" />
      <div className="blob-accent-3" />
      
      <LandingNav isAuthenticated={isMounted && isAuthenticated} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="hero-section relative overflow-hidden py-8">
          <div className="hero-blob-1" />
          <div className="hero-blob-2" />
          <div className="hero-blob-3" />
          
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-6 rounded-full bg-primary/10 px-4 py-1.5 text-primary backdrop-blur-sm">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                SpeechCoach Method
              </Badge>
              <h1 className="font-display text-5xl font-medium leading-tight sm:text-6xl">
                <span className="gradient-text">Transformez</span> chaque prise de parole en progression mesurable.
              </h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                De la capture au plan d&apos;action, SpeechCoach vous aide à comprendre vite ce qui fonctionne,
                ce qui doit évoluer et ce que vous devez appliquer dès la prochaine répétition.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <motion.div {...buttonHover}>
                  <Link href={isAuthenticated ? '/studio' : '/register'} className={cn(buttonVariants({ size: 'lg' }), 'rounded-2xl btn-glow px-6')}>
                    {isAuthenticated ? 'Nouvelle analyse' : 'Commencer une analyse'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
                <motion.div {...buttonHover}>
                  <Link href="#produit" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-2xl px-6 backdrop-blur-sm')}>
                    Voir un exemple de rapport
                  </Link>
                </motion.div>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {[
                  ['Vision unifiée', 'Web, PDF, Markdown alignés'],
                  ['Axes clairs', 'Voix, présence, gestes, cadrage'],
                  ['Action immédiate', 'Priorité et exercice ciblé'],
                ].map(([title, detail], i) => (
                  <motion.div 
                    key={title} 
                    {...fadeUp(0.1 + i * 0.05)}
                    {...cardHover}
                    className="glass-card rounded-2xl px-5 py-5"
                  >
                    <div className="text-sm font-medium text-foreground">{title}</div>
                    <div className="mt-1.5 text-sm text-muted-foreground">{detail}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp(0.08)} className="flex items-center">
              <div className="glass-card-strong w-full rounded-3xl p-7 shadow-soft-primary">
                <div className="mb-5 flex items-center justify-between">
                  <Badge variant="outline" className="rounded-full bg-background/50 backdrop-blur-sm">Aperçu rapport</Badge>
                  <span className="text-xs text-muted-foreground">Session de démonstration</span>
                </div>
                <div className="glass-card rounded-2xl p-6">
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Score global</div>
                  <div className="mt-2 font-display text-5xl leading-none gradient-text">78</div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    Présentation convenable. Priorité: réduire les hésitations et améliorer le contact visuel.
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ['Point fort', 'Débit optimal (142 mots/min) et structure cohérente'],
                    ['Point à corriger', 'Contact visuel à 52% (objectif: >70%)'],
                    ['Action recommandée', 'Exercice: 3 prises courtes en fixant la caméra'],
                  ].map(([k, v]) => (
                    <motion.div 
                      key={k} 
                      className="glass-card rounded-2xl px-5 py-4"
                      whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                    >
                      <div className="text-xs font-medium text-muted-foreground">{k}</div>
                      <div className="mt-1.5 text-sm text-foreground">{v}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  Visualisation parallèle vidéo et rapport
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {proofHighlights.map(([value, label]) => (
                    <div key={label} className="glass-card rounded-2xl px-4 py-3 text-center">
                      <div className="font-display text-xl leading-none gradient-text">{value}</div>
                      <div className="mt-1.5 text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Product Section */}
        <section id="produit" className="relative py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
                Ce que le produit mesure
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Des métriques objectives pour une <span className="gradient-text">progression mesurable</span>.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Chaque session analyse votre voix, votre présence visuelle et vos gestes avec des cibles claires et des recommandations actionnables.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {analysisPillars.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.06)}
                  {...cardHover}
                  className={cn(
                    'card-hover rounded-3xl p-7',
                    item.surface,
                    item.shadow
                  )}
                >
                  <div className="card-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-medium">{item.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section id="process" className="relative py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
            <motion.div {...fadeUp(0)}>
              <Badge variant="secondary" className="mb-5 rounded-full bg-accent/10 px-4 py-1.5 text-accent-foreground backdrop-blur-sm">
                Comment ça marche
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Un parcours simple, <span className="gradient-text">orienté action</span>.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Vous savez quoi faire à chaque étape, sans jargon technique ni surcharge.
              </p>
              <motion.div 
                {...fadeUp(0.1)}
                className="surface-mixed mt-10 rounded-3xl p-7 shadow-soft-primary"
              >
                <div className="mb-4 text-sm font-medium">Conçu pour</div>
                <div className="space-y-3">
                  {useCases.map((item, i) => (
                    <motion.div 
                      key={item} 
                      className="glass-card flex items-center gap-3 rounded-2xl px-5 py-4 text-sm"
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                    >
                      <Users className="h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <div className="space-y-5">
              {journeySteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  {...fadeUp(i * 0.08)}
                  {...cardHover}
                  className={cn(
                    'card-hover rounded-3xl p-7',
                    step.surface
                  )}
                >
                  <div className="flex items-start gap-5">
                    <div className="card-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-mono text-sm font-medium text-primary">
                      {step.step}
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-medium">{step.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section id="cas-usage" className="relative py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
                Fiabilité et cohérence
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Des mesures objectives et un historique pour <span className="gradient-text">suivre votre progression</span>.
              </h2>
            </motion.div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {trustItems.map((item, i) => (
                <motion.div
                  key={item}
                  {...fadeUp(i * 0.06)}
                  {...cardHover}
                  className={cn(
                    'card-hover rounded-3xl px-6 py-6 text-sm leading-relaxed',
                    i === 0 ? 'surface-violet shadow-soft-primary' : i === 1 ? 'surface-teal shadow-soft-teal' : 'surface-amber shadow-soft-amber'
                  )}
                >
                  <div className="card-icon mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {i === 0 ? <BarChart3 className="h-4 w-4" /> : i === 1 ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <span className="text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Output Section */}
        <section id="output" className="relative py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp(0)} className="max-w-2xl">
              <Badge variant="secondary" className="mb-5 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
                Ce que vous obtenez
              </Badge>
              <h2 className="font-display text-4xl font-medium leading-tight">
                Un rapport complet, <span className="gradient-text">prêt à l&apos;action</span>.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Chaque session génère un rapport structuré avec des métriques précises et des recommandations personnalisées.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: BarChart3,
                  title: 'Score global',
                  description: 'Note sur 100 avec verdict automatique (Excellent, Bon, À améliorer)',
                  surface: 'surface-violet',
                  shadow: 'shadow-soft-primary',
                },
                {
                  icon: CheckCircle2,
                  title: 'Points forts',
                  description: 'Liste de vos atouts détectés automatiquement',
                  surface: 'surface-teal',
                  shadow: 'shadow-soft-teal',
                },
                {
                  icon: ArrowRight,
                  title: 'Axes de progression',
                  description: 'Éléments à corriger en priorité',
                  surface: 'surface-amber',
                  shadow: 'shadow-soft-amber',
                },
                {
                  icon: Target,
                  title: 'Exercice recommandé',
                  description: "Plan d'action concret pour la prochaine répétition",
                  surface: 'surface-mixed',
                  shadow: 'shadow-soft-primary',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.06)}
                  {...cardHover}
                  className={cn(
                    'card-hover rounded-3xl p-6',
                    item.surface,
                    item.shadow
                  )}
                >
                  <div className="card-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-medium">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeUp(0.25)} className="mt-10 glass-card-strong rounded-3xl p-7">
              <div className="flex items-start gap-5">
                <div className="card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-display text-lg font-medium">Export multi-format</h4>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Chaque rapport peut être exporté en PDF, Markdown ou copié dans le presse-papiers pour partage académique ou professionnel.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <motion.div {...fadeUp(0)} className="mb-14 max-w-2xl">
              <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                Ce que disent <span className="gradient-text">les utilisateurs</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Retours authentiques de personnes qui utilisent SpeechCoach.
              </p>
            </motion.div>

            {/* Stats banner */}
            {stats && (
              <motion.div
                {...fadeUp(0.06)}
                className="glass-card-strong mb-12 grid grid-cols-3 gap-4 rounded-3xl p-7"
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-3xl font-semibold gradient-text">
                    {stats.average_rating.toFixed(1)}/5
                  </div>
                  <div className="text-xs text-muted-foreground">Note moyenne</div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-3xl font-semibold gradient-text">
                    {Math.round((stats.average_rating / 5) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="text-3xl font-semibold gradient-text">
                    {stats.total_reviews}
                  </div>
                  <div className="text-xs text-muted-foreground">Avis</div>
                </div>
              </motion.div>
            )}

            {/* Review cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {isLoadingFeedbacks ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-56 animate-pulse rounded-3xl glass-card" />
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
                      {...fadeUp(i * 0.08)}
                      {...cardHover}
                      className="testimonial-card group relative flex flex-col justify-between overflow-hidden rounded-3xl p-7"
                    >
                      {/* Decorative large quote */}
                      <div className="pointer-events-none absolute right-4 top-3 font-serif text-8xl leading-none text-primary/8 select-none">
                        &ldquo;
                      </div>

                      <div>
                        <RatingStars rating={item.rating} editable={false} size="sm" />
                        <p className="relative mt-5 text-sm leading-relaxed text-foreground/80">
                          {item.comments || 'Analyse claire, recommandations précises et progression visible dès les premières sessions.'}
                        </p>
                      </div>

                      <div className="mt-7 flex items-center gap-3 border-t border-border/30 pt-5">
                        {item.user_profile?.avatar_url ? (
                          <AvatarCustom
                            src={item.user_profile.avatar_url}
                            name={name}
                            size="sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white shadow-lg',
                              gradients[i % gradients.length]
                            )}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{name}</div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Avis vérifié
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-3xl glass-card px-6 py-16 text-center text-sm text-muted-foreground">
                  Les premiers avis apparaîtront ici.
                </div>
              )}
            </div>

            {/* View all reviews link */}
            {feedbacks.length > 0 && (
              <motion.div
                {...fadeUp(0.3)}
                className="mt-10 flex items-center justify-center gap-4"
              >
                <motion.div {...buttonHover}>
                  <Link
                    href="/public-feedback"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 rounded-xl')}
                  >
                    Voir tous les avis
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </motion.div>
                {token && (
                  <Link
                    href="/settings?tab=feedback"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground rounded-xl')}
                  >
                    Donner mon avis
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div 
              {...fadeUp(0)}
              className="cta-section rounded-[2.5rem] px-8 py-14 text-primary-foreground sm:px-14"
            >
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <Badge variant="secondary" className="mb-5 rounded-full bg-white/15 px-4 py-1.5 text-primary-foreground backdrop-blur-sm">
                    Prêt à vous entraîner
                  </Badge>
                  <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
                    Passez de la répétition au progrès visible.
                  </h2>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
                    Lancez une session, obtenez un retour cohérent et appliquez une action concrète dès aujourd&apos;hui.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:min-w-60">
                  <motion.div {...buttonHover}>
                    <Link 
                      href={isAuthenticated ? '/studio' : '/register'} 
                      className={cn(
                        buttonVariants({ size: 'lg' }), 
                        'rounded-2xl bg-background text-foreground hover:bg-background/90 w-full justify-center'
                      )}
                    >
                      {isAuthenticated ? 'Ouvrir le studio' : 'Créer un compte'}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer-section relative z-10 border-t border-border/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft-primary transition-transform duration-300 group-hover:scale-105">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <div className="font-display text-lg font-medium">SpeechCoach</div>
                <div className="text-xs text-muted-foreground">Coaching oral avec lecture de performance</div>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Une plateforme pensée pour progresser avec des preuves utiles, des actions claires et des exports partageables.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <Link href="#produit" className="transition-colors duration-300 hover:text-foreground">Produit</Link>
            <Link href="#process" className="transition-colors duration-300 hover:text-foreground">Méthode</Link>
            <Link href="#output" className="transition-colors duration-300 hover:text-foreground">Résultats</Link>
            <Link href="#testimonials" className="transition-colors duration-300 hover:text-foreground">Avis</Link>
            <span className="text-muted-foreground/60">SpeechCoach 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
