'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, ArrowRight, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth.service';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Lien securise',
    description: 'Le lien recu vous permet de definir un nouveau mot de passe sans toucher au reste du compte.',
  },
  {
    icon: Mail,
    title: 'Etape rapide',
    description: 'Entrez votre email, ouvrez le message recu, puis revenez terminer la mise a jour.',
  },
  {
    icon: Sparkles,
    title: 'Retour simple',
    description: 'Une fois le mot de passe change, vous retrouvez directement votre espace et vos analyses.',
  },
];

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: ForgotPasswordValues) {
    setIsSubmitting(true);
    try {
      await authService.requestPasswordReset(data.email);
      setIsSuccess(true);
      toast.success('Lien de reinitialisation envoye.');
    } catch {
      toast.error('Une erreur est survenue. Veuillez reessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      badge="Recuperation"
      title="Retrouver l'acces a votre compte sans friction."
      subtitle="Indiquez votre email pour recevoir un lien de reinitialisation. Le reste se fait en quelques etapes simples."
      highlights={highlights}
      footer={
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Si vous ne recevez rien, pensez a verifier les spams ou a recommencer avec l'adresse exacte de votre compte.
        </div>
      }
    >
      {!isSuccess ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Retour a la connexion
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Mot de passe oublie ?</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Entrez l'email associe a votre compte. Nous vous enverrons un lien pour definir un nouveau mot de passe.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="nom@exemple.com"
                  className="h-11 rounded-2xl border-border/60 bg-background/60 pl-10"
                  {...form.register('email')}
                />
              </div>
              {form.formState.errors.email ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-sm leading-6 text-muted-foreground">
              Nous envoyons uniquement le lien de reinitialisation. Aucun changement n'est applique tant que vous ne choisissez pas un nouveau mot de passe.
            </div>

            <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-2xl text-base font-semibold shadow-lg shadow-primary/15">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  Envoyer le lien
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10 text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Verification de votre boite mail</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Un lien de reinitialisation a ete envoye a <span className="font-semibold text-foreground">{form.getValues().email}</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-secondary/25 p-4 text-left text-sm leading-6 text-muted-foreground">
            Ouvrez ce lien depuis votre email pour definir un nouveau mot de passe, puis revenez vous connecter.
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="h-11 w-full rounded-2xl" onClick={() => setIsSuccess(false)}>
              Renvoyer un email
            </Button>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'ghost' }), 'h-11 w-full rounded-2xl')}
            >
              Retour a la connexion
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  );
}
