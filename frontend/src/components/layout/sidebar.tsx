'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Video, History, Settings, LogOut, Mic, Star 
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/studio', label: 'Studio', icon: Video },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/public-feedback', label: "Mur de l'Amour", icon: Star },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await authService.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to fetch profile in sidebar:", err);
      }
    };
    fetchProfile();
  }, []);

  return (
    <aside className="w-64 border-r bg-card hidden md:flex flex-col">
      <div className="p-6 flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Mic className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">SpeechCoach</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                buttonVariants({ variant: "ghost" }), 
                "w-full justify-start gap-3",
                isActive && "bg-primary/5 text-primary"
              )}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t space-y-3">
        {profile && (
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {profile.avatar_url ? (
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${profile.avatar_url}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-xs font-bold text-primary uppercase">
                  {(profile.full_name || 'U').slice(0, 2)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
               <div className="text-sm font-bold truncate">{profile.full_name || 'Coach Speech'}</div>
               <div className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-bold opacity-60">Coach Certifié</div>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10" 
          onClick={() => authService.logout()}
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </Button>
      </div>
    </aside>
  );
}
