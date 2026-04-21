'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Briefcase,
  Mic,
  RefreshCw,
  Save,
  SkipForward,
  Sparkles,
  Star,
  Target,
  User,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { AvatarCustom } from '@/components/ui/avatar-custom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';

type DeviceType = 'auto' | 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone' | null;

interface OnboardingFormState {
  full_name?: string | null;
  preferred_language?: string | null;
  preferred_device_type?: DeviceType;
  experience_level?: string | null;
  current_goal?: string | null;
  weak_points?: string | null;
  avatar_url?: string | null;
  avatar_offset_y?: number | null;
  avatar_scale?: number | null;
}

const steps = [
  { id: 'profile', title: 'Profil', description: "Votre identite dans l'espace.", icon: User },
  { id: 'avatar', title: 'Photo', description: 'Optionnelle, mais utile.', icon: Camera },
  { id: 'experience', title: 'Niveau', description: 'Pour ajuster le coaching.', icon: Star },
  { id: 'preferences', title: 'Preferences', description: 'Pour aller plus vite au studio.', icon: WandSparkles },
  { id: 'weakpoints', title: 'Points a ameliorer', description: 'Pour personnaliser votre coaching.', icon: Target },
  { id: 'done', title: 'Recapitulatif', description: 'Derniere verification.', icon: CheckCircle2 },
] as const;

const experienceOptions = [
  { id: 'Beginner', label: 'Debutant', description: 'Vous consolidez surtout les bases.', icon: Zap },
  { id: 'Intermediate', label: 'Intermediaire', description: 'Vous prenez deja la parole regulierement.', icon: Star },
  { id: 'Advanced', label: 'Avance', description: 'Vous cherchez surtout a affiner.', icon: Sparkles },
];

const goalOptions = [
  { id: 'Interview', label: 'Entretien', icon: Briefcase },
  { id: 'PFE', label: 'Soutenance PFE', icon: GraduationCap },
  { id: 'Pitch', label: 'Pitch', icon: Target },
  { id: 'General', label: 'General', icon: Sparkles },
] as const;

const weakPointOptions = [
  'Confiance et aisance',
  'Gestion du temps',
  'Fluidite et mots de remplissage',
  'Structure et clarte du discours',
  'Regard, posture et gestuelle',
  'Voix, debit et articulation',
  'Autre',
];

function ChoiceCard({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all',
        selected ? 'border-primary bg-primary/10 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.5)] ring-2 ring-primary/20' : 'border-border/60 bg-background hover:border-primary/40 hover:bg-secondary/30',
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all', selected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground')}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', selected ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
          {selected ? <CheckCircle2 className="h-5 w-5 text-emerald-500 drop-shadow-lg" /> : null}
        </div>
        <p className={cn('text-sm leading-6', selected ? 'text-foreground' : 'text-muted-foreground')}>{description}</p>
      </div>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { token, isLoading } = useAuth();
  const [step, setStep] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = React.useState<string | null>(null);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<OnboardingFormState>({
    full_name: '',
    preferred_language: 'auto',
    preferred_device_type: 'auto',
    experience_level: 'Beginner',
    current_goal: 'General',
    weak_points: '',
    avatar_url: null,
    avatar_offset_y: 50,
    avatar_scale: 1,
  });
  const [customWeakPoint, setCustomWeakPoint] = React.useState('');

  React.useEffect(() => {
    if (!isLoading && !token) router.push('/login');
  }, [isLoading, token, router]);

  React.useEffect(() => {
    const allPoints = formState.weak_points?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const customValue = allPoints.find(p => p.trim() && !weakPointOptions.includes(p.trim())) || '';
    setCustomWeakPoint(customValue);
  }, [formState.weak_points]);

  const updateField = <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const canContinue = step !== 0 || (formState.full_name || '').trim().length > 1;
  const progressValue = ((step + 1) / steps.length) * 100;
  const handleNext = () => setStep((current) => Math.min(current + 1, steps.length - 1));

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez selectionner une image.');
      return;
    }
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setFormState((current) => ({ ...current, avatar_offset_y: 50, avatar_scale: 1 }));
    setIsAvatarEditorOpen(true);
    event.target.value = '';
  };

  const handleAvatarCancel = () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setIsAvatarEditorOpen(false);
  };

  const handleAvatarApply = () => {
    setIsAvatarEditorOpen(false);
  };

  const handleAvatarRemove = () => {
    if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setIsAvatarEditorOpen(false);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const profileData: Partial<UserProfile> = {
        full_name: formState.full_name,
        preferred_language: formState.preferred_language,
        preferred_device_type: formState.preferred_device_type,
        experience_level: formState.experience_level,
        current_goal: formState.current_goal,
        weak_points: formState.weak_points,
      };

      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append('file', pendingAvatarFile);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        });
      }

      await authService.updateProfile(profileData);
      toast.success(`Bienvenue, ${formState.full_name?.split(' ')[0] || 'coach'} !`);
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error("Impossible d'enregistrer votre profil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(28,100,242,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_24%),hsl(var(--background))]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-2">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Mic className="h-5 w-5" />
            </span>
            SpeechCoach
          </Link>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="rounded-full">
            <SkipForward className="mr-2 h-4 w-4" />
            Plus tard
          </Button>
        </header>

        <main className="flex flex-1 items-center py-6">
          <div className="grid w-full gap-6 xl:grid-cols-[280px_1fr]">
            <aside className="hidden rounded-[28px] border border-border/60 bg-background/88 p-6 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] xl:flex xl:flex-col xl:justify-between">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-primary">Onboarding</p>
                  <h1 className="text-2xl font-semibold tracking-tight">Un espace plus simple des le debut</h1>
                  <p className="text-sm leading-6 text-muted-foreground">Quelques reglages rapides pour rendre le studio et les analyses plus pertinents des la premiere session.</p>
                </div>
                <div className="space-y-2">
                  {steps.map((item, index) => {
                    const isActive = index === step;
                    const isDone = index < step;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start gap-3 rounded-xl border p-3 transition-all',
                          isActive
                            ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/30'
                            : isDone
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border/60 bg-background opacity-60 hover:opacity-100',
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all',
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                              : isDone
                              ? 'bg-emerald-500 text-emerald-50'
                              : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <span className="text-sm font-bold">{index + 1}</span> : <item.icon className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm font-semibold truncate',
                              isActive ? 'text-foreground' : isDone ? 'text-emerald-700' : 'text-muted-foreground',
                            )}
                          >
                            {item.title}
                          </p>
                          <p
                            className={cn(
                              'text-xs leading-4 truncate',
                              isActive ? 'text-foreground' : isDone ? 'text-emerald-600/80' : 'text-muted-foreground',
                            )}
                          >
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                Tout cela reste modifiable plus tard dans les parametres.
              </div>
            </aside>

            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden rounded-[28px] border border-border/60 bg-background/92 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]">
              <div className="border-b border-border/60 px-5 py-5 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-primary">Etape {step + 1}</p>
                    <h2 className="text-2xl font-semibold tracking-tight">{steps[step].title}</h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{steps[step].description}</p>
                  </div>
                  <div className="min-w-[70px] text-right">
                    <p className="text-sm font-semibold text-foreground">{step + 1}/{steps.length}</p>
                    <p className="text-xs text-muted-foreground">progression</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <Progress value={progressValue} />
                  <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
                    {steps.map((item, index) => (
                      <div key={item.id} className={cn('rounded-full border px-3 py-1 text-xs font-medium', index === step ? 'border-primary bg-primary/8 text-primary' : 'border-border/60 text-muted-foreground')}>
                        {item.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-6 sm:px-8 sm:py-7">
                <AnimatePresence mode="wait">
                  <motion.div key={steps[step].id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="space-y-6">
                    {step === 0 ? (
                      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label htmlFor="full_name">Nom complet</Label>
                            <Input id="full_name" placeholder="Ex. Hicham Moussaid" className="h-11 rounded-2xl border-border/60 bg-background/60" value={formState.full_name || ''} onChange={(event) => updateField('full_name', event.target.value)} />
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                            Ce nom sera utilise dans votre espace et dans vos rapports.
                          </div>
                        </div>
                        <div className="rounded-[24px] border border-border/60 bg-[linear-gradient(160deg,rgba(28,100,242,0.08),rgba(255,255,255,0)_50%)] p-5">
                          <p className="text-sm font-semibold text-foreground">Ce que vous preparez ici</p>
                          <div className="mt-4 space-y-3">
                            {['Un espace deja personnalise.', 'Des reglages prets avant le studio.', 'Un parcours plus clair des la premiere analyse.'].map((item) => (
                              <div key={item} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 1 ? (
                      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-secondary/15 p-6 text-center">
                          <AvatarCustom src={pendingAvatarPreview || formState.avatar_url || undefined} size="xl" className="h-32 w-32 ring-4 ring-primary/10" />
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-semibold text-foreground">{pendingAvatarPreview ? 'Nouvelle photo selectionnee' : 'Aucune photo pour le moment'}</p>
                            <p className="text-sm leading-6 text-muted-foreground">Cette etape est optionnelle.</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-border/60 bg-background p-5">
                            <p className="text-sm font-semibold text-foreground">Ajouter ou remplacer la photo</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Apres la selection, vous pourrez ajuster rapidement le cadrage.</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Button variant="outline" className="rounded-2xl" onClick={() => document.getElementById('avatar-upload')?.click()}>
                                <Camera className="mr-2 h-4 w-4" />
                                {pendingAvatarPreview ? 'Changer la photo' : 'Choisir une photo'}
                              </Button>
                              {pendingAvatarPreview ? <Button variant="ghost" className="rounded-2xl" onClick={handleAvatarRemove}>Supprimer</Button> : null}
                            </div>
                            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                            Vous pourrez toujours ajouter ou modifier cette photo plus tard.
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 2 ? (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Niveau actuel</Label>
                          <div className="grid gap-3 md:grid-cols-3">
                            {experienceOptions.map((option) => (
                              <ChoiceCard key={option.id} label={option.label} description={option.description} icon={option.icon} selected={formState.experience_level === option.id} onClick={() => updateField('experience_level', option.id)} />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Objectif principal</Label>
                          <div className="grid gap-3 md:grid-cols-2">
                            {goalOptions.map((option) => (
                              <ChoiceCard key={option.id} label={option.label} description="Servira de contexte pour prioriser les analyses." icon={option.icon} selected={formState.current_goal === option.id} onClick={() => updateField('current_goal', option.id)} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === 3 ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="language">Langue des videos</Label>
                            <Select value={formState.preferred_language || 'auto'} onValueChange={(value) => updateField('preferred_language', value)}>
                              <SelectTrigger id="language" className="h-11 rounded-2xl border-border/60 bg-background/60"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Detection automatique</SelectItem>
                                <SelectItem value="fr">Francais</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="ar">Arabe</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs leading-5 text-muted-foreground">Choisir une langue a l'avance peut accelerer l'analyse.</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="device">Appareil principal</Label>
                            <Select value={formState.preferred_device_type || 'auto'} onValueChange={(value) => updateField('preferred_device_type', value as DeviceType)}>
                              <SelectTrigger id="device" className="h-11 rounded-2xl border-border/60 bg-background/60"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto-detection</SelectItem>
                                <SelectItem value="laptop_desktop">Ordinateur / Laptop</SelectItem>
                                <SelectItem value="tablet">Tablette</SelectItem>
                                <SelectItem value="smartphone">Smartphone</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs leading-5 text-muted-foreground">Ce choix preselectionnera le mode adapte dans le studio.</p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                          Vous pourrez ajuster tout cela apres vos premieres analyses si votre usage evolue.
                        </div>
                      </div>
                    ) : null}

                    {step === 4 ? (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <AlertTriangle className="h-4 w-4 text-primary" />
                            Points a ameliorer
                          </div>
                          <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
                            <div className="space-y-3">
                              <p className="text-sm leading-6 text-muted-foreground">
                                Selectionnez les domaines sur lesquels vous souhaitez travailler.
                              </p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {weakPointOptions.map((option) => {
                                  const isSelected = formState.weak_points?.split(',').map(s => s.trim()).filter(Boolean).includes(option);
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => {
                                        const current = formState.weak_points?.split(',').map(s => s.trim()).filter(Boolean) || [];
                                        const newSelection = isSelected
                                          ? current.filter((p) => p !== option)
                                          : [...current, option];
                                        updateField('weak_points', newSelection.join(', '));
                                      }}
                                      className={cn(
                                        'flex items-start gap-3 rounded-xl border p-3 text-left transition-all',
                                        isSelected ? 'border-primary bg-primary/10 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.5)] ring-2 ring-primary/20' : 'border-border/60 bg-background hover:border-primary/40 hover:bg-secondary/30'
                                      )}
                                    >
                                      <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg transition-all', isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground')}>
                                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow-lg" /> : null}
                                      </div>
                                      <span className={cn('text-sm leading-5 flex-1', isSelected ? 'text-foreground' : 'text-muted-foreground')}>{option}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {formState.weak_points?.split(',').map(s => s.trim()).filter(Boolean).includes('Autre') && (
                                <div className="mt-3">
                                  <Input
                                    type="text"
                                    placeholder="Precisez votre point a ameliorer..."
                                    value={customWeakPoint}
                                    onChange={(e) => {
                                      setCustomWeakPoint(e.target.value);
                                      const allPoints = formState.weak_points?.split(',').map(s => s.trim()).filter(Boolean) || [];
                                      const selectedOptions = allPoints.filter(p => weakPointOptions.includes(p));
                                      const customValue = e.target.value;
                                      if (customValue.trim()) {
                                        updateField('weak_points', [...selectedOptions, customValue].join(', '));
                                      } else {
                                        updateField('weak_points', selectedOptions.join(', '));
                                      }
                                    }}
                                    className="h-10 rounded-xl border-border/60 bg-background/60"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                          Ces informations aideront le coaching a se concentrer sur vos priorites.
                        </div>
                      </div>
                    ) : null}

                    {step === 5 ? (
                      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[24px] border border-border/60 bg-[linear-gradient(160deg,rgba(16,185,129,0.08),rgba(255,255,255,0)_50%)] p-6">
                          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>
                          <div className="mt-4 space-y-2">
                            <h3 className="text-2xl font-semibold tracking-tight">Votre espace est pret</h3>
                            <p className="text-sm leading-6 text-muted-foreground">Encore une validation et vous arrivez sur le tableau de bord avec un profil deja configure.</p>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <SummaryCard label="Nom" value={formState.full_name || 'Non renseigne'} />
                          <SummaryCard label="Niveau" value={formState.experience_level || 'Non renseigne'} />
                          <SummaryCard label="Objectif" value={formState.current_goal || 'Non renseigne'} />
                          <SummaryCard label="Langue" value={formState.preferred_language || 'auto'} />
                          <SummaryCard label="Points a ameliorer" value={formState.weak_points || 'Aucun'} />
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              <footer className="flex items-center justify-between border-t border-border/60 px-5 py-4 sm:px-8">
                <Button variant="ghost" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0} className={cn('rounded-2xl', step === 0 ? 'opacity-0' : '')}>
                  Precedent
                </Button>
                <Button onClick={step === steps.length - 1 ? handleSubmit : handleNext} disabled={isSaving || !canContinue} className="h-11 rounded-2xl px-6 text-sm font-semibold shadow-lg shadow-primary/15">
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : step === steps.length - 1 ? (
                    <>
                      Ouvrir mon espace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continuer
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </footer>
            </motion.section>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isAvatarEditorOpen && pendingAvatarPreview ? (
          <AvatarEditorModal
            preview={pendingAvatarPreview}
            name={formState.full_name}
            offsetY={formState.avatar_offset_y || 50}
            scale={formState.avatar_scale || 1}
            setOffsetY={(value) => setFormState((current) => ({ ...current, avatar_offset_y: value }))}
            setScale={(value) => setFormState((current) => ({ ...current, avatar_scale: value }))}
            onCancel={handleAvatarCancel}
            onApply={handleAvatarApply}
            isUploading={isSaving}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/15 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AvatarEditorModal({
  preview,
  name,
  offsetY,
  scale,
  setOffsetY,
  setScale,
  onCancel,
  onApply,
  isUploading,
}: {
  preview: string;
  name?: string | null;
  offsetY: number;
  scale: number;
  setOffsetY: (value: number) => void;
  setScale: (value: number) => void;
  onCancel: () => void;
  onApply: () => void;
  isUploading: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-[0_24px_70px_-36px_rgba(15,23,42,0.5)]">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Ajuster la photo</p>
            <p className="text-xs text-muted-foreground">Positionnez rapidement votre photo avant de la garder.</p>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-6 px-5 py-6">
          <div className="flex justify-center">
            <AvatarCustom src={preview} name={name} size="xl" imagePositionY={offsetY} imageScale={scale} className="h-32 w-32 ring-4 ring-primary/10" />
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <Label>Position verticale</Label>
                <span>{offsetY}%</span>
              </div>
              <input type="range" min="0" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="w-full accent-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <Label>Zoom</Label>
                <span>x{scale.toFixed(2)}</span>
              </div>
              <input type="range" min="1" max="2" step="0.01" value={scale} onChange={(event) => setScale(Number(event.target.value))} className="w-full accent-primary" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border/60 px-5 py-4">
          <Button variant="ghost" className="h-11 flex-1 rounded-2xl" onClick={onCancel}>
            Annuler
          </Button>
          <Button className="h-11 flex-1 rounded-2xl" onClick={onApply} disabled={isUploading}>
            {isUploading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Utiliser cette photo
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}


