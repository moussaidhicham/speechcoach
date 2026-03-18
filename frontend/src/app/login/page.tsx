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

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.append('username', data.email);
      params.append('password', data.password);
      
      const { access_token } = await authService.login(params);
      
      // Get user data (simple placeholder for now since backend /authenticated-route is minimal)
      login(access_token, { id: 'temp', email: data.email });
      toast.success('Bon retour parmi nous !');
    } catch (error: any) {
      console.error(error);
      toast.error('Identifiants invalides ou erreur serveur.');
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
                    <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
                    <CardDescription>
                        Ravi de vous revoir. Connectez-vous pour continuer vos progrès.
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
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Link href="#" className="text-xs text-primary hover:underline">Mot de passe oublié ?</Link>
                            </div>
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
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button className="w-full h-11 font-semibold group" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Se connecter"}
                            {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground font-medium">
                            Nouveau ici ?{" "}
                            <Link href="/register" className="text-primary hover:underline underline-offset-4">
                                Créer un compte
                            </Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </motion.div>
    </div>
  );
}
