'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle2, RefreshCw, SkipForward, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarCustom } from '@/components/ui/avatar-custom';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';

/* Types */

interface EnhancedOnboardingWizardProps {
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

interface OnboardingFormState {
  full_name?: string | null;
  preferred_language?: string | null;
  preferred_device_type?: 'auto' | 'unknown' | 'laptop_desktop' | 'tablet' | 'smartphone' | null;
  experience_level?: string | null;
  current_goal?: string | null;
  weak_points?: string | null;
  avatar_url?: string | null;
  avatar_offset_y?: number | null;
  avatar_scale?: number | null;
}

/* Data */

const steps = [
  {
    id: 'profile',
    title: 'Votre profil',
    description: 'Commençons par vous connaître un peu mieux.',
    icon: Sparkles,
  },
  {
    id: 'avatar',
    title: 'Photo de profil',
    description: 'Ajoutez une photo pour personnaliser votre espace.',
    icon: Camera,
  },
  {
    id: 'experience',
    title: 'Vos priorites',
    description: 'Indiquez les axes sur lesquels vous voulez progresser en premier.',
    icon: Sparkles,
  },
  {
    id: 'preferences',
    title: 'Vos preferences',
    description: 'Reglez la langue des videos et l\'appareil principal.',
    icon: Sparkles,
  },
  {
    id: 'confirmation',
    title: 'Tout est prêt',
    description: 'Votre espace est configuré et prêt à vous accueillir.',
    icon: CheckCircle2,
  },
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

/* Wizard */

export function EnhancedOnboardingWizard({ onComplete, onSkip }: EnhancedOnboardingWizardProps) {
  const [step, setStep] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedWeakPoints, setSelectedWeakPoints] = React.useState<string[]>([]);
  const [otherWeakPoint, setOtherWeakPoint] = React.useState('');
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = React.useState<string | null>(null);
  
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

  const updateField = <K extends keyof OnboardingFormState>(
    key: K, value: OnboardingFormState[K]
  ) => setFormState((s) => ({ ...s, [key]: value }));

  const toggleWeakPoint = (point: string) => {
    setSelectedWeakPoints((prev) =>
      prev.includes(point)
        ? prev.filter((p) => p !== point)
        : [...prev, point]
    );
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image.');
      return;
    }
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleAvatarRemove = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
  };

  const canContinue = React.useMemo(() => {
    switch (step) {
      case 0:
        return (formState.full_name || '').trim().length > 1;
      case 1:
        return true; // Avatar is optional
      case 2:
        return true; // Experience is optional
      case 3:
        return true; // Preferences are optional
      case 4:
        return true; // Confirmation
      default:
        return false;
    }
  }, [step, formState]);

  const handleNext = () => {
    if (!canContinue) {
      toast.error('Veuillez remplir les champs requis.');
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSkip = () => {
    if (window.confirm('Voulez-vous vraiment passer cette configuration ? Vous pourrez la compléter plus tard dans les paramètres.')) {
      onSkip();
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const weakPointsText = [
        ...selectedWeakPoints.filter((p) => p !== 'Autre'),
        otherWeakPoint,
      ]
        .filter(Boolean)
        .join(', ');

      const profileData: Partial<UserProfile> = {
        full_name: formState.full_name,
        preferred_language: formState.preferred_language,
        preferred_device_type: formState.preferred_device_type,
        experience_level: formState.experience_level,
        current_goal: formState.current_goal,
        weak_points: weakPointsText || null,
      };

      if (pendingAvatarFile) {
        const formData = new FormData();
        formData.append('file', pendingAvatarFile);
        const res = await authService.updateProfile({
          avatar_offset_y: formState.avatar_offset_y,
          avatar_scale: formState.avatar_scale,
        });
        
        // Upload avatar
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
      }

      const profile = await authService.updateProfile(profileData);
      onComplete(profile);
    } catch (err) {
      console.error('Failed to save onboarding profile:', err);
      toast.error("Impossible d'enregistrer votre profil pour le moment.");
    } finally {
      setIsSaving(false);
    }
  };

  const progressPct = ((step + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-4xl"
      >
        <Card className="overflow-hidden">
          {/* Header */}
          <div className="border-b border-border/60 bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Configuration initiale
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    Étape {step + 1} sur {steps.length}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Passer
              </Button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>

          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Left: sidebar */}
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-medium leading-snug">
                  {steps[step].title}
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {steps[step].description}
                </p>
              </div>

              {/* Step indicators */}
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div
                    key={s.id}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all',
                      i === step
                        ? 'border-primary/25 bg-primary/8 text-foreground font-medium'
                        : i < step
                          ? 'border-border/60 bg-secondary/50 text-muted-foreground'
                          : 'border-border/50 bg-background/60 text-muted-foreground',
                    ].join(' ')}
                  >
                    {i < step ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground/60">
                        0{i + 1}
                      </span>
                    )}
                    {s.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: step content */}
            <div className="flex flex-col">
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-5"
                  >
                    {/* Step 0: Profile */}
                    {step === 0 && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-name">
                            Nom complet <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="wizard-name"
                            autoFocus
                            value={formState.full_name || ''}
                            onChange={(e) => updateField('full_name', e.target.value)}
                            placeholder="Ex : Sara El Idrissi"
                          />
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Ce nom sera utilisé dans votre tableau de bord et vos rapports.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-experience">Niveau actuel</Label>
                          <Select
                            value={formState.experience_level ?? undefined}
                            onValueChange={(v) => updateField('experience_level', v)}
                          >
                            <SelectTrigger id="wizard-experience">
                              <SelectValue placeholder="Choisir un niveau" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Débutant</SelectItem>
                              <SelectItem value="Intermediate">Intermédiaire</SelectItem>
                              <SelectItem value="Advanced">Avancé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-goal">Objectif principal</Label>
                          <Select
                            value={formState.current_goal ?? undefined}
                            onValueChange={(v) => updateField('current_goal', v)}
                          >
                            <SelectTrigger id="wizard-goal">
                              <SelectValue placeholder="Choisir un objectif" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Interview">Entretien</SelectItem>
                              <SelectItem value="PFE">Soutenance PFE</SelectItem>
                              <SelectItem value="Pitch">Pitch</SelectItem>
                              <SelectItem value="General">Progression générale</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {/* Step 1: Avatar */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Photo de profil</Label>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Optionnel - Ajoutez une photo pour personnaliser votre expérience.
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <AvatarCustom
                            src={pendingAvatarPreview || formState.avatar_url || undefined}
                            size="xl"
                            className="h-24 w-24"
                          />
                          
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarSelect}
                              className="hidden"
                              id="avatar-upload"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => document.getElementById('avatar-upload')?.click()}
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Choisir une photo
                            </Button>
                            
                            {pendingAvatarPreview && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleAvatarRemove}
                                className="text-destructive hover:text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Supprimer
                              </Button>
                            )}
                          </div>
                        </div>

                        {pendingAvatarPreview && (
                          <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                              Photo sélectionnée. Elle sera appliquée après la confirmation.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Experience details */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>Points à améliorer</Label>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Sélectionnez les domaines sur lesquels vous souhaitez travailler.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {weakPointOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleWeakPoint(option)}
                              className={[
                                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                                selectedWeakPoints.includes(option)
                                  ? 'border-primary bg-primary/8 text-foreground'
                                  : 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-secondary/40',
                              ].join(' ')}
                            >
                              <div className={[
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                selectedWeakPoints.includes(option)
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background',
                              ].join(' ')}>
                                {selectedWeakPoints.includes(option) && (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </div>
                              {option}
                            </button>
                          ))}
                        </div>

                        {selectedWeakPoints.includes('Autre') && (
                          <div className="space-y-1.5">
                            <Label htmlFor="other-weak-point">Précisez</Label>
                            <Input
                              id="other-weak-point"
                              value={otherWeakPoint}
                              onChange={(e) => setOtherWeakPoint(e.target.value)}
                              placeholder="Décrivez votre point à améliorer..."
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3: Preferences */}
                    {step === 3 && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-language">Langue principale des vidéos</Label>
                          <Select
                            value={formState.preferred_language ?? undefined}
                            onValueChange={(v) => updateField('preferred_language', v)}
                          >
                            <SelectTrigger id="wizard-language">
                              <SelectValue placeholder="Choisir une langue" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="fr">Français</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="ar">Arabe</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Ce réglage correspond à la langue parlée dans vos vidéos. Le choisir manuellement évite la détection automatique et accélère l'analyse.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-device">Appareil principal</Label>
                          <Select
                            value={formState.preferred_device_type ?? undefined}
                            onValueChange={(v) => updateField('preferred_device_type', v as any)}
                          >
                            <SelectTrigger id="wizard-device">
                              <SelectValue placeholder="Choisir un appareil" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto-détection</SelectItem>
                              <SelectItem value="laptop_desktop">Ordinateur portable</SelectItem>
                              <SelectItem value="tablet">Tablette</SelectItem>
                              <SelectItem value="smartphone">Smartphone</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Si vous utilisez presque toujours le même appareil, ce choix deviendra la valeur par défaut dans le Studio. Vous pourrez toujours le modifier pour une vidéo précise.
                          </p>
                        </div>
                      </>
                    )}

                    {/* Step 4: Confirmation */}
                    {step === 4 && (
                      <>
                        <div className="rounded-2xl border border-border/60 bg-card p-6">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <h3 className="font-display text-xl font-medium">
                            Votre espace est configuré !
                          </h3>
                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                            Ces informations permettront de personnaliser vos analyses,
                            vos conseils et votre expérience globale.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {formState.full_name && (
                            <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Nom
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">
                                {formState.full_name}
                              </div>
                            </div>
                          )}
                          {formState.preferred_language && (
                            <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Langue
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">
                                {languageLabel[formState.preferred_language] || formState.preferred_language}
                              </div>
                            </div>
                          )}
                          {formState.experience_level && (
                            <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Niveau
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">
                                {formState.experience_level}
                              </div>
                            </div>
                          )}
                          {formState.current_goal && (
                            <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Objectif
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">
                                {formState.current_goal}
                              </div>
                            </div>
                          )}
                          {selectedWeakPoints.length > 0 && (
                            <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5 sm:col-span-2">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                Points à améliorer
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">
                                {selectedWeakPoints.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {step > 0 && (
                  <Button variant="outline" className="sm:flex-1" onClick={handleBack}>
                    Retour
                  </Button>
                )}
                <Button
                  className="sm:flex-1"
                  onClick={step === steps.length - 1 ? handleSubmit : handleNext}
                  disabled={isSaving || !canContinue}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Enregistrement...
                    </>
                  ) : step === steps.length - 1 ? (
                    'Commencer'
                  ) : (
                    'Continuer'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}




