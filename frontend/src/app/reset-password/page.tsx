'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth.service';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, '8 caracteres minimum'),
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Mise a jour securisee',
    description: 'Le nouveau mot de passe remplace l’ancien sans toucher a vos autres donnees.',
  },
  {
    icon: Sparkles,
    title: 'Retour rapide',
    description: 'Une fois valide, vous pourrez vous reconnecter immediatement avec le nouveau mot de passe.',
  },
  {
    icon: Lock,
    title: 'Mot de passe plus solide',
    description: 'Le verifier maintenant evite de relancer la procedure plus tard.',
  },
];

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: 'Vide', color: 'bg-border', width: '0%' };
  if (score <= 1) return { label: 'Faible', color: 'bg-destructive', width: '30%' };
  if (score <= 3) return { label: 'Moyen', color: 'bg-amber-500', width: '68%' };
  return { label: 'Fort', color: 'bg-emerald-500', width: '100%' };
}

function passwordRequirements(password: string) {
  return [
    { label: '8 caracteres minimum', met: password.length >= 8 },
    { label: 'Majuscule et minuscule', met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'Au moins un chiffre', met: /\d/.test(password) },
    { label: 'Un caractere special', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordClient />
    </React.Suspense>
  );
}

function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  });

  const watchedPassword = form.watch('password');
  const watchedConfirm = form.watch('confirmPassword');
  const strength = passwordStrength(watchedPassword);
  const requirements = passwordRequirements(watchedPassword);
  const hasTypedConfirm = watchedConfirm.length > 0;
  const isMatching = watchedPassword && watchedConfirm && watchedPassword === watchedConfirm;
  const showPasswordGuidance = watchedPassword.length > 0;

  async function onSubmit(data: ResetPasswordValues) {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await authService.resetPassword(data.password, token);
      toast.success('Mot de passe mis a jour avec succes.');
      router.push('/login');
    } catch {
      toast.error('Erreur lors de la reinitialisation. Le lien a peut-etre expire.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        badge="Lien invalide"
        title="Le lien de reinitialisation n'est plus utilisable."
        subtitle="Le lien est manquant ou a expire. Le plus simple est de relancer la procedure depuis la page de connexion."
        highlights={highlights}
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-destructive/10 text-destructive">
            <X className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Lien invalide</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Demandez un nouveau lien de reinitialisation pour continuer.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className={cn(buttonVariants({ variant: 'default' }), 'h-11 w-full rounded-2xl text-sm font-semibold')}
            >
              Demander un nouveau lien
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 w-full rounded-2xl')}
            >
              Retour a la connexion
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Nouveau mot de passe"
      title="Finalisez la recuperation en un dernier ecran."
      subtitle="Choisissez un mot de passe robuste puis reconnectez-vous avec ce nouveau acces."
      highlights={highlights}
      footer={
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Si le lien a expire pendant la procedure, il faudra simplement relancer la demande de reinitialisation.
        </div>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Derniere etape</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Definir un nouveau mot de passe</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Utilisez un mot de passe robuste que vous pourrez retrouver facilement.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                className="h-11 rounded-2xl border-border/60 bg-background/60 pr-10"
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {showPasswordGuidance ? (
              <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Solidite</span>
                  <span className="font-semibold text-foreground">{strength.label}</span>
                </div>
                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
                  <motion.div initial={{ width: 0 }} animate={{ width: strength.width }} className={cn('h-full transition-colors duration-500', strength.color)} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {requirements.map((requirement) => (
                    <div key={requirement.label} className="flex items-center gap-2 text-xs">
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border',
                          requirement.met ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground/40',
                        )}
                      >
                        {requirement.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      </div>
                      <span className={cn(requirement.met ? 'text-foreground' : 'text-muted-foreground')}>{requirement.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                Utilisez au moins 8 caracteres avec une majuscule, un chiffre et un caractere special.
              </p>
            )}

            {form.formState.errors.password ? (
              <p className="text-xs font-medium text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="confirmPassword">Confirmation</Label>
              <AnimatePresence>
                {hasTypedConfirm ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      isMatching ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {isMatching ? 'Correspond' : 'A verifier'}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="********"
                className={cn('h-11 rounded-2xl border-border/60 bg-background/60 pr-10', hasTypedConfirm && !isMatching ? 'border-destructive/50' : '')}
                {...form.register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword ? (
              <p className="text-xs font-medium text-destructive">{form.formState.errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/15">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise a jour...
              </>
            ) : (
              <>
                Mettre a jour le mot de passe
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
