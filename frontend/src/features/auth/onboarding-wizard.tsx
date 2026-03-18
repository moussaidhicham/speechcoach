'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';

export function OnboardingWizard({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({
    full_name: '',
    preferred_language: 'fr',
    experience_level: 'Beginner',
    current_goal: 'General',
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!data.full_name) {
      toast.error("Veuillez entrer votre nom.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedProfile = await authService.updateProfile(data);
      onComplete(updatedProfile);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
           <motion.div 
             className="h-full bg-primary" 
             initial={{ width: "0%" }}
             animate={{ width: `${(step / 3) * 100}%` }}
           />
        </div>

        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-xl">
                 <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Configuration</h2>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Étape {step}/3</span>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold mb-2">Comment vous appelez-vous ?</h3>
                  <p className="text-sm text-muted-foreground mb-6">Pour que votre coach puisse s'adresser à vous personnellement.</p>
                  <div className="space-y-2">
                    <Label htmlFor="wiz-name">Votre Nom Complet</Label>
                    <Input 
                      id="wiz-name"
                      autoFocus
                      placeholder="Ex: Hicham Moussaid" 
                      value={data.full_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData({...data, full_name: e.target.value})}
                      className="text-lg py-6 rounded-xl"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-2xl font-bold mb-2">Langue & Objectif</h3>
                  <p className="text-sm text-muted-foreground mb-6">Optimisons l'analyse pour vos besoins spécifiques.</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Langue de prédilection</Label>
                      <Select 
                        value={data.preferred_language} 
                        onValueChange={v => setData({...data, preferred_language: v})}
                      >
                        <SelectTrigger className="w-full py-6 rounded-xl">
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
                      <Label>Votre objectif principal</Label>
                      <Select 
                        value={data.current_goal} 
                        onValueChange={v => setData({...data, current_goal: v})}
                      >
                        <SelectTrigger className="w-full py-6 rounded-xl">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Interview">Entretien d'embauche</SelectItem>
                          <SelectItem value="PFE">Soutenance PFE</SelectItem>
                          <SelectItem value="Pitch">Pitch startup</SelectItem>
                          <SelectItem value="General">Amélioration générale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Prêt à briller ?</h3>
                  <p className="text-sm text-muted-foreground px-8">
                    Votre profil est configuré. Vous pouvez maintenant commencer vos analyses personnalisées.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-10">
            {step > 1 && (
              <Button variant="outline" className="flex-1 py-6 rounded-xl" onClick={handleBack}>
                Retour
              </Button>
            )}
            <Button 
              className="flex-[2] py-6 rounded-xl font-bold text-lg shadow-lg shadow-primary/20" 
              onClick={step === 3 ? handleSubmit : handleNext}
              disabled={isSaving}
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                step === 3 ? "C'est parti !" : "Continuer"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
