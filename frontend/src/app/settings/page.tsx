'use client';

import React from 'react';
import {
  Camera,
  Globe,
  Lock,
  MessageCircle,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { AvatarCustom } from '@/components/ui/avatar-custom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';

/* ─── Types ──────────────────────────────────────────────────────────── */

interface UserFeedback {
  id:       string;
  rating:   number;
  comments: string | null;
}

interface ProfileSectionProps {
  profile:           UserProfile;
  setProfile:        React.Dispatch<React.SetStateAction<UserProfile | null>>;
  onSave:            () => Promise<void>;
  isSaving:          boolean;
  onAvatarUpload:    (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAvatarDelete:    () => Promise<void>;
  isUploadingAvatar: boolean;
}

interface SecuritySectionProps {
  userEmail?:      string;
  passwordData:    { current_password: string; new_password: string; confirm_password: string };
  setPasswordData: React.Dispatch<React.SetStateAction<{
    current_password: string; new_password: string; confirm_password: string;
  }>>;
  onSave:          () => Promise<void>;
  isSaving:        boolean;
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [profile,           setProfile]           = React.useState<UserProfile | null>(null);
  const [userFeedback,      setUserFeedback]      = React.useState<UserFeedback | null>(null);
  const [isLoading,         setIsLoading]         = React.useState(true);
  const [isError,           setIsError]           = React.useState(false);
  const [isSaving,          setIsSaving]          = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [passwordData,      setPasswordData]      = React.useState({
    current_password: '', new_password: '', confirm_password: '',
  });

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [profileData, feedbackData] = await Promise.all([
        authService.getProfile(),
        api.get('/feedback/platform/mine'),
      ]);
      setProfile(profileData);
      setUserFeedback(feedbackData.data?.[0] ?? null);
    } catch (err) {
      console.error('Failed to fetch settings data:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (token) fetchProfile().catch(() => undefined);
  }, [fetchProfile, token]);

  const handleProfileSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await authService.updateProfile(profile);
      setProfile(updated);
      toast.success('Profil mis à jour.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde.');
    } finally { setIsSaving(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    setIsUploadingAvatar(true);
    try {
      const res = await api.post('/user/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((p) => p ? { ...p, avatar_url: res.data.avatar_url } : p);
      toast.success('Photo de profil mise à jour.');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'image.");
    } finally { setIsUploadingAvatar(false); e.target.value = ''; }
  };

  const handleAvatarDelete = async () => {
    if (!profile?.avatar_url) return;
    setIsUploadingAvatar(true);
    try {
      await api.delete('/user/profile/avatar');
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
      toast.success('Photo de profil supprimée.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression.');
    } finally { setIsUploadingAvatar(false); }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsSaving(true);
    try {
      await api.patch('/auth/me', { password: passwordData.new_password });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Mot de passe modifié.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du changement de mot de passe.');
    } finally { setIsSaving(false); }
  };

  return (
    <AppShell
      title="Profil et préférences"
      subtitle="Ajustez votre profil, vos accès et votre espace feedback."
      maxWidth="5xl"
    >
      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <Card className="border-dashed" role="alert">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-display text-lg font-medium">
                Impossible de charger vos préférences
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Le profil ou le feedback n'a pas pu être récupéré.
                Vous pouvez relancer le chargement.
              </p>
            </div>
            <Button onClick={() => fetchProfile()} className="shrink-0">
              Recharger
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!isLoading && !isError && profile && (
        <Tabs defaultValue="profile" className="space-y-6">
          {/*
            Use the "line" variant — it's cleaner for a settings page where
            tabs sit inline with the content rather than as pill toggles.
          */}
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="profile"  className="gap-2">
              <User className="h-3.5 w-3.5" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Lock className="h-3.5 w-3.5" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageCircle className="h-3.5 w-3.5" />
              Avis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSection
              profile={profile}
              setProfile={setProfile}
              onSave={handleProfileSave}
              isSaving={isSaving}
              onAvatarUpload={handleAvatarUpload}
              onAvatarDelete={handleAvatarDelete}
              isUploadingAvatar={isUploadingAvatar}
            />
          </TabsContent>

          <TabsContent value="account">
            <SecuritySection
              userEmail={user?.email}
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              onSave={handlePasswordChange}
              isSaving={isSaving}
            />
          </TabsContent>

          <TabsContent value="feedback" className="max-w-2xl">
            <FeedbackForm
              existingFeedback={userFeedback}
              onSubmitted={async () => {
                const { data } = await api.get('/feedback/platform/mine');
                setUserFeedback(data?.[0] ?? null);
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

/* ─── ProfileSection ─────────────────────────────────────────────────── */

function ProfileSection({
  profile,
  setProfile,
  onSave,
  isSaving,
  onAvatarUpload,
  onAvatarDelete,
  isUploadingAvatar,
}: ProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité et coaching</CardTitle>
        <CardDescription>
          Personnalisez votre analyse et gardez un profil propre pour vos futurs rapports.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-7 px-7 pb-7">

        {/* Avatar row */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarCustom
                src={profile.avatar_url}
                name={profile.full_name}
                size="xl"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div>
              <div className="font-display text-base font-medium">
                {profile.full_name || 'Coach Speech'}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Votre photo apparaîtra dans les espaces de feedback et le shell.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Changer la photo
              <input
                type="file"
                className="hidden"
                accept="image/*"
                aria-label="Choisir une nouvelle photo de profil"
                onChange={onAvatarUpload}
              />
            </label>
            {profile.avatar_url && (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                onClick={onAvatarDelete}
                aria-label="Supprimer la photo de profil"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullname">Nom complet</Label>
            <Input
              id="fullname"
              value={profile.full_name || ''}
              onChange={(e) =>
                setProfile((p) => p ? { ...p, full_name: e.target.value } : p)
              }
              placeholder="Ex : Hicham Moussaid"
            />
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>Langue préférée</Label>
            <Select
              value={profile.preferred_language}
              onValueChange={(v) =>
                setProfile((p) => p ? { ...p, preferred_language: v } : p)
              }
            >
              <SelectTrigger aria-label="Choisir la langue préférée">
                <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <Label>Objectif actuel</Label>
            <Select
              value={profile.current_goal || 'General'}
              onValueChange={(v) =>
                setProfile((p) => p ? { ...p, current_goal: v } : p)
              }
            >
              <SelectTrigger aria-label="Choisir l'objectif actuel">
                <Target className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Votre objectif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">Général</SelectItem>
                <SelectItem value="PFE">Soutenance PFE</SelectItem>
                <SelectItem value="Interview">Entretien</SelectItem>
                <SelectItem value="Pitch">Pitch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-1.5">
            <Label>Niveau actuel</Label>
            <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Niveau actuel">
              {[
                ['Beginner',     'Débutant'],
                ['Intermediate', 'Intermédiaire'],
                ['Advanced',     'Avancé'],
              ].map(([value, fr]) => {
                const active = profile.experience_level === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      setProfile((p) => p ? { ...p, experience_level: value } : p)
                    }
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/60 text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    )}
                  >
                    <TrendingUp className="h-4 w-4" />
                    {fr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving
              ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              : <Save       className="mr-2 h-3.5 w-3.5" />
            }
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── SecuritySection ────────────────────────────────────────────────── */

function SecuritySection({
  userEmail,
  passwordData,
  setPasswordData,
  onSave,
  isSaving,
}: SecuritySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sécurité du compte</CardTitle>
        <CardDescription>
          Gardez un accès simple et clair. Les actions destructives sont masquées
          tant que le backend n'est pas prêt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-7 pb-7">
        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={userEmail || ''} disabled className="bg-secondary/40" />
        </div>

        {/* Password fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newpass">Nouveau mot de passe</Label>
            <Input
              id="newpass"
              type="password"
              autoComplete="new-password"
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData((p) => ({ ...p, new_password: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confpass">Confirmer le mot de passe</Label>
            <Input
              id="confpass"
              type="password"
              autoComplete="new-password"
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData((p) => ({ ...p, confirm_password: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Account deletion notice */}
        <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/30 px-5 py-4">
          <div className="text-sm font-medium text-foreground">Suppression du compte</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Cette action sera disponible lorsque le backend de suppression sera
            implémenté proprement.
          </p>
        </div>

        {/* Save */}
        <Button
          variant="outline"
          onClick={onSave}
          disabled={isSaving || !passwordData.new_password}
        >
          {isSaving
            ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            : <Lock       className="mr-2 h-3.5 w-3.5" />
          }
          Mettre à jour le mot de passe
        </Button>
      </CardContent>
    </Card>
  );
}