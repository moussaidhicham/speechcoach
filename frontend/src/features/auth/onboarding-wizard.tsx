'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface OnboardingWizardProps {
  onComplete: (profile: UserProfile) => void;
}

interface OnboardingFormState {
  full_name:          string;
  preferred_language: string;
  experience_level:   string;
  current_goal:       string;
}

/* ─── Data ───────────────────────────────────────────────────────────── */

const steps = [
  {
    title:       'Commençons par votre profil',
    description: 'Quelques informations suffisent pour personnaliser les analyses et les recommandations.',
  },
  {
    title:       'Cadre de travail',
    description: 'Choisissez la langue et le contexte principal de vos prises de parole.',
  },
  {
    title:       'Vous êtes prêt',
    description: 'Le tableau de bord pourra maintenant proposer des conseils plus utiles dès la première session.',
  },
] as const;

const languageLabel: Record<string, string> = {
  fr: 'Français', en: 'English', ar: 'Arabe',
};

/* ─── Wizard ─────────────────────────────────────────────────────────── */

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step,      setStep]      = React.useState(0);
  const [isSaving,  setIsSaving]  = React.useState(false);
  const [formState, setFormState] = React.useState<OnboardingFormState>({
    full_name:          '',
    preferred_language: 'fr',
    experience_level:   'Beginner',
    current_goal:       'General',
  });

  const updateField = <K extends keyof OnboardingFormState>(
    key: K, value: OnboardingFormState[K]
  ) => setFormState((s) => ({ ...s, [key]: value }));

  const canContinue = step === 0 ? formState.full_name.trim().length > 1 : true;

  const handleNext = () => {
    if (!canContinue) { toast.error('Ajoutez votre nom pour continuer.'); return; }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!formState.full_name.trim()) {
      toast.error('Ajoutez votre nom pour terminer la configuration.');
      return;
    }
    setIsSaving(true);
    try {
      const profile = await authService.updateProfile(formState);
      onComplete(profile);
    } catch (err) {
      console.error('Failed to save onboarding profile:', err);
      toast.error("Impossible d'enregistrer votre profil pour le moment.");
    } finally { setIsSaving(false); }
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
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.98,  y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl"
      >
        <Card className="overflow-hidden">
          {/* Progress track */}
          <div className="h-1 w-full bg-border/40">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <CardContent className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">

            {/* Left: sidebar */}
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
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

              <h2 className="font-display text-2xl font-medium leading-snug">
                {steps[step].title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {steps[step].description}
              </p>

              {/* Step list */}
              <div className="mt-7 space-y-2">
                {steps.map((s, i) => (
                  <div
                    key={s.title}
                    className={[
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                      i === step
                        ? 'border-primary/25 bg-primary/8 text-foreground font-medium'
                        : i < step
                          ? 'border-border/60 bg-secondary/50 text-muted-foreground'
                          : 'border-border/50 bg-background/60 text-muted-foreground',
                    ].join(' ')}
                  >
                    {i < step ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground/60">0{i + 1}</span>
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
                    animate={{ opacity: 1, x: 0  }}
                    exit={{    opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-5"
                  >
                    {/* Step 0: name + level */}
                    {step === 0 && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-name">Nom complet</Label>
                          <Input
                            id="wizard-name"
                            autoFocus
                            value={formState.full_name}
                            onChange={(e) => updateField('full_name', e.target.value)}
                            placeholder="Ex : Sara El Idrissi"
                          />
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Ce nom sera utilisé dans votre tableau de bord et dans vos rapports.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-experience">Niveau actuel</Label>
                          <Select
                            value={formState.experience_level}
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
                      </>
                    )}

                    {/* Step 1: language + goal */}
                    {step === 1 && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-language">Langue principale</Label>
                          <Select
                            value={formState.preferred_language}
                            onValueChange={(v) => updateField('preferred_language', v)}
                          >
                            <SelectTrigger id="wizard-language">
                              <SelectValue placeholder="Choisir une langue" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fr">Français</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="ar">Arabe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="wizard-goal">Objectif principal</Label>
                          <Select
                            value={formState.current_goal}
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

                    {/* Step 2: confirmation */}
                    {step === 2 && (
                      <>
                        <div className="rounded-2xl border border-border/60 bg-card p-6">
                          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <h3 className="font-display text-xl font-medium">
                            Votre espace est configuré.
                          </h3>
                          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                            Ces informations permettront d'ajuster les écrans, les conseils
                            et vos prochaines analyses.
                          </p>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {[
                            ['Nom',      formState.full_name],
                            ['Langue',   languageLabel[formState.preferred_language] || formState.preferred_language],
                            ['Niveau',   formState.experience_level],
                            ['Objectif', formState.current_goal],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3.5">
                              <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                                {label}
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-foreground">{value}</div>
                            </div>
                          ))}
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
                      Enregistrement…
                    </>
                  ) : step === steps.length - 1 ? (
                    'Ouvrir mon dashboard'
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