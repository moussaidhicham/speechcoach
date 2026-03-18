'use client';

import React, { useEffect, useState } from 'react';
import { 
  User as IconUser, 
  Lock as IconLock, 
  Globe as IconGlobe, 
  Target as IconTarget, 
  TrendingUp as IconTrendingUp, 
  Save as IconSave, 
  RefreshCw as IconRefreshCw, 
  Mic as IconMic, 
  MessageCircle as IconMessageCircle,
  Camera as IconCamera,
  Trash2 as IconTrash
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { AvatarCustom } from '@/components/ui/avatar-custom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userFeedback, setUserFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    current_password: '', // Kept for future backend requirements
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileData, feedbackData] = await Promise.all([
          authService.getProfile(),
          api.get('/feedback/platform/mine')
        ]);
        setProfile(profileData);
        // Take the first feedback if many (should be unique)
        if (feedbackData.data && feedbackData.data.length > 0) {
          setUserFeedback(feedbackData.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) {
        const fetchAll = async () => {
             const apiModule = (await import('@/lib/api')).default;
             // We need to use raw api here since it is in a use effect and we want to avoid 
             // circular dependencies in some setups, but authService should be safe.
             // Actually let's just use authService and api which is already imported.
             fetchProfile();
        };
        fetchAll();
    }
  }, [token]);

  const handleProfileSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await authService.updateProfile(profile);
      toast.success("Profil mis à jour avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingAvatar(true);
    try {
      const response = await api.post('/user/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => prev ? { ...prev, avatar_url: response.data.avatar_url } : null);
      toast.success("Photo de profil mise à jour !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'envoi de l'image.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!profile?.avatar_url) return;
    
    setIsUploadingAvatar(true);
    try {
      await api.delete('/user/profile/avatar');
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      toast.success("Photo de profil supprimée.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la suppression.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    
    setIsSaving(true);
    try {
      // Direct call as this is specific to account update
      const api = (await import('@/lib/api')).default;
      await api.patch('/auth/users/me', {
        password: passwordData.new_password
      });
      toast.success("Mot de passe modifié !");
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du changement de mot de passe.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <IconRefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <Header title="Paramètres" />

        <div className="flex-1 p-8 overflow-y-auto max-w-4xl w-full mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="profile" className="gap-2"><IconUser className="w-4 h-4" /> Profil Coach</TabsTrigger>
              <TabsTrigger value="account" className="gap-2"><IconLock className="w-4 h-4" /> Sécurité</TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2"><IconMessageCircle className="w-4 h-4" /> Avis</TabsTrigger>
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
              <SecuritySection userEmail={user?.email} passwordData={passwordData} setPasswordData={setPasswordData} onSave={handlePasswordChange} isSaving={isSaving} />
            </TabsContent>

            <TabsContent value="feedback" className="max-w-2xl mx-auto">
              <FeedbackForm 
                existingFeedback={userFeedback} 
                onSubmitted={async () => {
                  const { data } = await api.get('/feedback/platform/mine');
                  if (data && data.length > 0) setUserFeedback(data[0]);
                  else setUserFeedback(null);
                }} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function ProfileSection({ profile, setProfile, onSave, isSaving, onAvatarUpload, onAvatarDelete, isUploadingAvatar }: any) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Identité & Coaching</CardTitle>
        <CardDescription>Personnalisez vos analyses et optimisez la reconnaissance vocale.</CardDescription>
      </CardHeader>
       <CardContent className="space-y-6">
        <div className="flex flex-col items-center space-y-4 pb-6 border-b">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <AvatarCustom 
                src={profile.avatar_url} 
                name={profile.full_name} 
                size="xl" 
                className="border-4 border-primary/10"
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-background/60 rounded-full flex items-center justify-center">
                  <IconRefreshCw className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer shadow-lg hover:bg-primary/90 transition-all">
                <IconCamera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={onAvatarUpload} disabled={isUploadingAvatar} />
              </label>
            </div>

            {profile.avatar_url && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-destructive hover:text-destructive gap-2"
                onClick={onAvatarDelete}
                disabled={isUploadingAvatar}
              >
                <IconTrash className="w-4 h-4" />
                Supprimer
              </Button>
            )}
          </div>
          <div className="text-center">
            <h3 className="font-bold">{profile.full_name || 'Coach Speech'}</h3>
            <p className="text-xs text-muted-foreground">Appuyez sur l'icône pour changer votre photo</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullname">Nom Complet</Label>
          <div className="relative">
            <IconUser className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              id="fullname" 
              value={profile.full_name || ''} 
              onChange={e => setProfile({...profile, full_name: e.target.value})}
              className="pl-10" 
              placeholder="Ex: Hicham Moussaid"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Langue Préférée</Label>
            <Select value={profile.preferred_language} onValueChange={v => setProfile({...profile, preferred_language: v})}>
              <SelectTrigger className="w-full">
                <IconGlobe className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Objectif Actuel</Label>
            <Select value={profile.current_goal} onValueChange={v => setProfile({...profile, current_goal: v})}>
              <SelectTrigger className="w-full">
                <IconTarget className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Votre but" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">Général</SelectItem>
                <SelectItem value="PFE">PFE</SelectItem>
                <SelectItem value="Interview">Entretien</SelectItem>
                <SelectItem value="Pitch">Pitch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Niveau d'éloquence</Label>
          <div className="grid grid-cols-3 gap-4">
            {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
              <div 
                key={level}
                onClick={() => setProfile({...profile, experience_level: level})}
                className={cn("flex flex-col items-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                  profile.experience_level === level ? "border-primary bg-primary/5 text-primary" : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <IconTrendingUp className="w-5 h-5 mb-1" />
                <span className="text-xs font-bold">{level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? <IconRefreshCw className="w-4 h-4 animate-spin mr-2" /> : <IconSave className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySection({ userEmail, passwordData, setPasswordData, onSave, isSaving }: any) {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Sécurité du Compte</CardTitle>
        <CardDescription>Gérez vos accès et modifiez votre mot de passe.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={userEmail || ''} disabled className="bg-muted/50" />
        </div>

        <div className="pt-4 border-t space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><IconLock className="w-4 h-4" /> Changer de mot de passe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newpass">Nouveau mot de passe</Label>
              <Input id="newpass" type="password" value={passwordData.new_password} onChange={e => setPasswordData({...passwordData, new_password: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confpass">Confirmer le mot de passe</Label>
              <Input id="confpass" type="password" value={passwordData.confirm_password} onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})} />
            </div>
          </div>
          <Button variant="outline" onClick={onSave} disabled={isSaving || !passwordData.new_password}>Mettre à jour</Button>
        </div>

        <div className="pt-8 border-t">
          <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-destructive">Zone de danger</h4>
              <p className="text-xs text-muted-foreground">La suppression est irréversible.</p>
            </div>
            <Button variant="destructive" size="sm">Supprimer le compte</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
