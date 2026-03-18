'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/auth-context';

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true);
    try {
      // 1. Register User
      await authService.register({
        email: data.email,
        password: data.password,
      });

      // 2. Login User to get token
      const params = new URLSearchParams();
      params.append('username', data.email);
      params.append('password', data.password);
      
      const { access_token } = await authService.login(params);
      
      login(access_token, { id: 'temp', email: data.email });
      toast.success('Compte créé avec succès ! Bienvenue sur SpeechCoach.');
    } catch (error: any) {
      console.error(error);
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <div className="bg-primary p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Mic className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">SpeechCoach</span>
        </Link>
        
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.3 }}
           className="w-full max-w-md"
        >
            <Card className="shadow-xl border-none">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
                    <CardDescription>
                        Entrez vos informations pour commencer votre coaching IA.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="nom@exemple.com" 
                                {...form.register('email')}
                                className={form.formState.errors.email ? "border-destructive" : ""}
                            />
                            {form.formState.errors.email && (
                                <p className="text-xs text-destructive font-medium">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                {...form.register('password')}
                                className={form.formState.errors.password ? "border-destructive" : ""}
                            />
                            {form.formState.errors.password && (
                                <p className="text-xs text-destructive font-medium">{form.formState.errors.password.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password" 
                                {...form.register('confirmPassword')}
                                className={form.formState.errors.confirmPassword ? "border-destructive" : ""}
                            />
                            {form.formState.errors.confirmPassword && (
                                <p className="text-xs text-destructive font-medium">{form.formState.errors.confirmPassword.message}</p>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full h-11 font-semibold group" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "S'inscrire"}
                            {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground font-medium">
                            Déjà un compte ?{" "}
                            <Link href="/login" className="text-primary hover:underline underline-offset-4">
                                Se connecter
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </motion.div>
    </div>
  );
}
