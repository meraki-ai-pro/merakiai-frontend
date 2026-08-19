'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { MfaSettings } from '@/components/auth/MfaSettings';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const user = useUserStore((s) => s.user);
  const currentAvatarId = user?.avatar_id;

  const handleSelectAvatar = async (avatarId: 'amy' | 'josh') => {
    if (avatarId === currentAvatarId) {
      toast('Already using this avatar');
      return;
    }

    setLoading(true);
    try {
      // Use updateAvatar for changing existing avatar
      const res = await apiClient.updateAvatar(avatarId);
      
      if (res.success && res.data) {
        // Update user store with new avatar info
        if (user) {
          useUserStore.setState({
            user: {
              ...user,
              avatar_id: avatarId,
              voice_id: res.data.voice_id,
              // Update other fields from response if available
            },
          });
        }
        
        toast.success(`✅ Switched to ${avatarId === 'amy' ? 'Amy' : 'Josh'}!`);
        
        // Refresh user profile to get complete data
        const profileRes = await apiClient.getUserProfile();
        if (profileRes.success && profileRes.data) {
          useUserStore.setState({ user: profileRes.data });
        }
        
      } else {
        toast.error(res.error?.message ?? 'Failed to update avatar');
      }
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Section */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Account</h3>
            <div className="text-xs text-muted-foreground">
              {user?.email}
            </div>
          </div>

          {/* Security Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Security</h3>
            <MfaSettings />
          </div>

          {/* Avatar Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">AI Tutor Avatar</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose your preferred AI tutor for video responses
            </p>

            <div className="flex flex-row gap-4">
              {/* Amy */}
              <button
                onClick={() => handleSelectAvatar('amy')}
                disabled={loading}
                className={`
                  relative flex-1 flex flex-col items-center gap-3 p-4 rounded-lg border-2 
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    currentAvatarId === 'amy'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }
                `}
              >
                {currentAvatarId === 'amy' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-4xl">
                  👩‍🏫
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-sm">Amy</p>
                  <p className="text-xs text-muted-foreground">Female voice</p>
                </div>

                {loading && currentAvatarId !== 'amy' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </button>

              {/* Josh */}
              <button
                onClick={() => handleSelectAvatar('josh')}
                disabled={loading}
                className={`
                  relative flex-1 flex flex-col items-center gap-3 p-4 rounded-lg border-2 
                  transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    currentAvatarId === 'josh'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }
                `}
              >
                {currentAvatarId === 'josh' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-4xl">
                  👨‍🏫
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-sm">Josh</p>
                  <p className="text-xs text-muted-foreground">Male voice</p>
                </div>

                {loading && currentAvatarId !== 'josh' && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
              </button>
            </div>
          </div>

          {/* Current Avatar Info */}
          {user && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="font-medium mb-1">Current Configuration:</p>
              <div className="space-y-0.5 text-muted-foreground">
                <p>Avatar: {currentAvatarId === 'amy' ? 'Amy (Female)' : 'Josh (Male)'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
