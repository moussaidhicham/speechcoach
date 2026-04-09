'use client';

import React from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Globe,
  Lock,
  MessageCircle,
  MonitorSmartphone,
  RefreshCw,
  Save,
  Target,
  TrendingUp,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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

/* Section */

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
  onAvatarSelect:    (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarApply:     () => Promise<void>;
  onAvatarCancel:    () => void;
  onAvatarDelete:    () => Promise<void>;
  isUploadingAvatar: boolean;
  pendingAvatarPreview: string | null;
  pendingAvatarOffsetY: number;
  pendingAvatarScale: number;
  setPendingAvatarOffsetY: React.Dispatch<React.SetStateAction<number>>;
  setPendingAvatarScale: React.Dispatch<React.SetStateAction<number>>;
}

interface SecuritySectionProps {
  userEmail?:      string;
  passwordData:    { current_password: string; new_password: string; confirm_password: string };
  setPasswordData: React.Dispatch<React.SetStateAction<{
    current_password: string; new_password: string; confirm_password: string;
  }>>;
  onSave:          () => Promise<void>;
  isSaving:        boolean;
  isDeleting:      boolean;
  onDeleteAccount: () => Promise<void>;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
}

/* Section */

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [profile,           setProfile]           = React.useState<UserProfile | null>(null);
  const [userFeedback,      setUserFeedback]      = React.useState<UserFeedback | null>(null);
  const [isLoading,         setIsLoading]         = React.useState(true);
  const [isError,           setIsError]           = React.useState(false);
  const [isSaving,          setIsSaving]          = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = React.useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = React.useState<string | null>(null);
  const [pendingAvatarOffsetY, setPendingAvatarOffsetY] = React.useState(50);
  const [pendingAvatarScale, setPendingAvatarScale] = React.useState(1);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = React.useState(false);
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
      toast.success('Profil mis a jour.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la sauvegarde.');
    } finally { setIsSaving(false); }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez selectionner une image.'); return; }
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }
    setPendingAvatarFile(file);
    setPendingAvatarPreview(URL.createObjectURL(file));
    setPendingAvatarOffsetY(profile?.avatar_offset_y ?? 50);
    setPendingAvatarScale(profile?.avatar_scale ?? 1);
    setIsAvatarEditorOpen(true);
    e.target.value = '';
  };

  const handleAvatarApply = async () => {
    if (!pendingAvatarFile) return;
    const formData = new FormData();
    formData.append('file', pendingAvatarFile);
    setIsUploadingAvatar(true);
    try {
      const res = await api.post('/user/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = await authService.updateProfile({
        avatar_offset_y: pendingAvatarOffsetY,
        avatar_scale: pendingAvatarScale,
      });
      setProfile((p) => p ? {
        ...p,
        ...updated,
        avatar_url: res.data.avatar_url,
        avatar_offset_y: pendingAvatarOffsetY,
        avatar_scale: pendingAvatarScale,
      } : p);
      if (pendingAvatarPreview) {
        URL.revokeObjectURL(pendingAvatarPreview);
      }
      setPendingAvatarFile(null);
      setPendingAvatarPreview(null);
      toast.success('Photo de profil mise a jour.');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'image.");
    } finally { 
      setIsUploadingAvatar(false); 
      setIsAvatarEditorOpen(false);
    }
  };

  const handleAvatarCancel = () => {
    if (pendingAvatarPreview) {
      URL.revokeObjectURL(pendingAvatarPreview);
    }
    setPendingAvatarFile(null);
    setPendingAvatarPreview(null);
    setPendingAvatarOffsetY(profile?.avatar_offset_y ?? 50);
    setPendingAvatarScale(profile?.avatar_scale ?? 1);
    setIsAvatarEditorOpen(false);
  };

  const handleAvatarDelete = async () => {
    if (!profile?.avatar_url) return;
    setIsUploadingAvatar(true);
    try {
      await api.delete('/user/profile/avatar');
      setProfile((p) => p ? { ...p, avatar_url: null } : p);
      toast.success('Photo de profil supprimee.');
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
      toast.success('Mot de passe modifie.');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du changement de mot de passe.');
    } finally { setIsSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Etes-vous absolument sur de vouloir supprimer votre compte ? Cette action est irreversible et supprimera toutes vos videos.')) {
      return;
    }
    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount();
      toast.success('Votre compte a été supprimé.');
      authService.logout();
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression du compte.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <AppShell
      title="Profil et preferences"
      subtitle="Ajustez votre profil, vos acces et votre espace feedback."
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
                Impossible de charger vos preferences
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Le profil ou le feedback n'a pas pu etre recupere.
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
            Use the "line" variant - it's cleaner for a settings page where
            tabs sit inline with the content rather than as pill toggles.
          */}
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="profile"  className="gap-2">
              <User className="h-3.5 w-3.5" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <Lock className="h-3.5 w-3.5" />
              Securite
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
              onAvatarSelect={handleAvatarSelect}
              onAvatarApply={handleAvatarApply}
              onAvatarCancel={handleAvatarCancel}
              onAvatarDelete={handleAvatarDelete}
              isUploadingAvatar={isUploadingAvatar}
              pendingAvatarPreview={pendingAvatarPreview}
              pendingAvatarOffsetY={pendingAvatarOffsetY}
              pendingAvatarScale={pendingAvatarScale}
              setPendingAvatarOffsetY={setPendingAvatarOffsetY}
              setPendingAvatarScale={setPendingAvatarScale}
            />
          </TabsContent>

          <TabsContent value="account">
            <SecuritySection
              userEmail={user?.email}
              passwordData={passwordData}
              setPasswordData={setPasswordData}
              onSave={handlePasswordChange}
              isSaving={isSaving}
              isDeleting={isDeletingAccount}
              onDeleteAccount={handleDeleteAccount}
              showNewPassword={showNewPassword}
              showConfirmPassword={showConfirmPassword}
              onToggleNewPassword={() => setShowNewPassword((value) => !value)}
              onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
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

      {/* Profile Photo Editor Modal */}
      <AnimatePresence>
        {isAvatarEditorOpen && pendingAvatarPreview && (
          <AvatarEditorModal
            preview={pendingAvatarPreview}
            name={profile?.full_name}
            offsetY={pendingAvatarOffsetY}
            scale={pendingAvatarScale}
            setOffsetY={setPendingAvatarOffsetY}
            setScale={setPendingAvatarScale}
            onCancel={handleAvatarCancel}
            onApply={handleAvatarApply}
            isUploading={isUploadingAvatar}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* Section */

function ProfileSection({
  profile,
  setProfile,
  onSave,
  isSaving,
  onAvatarSelect,
  onAvatarApply,
  onAvatarCancel,
  onAvatarDelete,
  isUploadingAvatar,
  pendingAvatarPreview,
  pendingAvatarOffsetY,
  pendingAvatarScale,
  setPendingAvatarOffsetY,
  setPendingAvatarScale,
}: ProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identite et coaching</CardTitle>
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
                src={pendingAvatarPreview || profile.avatar_url}
                name={profile.full_name}
                size="xl"
                imagePositionY={pendingAvatarPreview ? pendingAvatarOffsetY : profile.avatar_offset_y}
                imageScale={pendingAvatarPreview ? pendingAvatarScale : profile.avatar_scale}
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
                Votre photo apparaitra dans les espaces de feedback et le shell.
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
                onChange={onAvatarSelect}
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
            <Label>Langue principale des videos</Label>
            <Select
              value={profile.preferred_language || 'auto'}
              onValueChange={(v) =>
                setProfile((p) => p ? { ...p, preferred_language: v } : p)
              }
            >
              <SelectTrigger aria-label="Choisir la langue preferee">
                <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatique</SelectItem>
                <SelectItem value="fr">Francais</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabe</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ce réglage correspond à la langue parlée dans vos vidéos. Le choisir manuellement évite la détection automatique et accélère l'analyse.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Appareil principal</Label>
            <Select
              value={(profile.preferred_device_type || 'auto') as DevicePreference}
              onValueChange={(v: DevicePreference) =>
                setProfile((p) => p ? { ...p, preferred_device_type: v } : p)
              }
            >
              <SelectTrigger aria-label="Choisir l'appareil principal">
                <MonitorSmartphone className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Choisir l'appareil principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Aucun, je choisis a chaque fois</SelectItem>
                <SelectItem value="laptop_desktop">Laptop / Desktop</SelectItem>
                <SelectItem value="tablet">Tablette</SelectItem>
                <SelectItem value="smartphone">Smartphone</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Si vous utilisez presque toujours le même appareil, ce choix deviendra la valeur par défaut dans le Studio. Vous pourrez toujours le modifier pour une vidéo précise.
            </p>
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
                <SelectItem value="General">General</SelectItem>
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
                ['Beginner',     'Debutant'],
                ['Intermediate', 'Intermediaire'],
                ['Advanced',     'Avance'],
              ].map(([value, fr]) => {
                const active = profile.experience_level === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-pressed={active}
                    aria-label={`Choisir le niveau ${fr}`}
                    onClick={() =>
                      setProfile((p) => (p ? { ...p, experience_level: value } : p))
                    }
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        setProfile((p) => (p ? { ...p, experience_level: value } : p));
                      }
                    }}
                    className={cn(
                      'inline-flex items-center justify-center shrink-0 h-auto min-h-16 cursor-pointer flex-col gap-1.5 rounded-xl px-3 py-3 text-center text-sm font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/40 active:scale-[0.98]',
                      active
                        ? 'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                        : 'border border-border/70 bg-background/80 text-foreground hover:bg-secondary hover:border-border dark:bg-input/20 dark:hover:bg-input/40'
                    )}
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
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

/* Section */

function SecuritySection({
  userEmail,
  passwordData,
  setPasswordData,
  onSave,
  isSaving,
  isDeleting,
  onDeleteAccount,
  showNewPassword,
  showConfirmPassword,
  onToggleNewPassword,
  onToggleConfirmPassword,
}: SecuritySectionProps) {
  const strength = passwordStrength(passwordData.new_password);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Securite du compte</CardTitle>
        <CardDescription>
          Gardez un acces simple et clair. Les actions destructives sont masquees
          tant que le backend n'est pas pret.
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
            <div className="relative">
              <Input
                id="newpass"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData((p) => ({ ...p, new_password: e.target.value }))
                }
                className="pr-12"
              />
              <button
                type="button"
                onClick={onToggleNewPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                aria-label={showNewPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordData.new_password && (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full transition-all', strength.color)} style={{ width: strength.width }} />
                </div>
                <p className="text-xs text-muted-foreground">Solidité actuelle : {strength.label}</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confpass">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confpass"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={passwordData.confirm_password}
                onChange={(e) =>
                  setPasswordData((p) => ({ ...p, confirm_password: e.target.value }))
                }
                className="pr-12"
              />
              <button
                type="button"
                onClick={onToggleConfirmPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Account deletion notice */}
        <div className="rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-5 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-destructive">Suppression du compte</div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Cette action supprimera definitivement votre profil, vos videos et vos analyses.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteAccount}
              disabled={isDeleting}
              className="shrink-0"
            >
              {isDeleting ? (
                <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-3.5 w-3.5" />
              )}
              {isDeleting ? "Suppression..." : "Supprimer mon compte"}
            </Button>
          </div>
        </div>

        {/* Update password button */}
        <div className="flex justify-start">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving || !passwordData.new_password}
          >
            {isSaving
              ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
              : <Lock       className="mr-2 h-3.5 w-3.5" />
            }
            Mettre a jour le mot de passe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type DevicePreference = 'auto' | 'laptop_desktop' | 'tablet' | 'smartphone';

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!password) return { label: 'Vide', color: 'bg-border', width: '0%' };
  if (score <= 1) return { label: 'Faible', color: 'bg-destructive', width: '33%' };
  if (score <= 3) return { label: 'Moyen', color: 'bg-amber-500', width: '66%' };
  return { label: 'Fort', color: 'bg-emerald-500', width: '100%' };
}

function deviceLabel(value: DevicePreference | 'unknown') {
  switch (value) {
    case 'laptop_desktop':
      return 'Laptop / Desktop';
    case 'tablet':
      return 'Tablette';
    case 'smartphone':
      return 'Smartphone';
    default:
      return 'Auto';
  }
}

/* ─── Avatar Editor Modal ────────────────────────────────────────────── */

interface AvatarEditorModalProps {
  preview:     string;
  name?:       string | null;
  offsetY:     number;
  scale:       number;
  setOffsetY:  (val: number) => void;
  setScale:    (val: number) => void;
  onCancel:    () => void;
  onApply:     () => Promise<void>;
  isUploading: boolean;
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
}: AvatarEditorModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-5">
          <div className="font-display text-lg font-medium">Ajuster la photo</div>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-8 p-10">
          {/* Centered Large Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <AvatarCustom
                src={preview}
                name={name}
                size="xl"
                imagePositionY={offsetY}
                imageScale={scale}
                className="h-32 w-32 ring-4 ring-primary/10 shadow-lg"
              />
              <div className="absolute -inset-4 rounded-full border border-dashed border-primary/20 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Position verticale</Label>
                <span className="text-xs font-mono text-muted-foreground/60">{offsetY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Zoom</Label>
                <span className="text-xs font-mono text-muted-foreground/60">x{scale}</span>
              </div>
              <input
                type="range"
                min="1"
                max="1.8"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
                disabled={isUploading}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-secondary/30 p-6 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isUploading}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            onClick={onApply}
            disabled={isUploading}
            className="rounded-xl shadow-md px-8"
          >
            {isUploading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Appliquer et enregistrer
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}




