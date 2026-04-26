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
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
  Zap,
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
    description: 'Analyse du debit, pauses strategiques et hesitations avec objectifs personnalises.',
    icon: Mic,
    accent: 'violet',
    metric: '120-160',
    metricLabel: 'mots/min optimal',
  },
  {
    title: 'Presence visuelle',
    description: 'Contact visuel, visibilite des mains et stabilite dans le cadre video.',
    icon: Camera,
    accent: 'teal',
    metric: '>70%',
    metricLabel: 'contact visuel',
  },
  {
    title: 'Plan de progression',
    description: 'Score global, points forts et exercices concrets pour la prochaine session.',
    icon: ClipboardList,
    accent: 'amber',
    metric: '1',
    metricLabel: 'action prioritaire',
  },
];

const journeySteps = [
  {
    step: '01',
    title: 'Lancez votre session',
    description: 'Studio integre avec verifications automatiques camera et micro.',
    icon: Play,
  },
  {
    step: '02',
    title: 'Analyse en temps reel',
    description: 'IA analyse votre voix, presence et gestes instantanement.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Progressez immediatement',
    description: 'Rapport actionnable avec un objectif clair pour la suite.',
    icon: Target,
  },
];

const useCases = [
  { text: 'Soutenances academiques', icon: FileText },
  { text: 'Entretiens et concours', icon: Users },
  { text: 'Pitch et demos produit', icon: Target },
  { text: 'Entrainement quotidien', icon: BarChart3 },
];

const trustItems = [
  {
    icon: BarChart3,
    title: 'Mesures objectives',
    description: 'Debit, pauses, contact visuel, visibilite des mains et qualite video.',
  },
  {
    icon: CheckCircle2,
    title: 'Rapport detaille',
    description: 'Score global, points forts/a ameliorer et exercices concrets.',
  },
  {
    icon: ShieldCheck,
    title: 'Historique complet',
    description: 'Suivez votre progression dans le temps avec toutes vos sessions.',
  },
];

const outputItems = [
  {
    icon: BarChart3,
    title: 'Score global',
    description: 'Note sur 100 avec verdict automatique',
    accent: 'violet',
  },
  {
    icon: CheckCircle2,
    title: 'Points forts',
    description: 'Vos atouts detectes automatiquement',
    accent: 'teal',
  },
  {
    icon: ArrowRight,
    title: 'Axes de progression',
    description: 'Elements a corriger en priorite',
    accent: 'amber',
  },
  {
    icon: Target,
    title: 'Exercice recommande',
    description: 'Plan d\'action pour la prochaine session',
    accent: 'violet',
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay },
});

function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { href: '#produit', label: 'Produit' },
    { href: '#process', label: 'Methode' },
    { href: '#resultats', label: 'Resultats' },
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
    <header className="nav-clean sticky top-0 z-[200]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
            <Mic className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">SpeechCoach</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {navItems.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-3 py-1.5 transition-colors duration-200 hover:bg-secondary hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <LandingUserMenu />
              <Link 
                href="/studio" 
                className={cn(buttonVariants({ size: 'sm' }), 'hidden sm:inline-flex rounded-lg btn-primary')}
              >
                Studio
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex rounded-lg')}
              >
                Connexion
              </Link>
              <Link 
                href="/register" 
                className={cn(buttonVariants({ size: 'sm' }), 'rounded-lg btn-primary')}
              >
                Commencer
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground md:hidden"
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
        <div id="landing-mobile-nav" className="border-t border-border bg-background md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-secondary"
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
    <div className="clean-bg min-h-screen text-foreground" suppressHydrationWarning>
      <LandingNav isAuthenticated={isMounted && isAuthenticated} />

      <main>
        {/* Hero Section */}
        <section className="pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:items-center">
            <motion.div {...fadeUp(0)} className="max-w-xl">
              <Badge 
                variant="secondary" 
                className="mb-4 rounded-full stat-badge px-3 py-1 text-xs font-medium text-primary"
              >
                <Sparkles className="mr-1.5 h-3 w-3" />
                Coaching IA pour l&apos;oral
              </Badge>
              
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Transformez chaque{' '}
                <span className="text-gradient">prise de parole</span>{' '}
                en succes.
              </h1>
              
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Analyse IA de votre voix et presence. Metriques precises, feedback instantane, 
                progression visible des la premiere session.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link 
                  href={isAuthenticated ? '/studio' : '/register'} 
                  className={cn(buttonVariants({ size: 'default' }), 'rounded-lg btn-primary px-5')}
                >
                  {isAuthenticated ? 'Lancer une analyse' : 'Essayer gratuitement'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                
                <Link 
                  href="#produit" 
                  className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'rounded-lg px-5')}
                >
                  Voir un exemple
                </Link>
              </div>

              {/* Quick stats */}
              <div className="mt-8 flex items-center gap-6 border-t border-border pt-5">
                {[
                  ['142', 'mots/min'],
                  ['78%', 'contact visuel'],
                  ['85', 'score global'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-xl font-semibold text-gradient">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Hero Score Card */}
            <motion.div {...fadeUp(0.1)} className="relative">
              <div className="score-card rounded-xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="rounded-full text-xs">
                    Apercu rapport
                  </Badge>
                  <span className="text-xs text-muted-foreground">Demo live</span>
                </div>
                
                <div className="text-center mb-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Score global</div>
                  <div className="text-6xl font-bold score-number sm:text-7xl">78</div>
                  <div className="mt-1 text-sm text-muted-foreground">Bon - Progression en cours</div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Point fort', value: 'Debit optimal et structure claire', color: 'text-emerald-600' },
                    { label: 'A ameliorer', value: 'Contact visuel a 52% (cible >70%)', color: 'text-amber-600' },
                    { label: 'Exercice', value: '3 prises courtes en fixant la camera', color: 'text-primary' },
                  ].map((item) => (
                    <div 
                      key={item.label}
                      className="card-elevated rounded-lg px-3 py-2.5"
                    >
                      <div className={cn('text-xs font-medium', item.color)}>{item.label}</div>
                      <div className="mt-0.5 text-sm text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="produit" className="py-10 sm:py-14 bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Analyse <span className="text-gradient">complete</span> en une session
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto text-sm">
                Trois axes essentiels mesures avec precision pour une progression concrete.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {analysisPillars.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'feature-card rounded-xl p-5',
                    item.accent === 'violet' && 'feature-card-violet',
                    item.accent === 'teal' && 'feature-card-teal',
                    item.accent === 'amber' && 'feature-card-amber'
                  )}
                >
                  <div className={cn(
                    'icon-box mb-3 flex h-10 w-10 items-center justify-center rounded-lg',
                    item.accent === 'violet' && 'bg-violet-100 text-violet-600',
                    item.accent === 'teal' && 'bg-teal-100 text-teal-600',
                    item.accent === 'amber' && 'bg-amber-100 text-amber-600'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className={cn(
                      'text-lg font-bold',
                      item.accent === 'violet' && 'text-violet-600',
                      item.accent === 'teal' && 'text-teal-600',
                      item.accent === 'amber' && 'text-amber-600'
                    )}>
                      {item.metric}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.metricLabel}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section id="process" className="py-10 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Simple. Rapide. <span className="text-gradient">Efficace.</span>
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                De la prise de parole au plan d&apos;action en quelques minutes.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {journeySteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  {...fadeUp(i * 0.05)}
                  className="feature-card feature-card-violet rounded-xl p-5 text-center"
                >
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="mb-1 font-mono text-xs text-primary/70">{step.step}</div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Use cases */}
            <motion.div {...fadeUp(0.15)} className="mt-6">
              <div className="card-highlight rounded-xl p-4">
                <div className="text-center mb-3">
                  <div className="text-sm font-medium text-foreground">Ideal pour</div>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {useCases.map((item) => (
                    <div 
                      key={item.text}
                      className="metric-badge flex items-center gap-2 rounded-full px-3 py-1.5 text-sm"
                    >
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-10 sm:py-14 bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Des mesures <span className="text-gradient">objectives</span> et fiables
              </h2>
              <p className="mt-2 text-muted-foreground text-sm max-w-2xl mx-auto">
                Chaque session vous donne des donnees precises pour suivre votre progression.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {trustItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'feature-card rounded-xl p-5',
                    i === 0 && 'feature-card-violet',
                    i === 1 && 'feature-card-teal',
                    i === 2 && 'feature-card-amber'
                  )}
                >
                  <div className={cn(
                    'icon-box mb-3 flex h-10 w-10 items-center justify-center rounded-lg',
                    i === 0 && 'bg-violet-100 text-violet-600',
                    i === 1 && 'bg-teal-100 text-teal-600',
                    i === 2 && 'bg-amber-100 text-amber-600'
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Output Section */}
        <section id="resultats" className="py-10 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Un rapport complet, <span className="text-gradient">pret a l&apos;action</span>
              </h2>
              <p className="mt-2 text-muted-foreground text-sm max-w-2xl mx-auto">
                Chaque session genere un rapport structure avec des metriques precises.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {outputItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  {...fadeUp(i * 0.05)}
                  className={cn(
                    'feature-card rounded-xl p-4',
                    item.accent === 'violet' && 'feature-card-violet',
                    item.accent === 'teal' && 'feature-card-teal',
                    item.accent === 'amber' && 'feature-card-amber'
                  )}
                >
                  <div className={cn(
                    'icon-box mb-3 flex h-9 w-9 items-center justify-center rounded-lg',
                    item.accent === 'violet' && 'bg-violet-100 text-violet-600',
                    item.accent === 'teal' && 'bg-teal-100 text-teal-600',
                    item.accent === 'amber' && 'bg-amber-100 text-amber-600'
                  )}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Export info */}
            <motion.div {...fadeUp(0.2)} className="mt-5">
              <div className="card-highlight rounded-xl p-4 flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Export multi-format</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chaque rapport peut etre exporte en PDF, Markdown ou copie dans le presse-papiers.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-10 sm:py-14 bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div {...fadeUp(0)} className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ils progressent avec <span className="text-gradient">SpeechCoach</span>
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Retours authentiques de nos utilisateurs.
              </p>
            </motion.div>

            {/* Stats banner */}
            {stats && (
              <motion.div
                {...fadeUp(0.05)}
                className="card-highlight mb-5 grid grid-cols-3 gap-3 rounded-xl p-4"
              >
                <div className="text-center">
                  <div className="text-xl font-bold text-gradient">{stats.average_rating.toFixed(1)}/5</div>
                  <div className="text-xs text-muted-foreground">Note moyenne</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gradient">{Math.round((stats.average_rating / 5) * 100)}%</div>
                  <div className="text-xs text-muted-foreground">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gradient">{stats.total_reviews}</div>
                  <div className="text-xs text-muted-foreground">Avis verifies</div>
                </div>
              </motion.div>
            )}

            {/* Review cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {isLoadingFeedbacks ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary" />
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
                      {...fadeUp(i * 0.05)}
                      className="testimonial-card relative flex flex-col justify-between rounded-xl p-4"
                    >
                      <div className="pointer-events-none absolute right-3 top-2 font-serif text-4xl leading-none text-primary/10 select-none">
                        &ldquo;
                      </div>

                      <div>
                        <RatingStars rating={item.rating} editable={false} size="sm" />
                        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
                          {item.comments || 'Analyse claire, recommandations precises et progression visible des les premieres sessions.'}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
                        {item.user_profile?.avatar_url ? (
                          <AvatarCustom
                            src={item.user_profile.avatar_url}
                            name={name}
                            size="sm"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white',
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
                            Avis verifie
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-xl card-elevated px-5 py-8 text-center text-sm text-muted-foreground">
                  Les premiers avis apparaitront ici.
                </div>
              )}
            </div>

            {feedbacks.length > 0 && (
              <motion.div {...fadeUp(0.15)} className="mt-5 flex items-center justify-center gap-3">
                <Link
                  href="/public-feedback"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 rounded-lg')}
                >
                  Voir tous les avis
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {token && (
                  <Link
                    href="/settings?tab=feedback"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'rounded-lg')}
                  >
                    Donner mon avis
                  </Link>
                )}
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <motion.div 
              {...fadeUp(0)}
              className="cta-gradient rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12"
            >
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Votre prochaine prise de parole commence ici.
              </h2>
              
              <p className="mt-3 text-sm text-white/80 max-w-lg mx-auto">
                Lancez une session, obtenez un feedback precis et appliquez une action concrete des aujourd&apos;hui.
              </p>
              
              <div className="mt-6">
                <Link 
                  href={isAuthenticated ? '/studio' : '/register'} 
                  className={cn(
                    buttonVariants({ size: 'default' }), 
                    'rounded-lg bg-white text-primary hover:bg-white/95 px-6 font-semibold'
                  )}
                >
                  {isAuthenticated ? 'Ouvrir le studio' : 'Creer un compte gratuit'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer-clean">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
              <Mic className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold">SpeechCoach</div>
              <div className="text-xs text-muted-foreground">Coaching oral par IA</div>
            </div>
          </Link>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="#produit" className="transition-colors duration-200 hover:text-foreground">Produit</Link>
            <Link href="#process" className="transition-colors duration-200 hover:text-foreground">Methode</Link>
            <Link href="#resultats" className="transition-colors duration-200 hover:text-foreground">Resultats</Link>
            <Link href="#testimonials" className="transition-colors duration-200 hover:text-foreground">Avis</Link>
            <span className="text-muted-foreground/60">2025 SpeechCoach</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
