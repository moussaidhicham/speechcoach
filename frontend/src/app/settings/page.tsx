'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
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

import { AppShell } from '@/components/layout/AppShell';
import { Button, buttonVariants } from '@/components/ui/button';
import { AvatarCustom } from '@/components/ui/AvatarCustom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { FEEDBACK_ENDPOINTS } from '@/constants/api';

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
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  onToggleCurrentPassword: () => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
}

/* Section */

export default function SettingsPage() {
  return (
    <React.Suspense fallback={null}>
      <SettingsClient />
    </React.Suspense>
  );
}

function SettingsClient() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
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
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = React.useState(false);
  const [isFeedbackEditorOpen, setIsFeedbackEditorOpen] = React.useState(false);
  const [passwordData,      setPasswordData]      = React.useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [activeTab,         setActiveTab]         = React.useState(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'profile' || tabParam === 'account' || tabParam === 'feedback') ? tabParam : 'profile';
  });

  const fetchProfile = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [profileData, feedbackData] = await Promise.all([
        authService.getProfile(),
        api.get(FEEDBACK_ENDPOINTS.PLATFORM_MINE),
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
    if (!passwordData.current_password) {
      toast.error('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/auth/change-password', { 
        current_password: passwordData.current_password,
        new_password: passwordData.new_password 
      });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Mot de passe modifié avec succès.');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (detail === 'INVALID_CURRENT_PASSWORD') {
        toast.error('Mot de passe actuel incorrect.');
      } else {
        toast.error('Erreur lors du changement de mot de passe.');
      }
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

  const refreshUserFeedback = React.useCallback(async () => {
    const { data } = await api.get(FEEDBACK_ENDPOINTS.PLATFORM_MINE);
    setUserFeedback(data?.[0] ?? null);
  }, []);

  return (
    <AppShell
      title="Paramètres"
      subtitle="Gérez votre profil, votre sécurité et votre avis public."
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
        <Tabs
          defaultValue="profile"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/*
            Use the "line" variant - it's cleaner for a settings page where
            tabs sit inline with the content rather than as pill toggles.
          */}
          <TabsList variant="line" className="w-full justify-start px-2">
            <TabsTrigger value="profile"  className="gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2 text-sm font-medium">
              <Lock className="h-4 w-4" />
              Securite
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4" />
              Avis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="outline-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
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
            </motion.div>
          </TabsContent>

          <TabsContent value="account" className="outline-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SecuritySection
                userEmail={user?.email}
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                onSave={handlePasswordChange}
                isSaving={isSaving}
                isDeleting={isDeletingAccount}
                onDeleteAccount={handleDeleteAccount}
                showCurrentPassword={showCurrentPassword}
                showNewPassword={showNewPassword}
                showConfirmPassword={showConfirmPassword}
                onToggleCurrentPassword={() => setShowCurrentPassword((value) => !value)}
                onToggleNewPassword={() => setShowNewPassword((value) => !value)}
                onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="feedback" className="outline-none">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <UserFeedbackSection
                userFeedback={userFeedback}
                isEditorOpen={isFeedbackEditorOpen}
                onToggleEditor={() => setIsFeedbackEditorOpen((value) => !value)}
                onSubmitted={refreshUserFeedback}
              />
            </motion.div>
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

function UserFeedbackSection({
  userFeedback,
  isEditorOpen,
  onToggleEditor,
  onSubmitted,
}: {
  userFeedback: UserFeedback | null;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
  onSubmitted: () => Promise<void>;
}) {
  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Mon avis public
            </CardTitle>
            <CardDescription className="mt-1.5">
              Les avis sont affichés sur la landing page. Ici, vous pouvez uniquement gérer le vôtre.
            </CardDescription>
          </div>
          <Button variant={isEditorOpen ? 'outline' : 'default'} size="sm" onClick={onToggleEditor}>
            {isEditorOpen ? 'Fermer' : userFeedback ? 'Modifier mon avis' : 'Laisser un avis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-7 pb-7">
        <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-4 text-sm">
          {userFeedback ? (
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Votre avis est actuellement publié.</p>
              <p className="text-muted-foreground">
                Note: {userFeedback.rating}/5 {userFeedback.comments ? '· commentaire ajouté.' : '· sans commentaire.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-medium text-foreground">Vous n’avez pas encore publié d’avis.</p>
              <p className="text-muted-foreground">
                Vous pouvez partager votre expérience puis modifier ou supprimer cet avis à tout moment.
              </p>
            </div>
          )}
        </div>

        {isEditorOpen && (
          <FeedbackForm
            existingFeedback={userFeedback}
            onSubmitted={async () => {
              await onSubmitted();
            }}
          />
        )}
      </CardContent>
    </Card>
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
  const weakPointOptions = [
    'Confiance et aisance',
    'Gestion du temps',
    'Fluidite et mots de remplissage',
    'Structure et clarte du discours',
    'Regard posture et gestuelle',
    'Voix debit et articulation',
    'Autre',
  ];

  const selectedWeakPoints = React.useMemo(() => {
    if (!profile.weak_points) return [];
    return profile.weak_points.split(',').map(s => s.trim()).filter(Boolean);
  }, [profile.weak_points]);

  const toggleWeakPoint = (point: string) => {
    const current = selectedWeakPoints;
    const newSelection = current.includes(point)
      ? current.filter((p) => p !== point)
      : [...current, point];
    
    setProfile((p) => p ? { ...p, weak_points: newSelection.join(', ') } : p);
  };

  const customWeakPoint = selectedWeakPoints.find(p => !weakPointOptions.includes(p)) || '';

  // Profile completion calculation
  const profileCompletion = React.useMemo(() => {
    const fields = [
      { name: 'full_name', weight: 20 },
      { name: 'preferred_language', weight: 15 },
      { name: 'preferred_device_type', weight: 15 },
      { name: 'experience_level', weight: 20 },
      { name: 'current_goal', weight: 20 },
      { name: 'weak_points', weight: 10 },
    ];

    let completed = 0;
    fields.forEach((field) => {
      const value = profile[field.name as keyof UserProfile];
      if (value && value !== 'auto' && value !== 'General' && value !== 'Beginner') {
        completed += field.weight;
      }
    });

    return completed;
  }, [profile]);

  const completionColor = profileCompletion < 40 ? 'bg-destructive' : profileCompletion < 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Identite et coaching</CardTitle>
            <CardDescription className="mt-1.5">
              Personnalisez votre analyse et gardez un profil propre pour vos futurs rapports.
            </CardDescription>
          </div>
          <div className="shrink-0 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3 text-center">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Complétion
            </div>
            <div className="mt-1 text-2xl font-bold text-foreground">
              {profileCompletion}%
            </div>
            <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-secondary mx-auto">
              <div className={`h-full transition-all ${completionColor}`} style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-7 px-7 pb-7">

        {/* Avatar row */}
        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-secondary/30 p-5 sm:flex-row sm:items-center sm:justify-between">
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

        {/* Fields - Sectioned */}
        <div className="space-y-6">
          {/* Section: Personal Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="h-4 w-4 text-primary" />
              Informations Personnelles
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
              <div className="space-y-4">
                {/* Full name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-sm font-medium">Nom complet</Label>
                  <Input
                    id="fullname"
                    value={profile.full_name || ''}
                    onChange={(e) =>
                      setProfile((p) => p ? { ...p, full_name: e.target.value } : p)
                    }
                    placeholder="Ex : Hicham Moussaid"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Goals & Level */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Objectifs & Niveau
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Goal */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Objectif actuel</Label>
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
                  <Label className="text-sm font-medium">Niveau actuel</Label>
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
                            'inline-flex items-center justify-center shrink-0 h-auto min-h-16 cursor-pointer flex-col gap-1.5 rounded-xl px-3 py-3 text-center text-sm font-medium transition-all outline-none select-none focus-visible:ring-2 focus-visible:border-ring focus-visible:ring-ring/40 active:scale-[0.98]',
                            active
                              ? 'border-2 border-primary bg-primary/10 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.5)] ring-2 ring-primary/20 text-foreground'
                              : 'border border-border/60 bg-background/80 text-muted-foreground hover:border-primary/40 hover:bg-secondary/30'
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
            </div>
          </div>

          {/* Section: Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              Préférences
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Language */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Langue principale des vidéos</Label>
                  <Select
                    value={profile.preferred_language || 'auto'}
                    onValueChange={(v) =>
                      setProfile((p) => p ? { ...p, preferred_language: v } : p)
                    }
                  >
                    <SelectTrigger aria-label="Choisir la langue préférée">
                      <Globe className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Choisir une langue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatique</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Ce réglage correspond à la langue parlée dans vos vidéos. Le choisir manuellement évite la détection automatique et accélère l'analyse.
                  </p>
                </div>

                {/* Device */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Appareil principal</Label>
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
                      <SelectItem value="auto">Aucun, je choisis à chaque fois</SelectItem>
                      <SelectItem value="laptop_desktop">Laptop / Desktop</SelectItem>
                      <SelectItem value="tablet">Tablette</SelectItem>
                      <SelectItem value="smartphone">Smartphone</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Si vous utilisez presque toujours le même appareil, ce choix deviendra la valeur par défaut dans le Studio. Vous pourrez toujours le modifier pour une vidéo précise.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Weak Points */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Points à améliorer
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/30 p-5">
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Sélectionnez les domaines sur lesquels vous souhaitez travailler.
                </p>
                <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {weakPointOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleWeakPoint(option)}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all pointer-events-auto',
                        selectedWeakPoints.includes(option)
                          ? 'border-primary bg-primary/10 shadow-[0_4px_12px_-2px_rgba(37,99,235,0.3)] ring-2 ring-primary/20'
                          : 'border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:bg-secondary/30'
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg transition-all',
                        selectedWeakPoints.includes(option)
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : 'bg-secondary text-muted-foreground'
                      )}>
                        {selectedWeakPoints.includes(option) && <CheckCircle2 className="h-4 w-4 text-emerald-500 drop-shadow-lg" />}
                      </div>
                      <span className={selectedWeakPoints.includes(option) ? 'text-foreground' : 'text-muted-foreground'}>{option}</span>
                    </button>
                  ))}
                </div>
                {selectedWeakPoints.includes('Autre') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-weak-point" className="text-sm font-medium">Précisez</Label>
                    <Input
                      id="custom-weak-point"
                      value={customWeakPoint}
                      onChange={(e) => {
                        const newSelection = selectedWeakPoints.filter(p => p !== customWeakPoint);
                        const value = e.target.value.trim();
                        if (value) {
                          setProfile((p) => p ? { ...p, weak_points: [...newSelection, value].join(', ') } : p);
                        } else {
                          setProfile((p) => p ? { ...p, weak_points: newSelection.join(', ') } : p);
                        }
                      }}
                      placeholder="Décrivez votre point à améliorer..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </CardContent>

      <CardFooter className="justify-end border-t border-border/60 bg-secondary/10 px-7 py-5">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving
            ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            : <Save       className="mr-2 h-3.5 w-3.5" />
          }
          Enregistrer
        </Button>
      </CardFooter>
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
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  onToggleCurrentPassword,
  onToggleNewPassword,
  onToggleConfirmPassword,
}: SecuritySectionProps) {
  const strength = passwordStrength(passwordData.new_password);
  return (
    <Card className="overflow-visible">
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
        <div className="space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center justify-between">
              <Label htmlFor="currpass">Mot de passe actuel</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="currpass"
                type={showCurrentPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={passwordData.current_password}
                onChange={(e) =>
                  setPasswordData((p) => ({ ...p, current_password: e.target.value }))
                }
                className="pr-12"
              />
              <button
                type="button"
                onClick={onToggleCurrentPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
                aria-label={showCurrentPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

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
        </div>

        {/* Account deletion notice */}
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-5 py-5">
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

      </CardContent>

      <CardFooter className="border-t border-border/60 bg-secondary/10 px-7 py-5">
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
      </CardFooter>
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






